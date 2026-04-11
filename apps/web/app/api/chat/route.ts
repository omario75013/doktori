import { NextResponse } from "next/server";
import { db, doctors } from "@doktori/db";
import { eq, and, or, ilike } from "drizzle-orm";
import { SPECIALTIES, CITIES } from "@doktori/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ──────────────────────────────────────────────────────────────────────────────
// System prompt — French, patient-facing, Doktori context
// ──────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Tu es **Dokti**, l'assistant virtuel de Doktori.tn, la plateforme tunisienne de prise de rendez-vous médicaux.

## Ton rôle
Aider les patients à :
- Trouver le bon médecin (spécialité, quartier, disponibilité)
- Comprendre comment réserver un rendez-vous
- Naviguer dans Doktori (SOS, visite domicile, annulation, etc.)
- Répondre à leurs questions pratiques sur la plateforme

## Règles ABSOLUES
- **Tu ne donnes JAMAIS de conseil médical, diagnostic, ou traitement.** Si le patient décrit des symptômes graves, tu réponds : "Pour une urgence vitale, composez immédiatement le **190 (SAMU)**. Pour une consultation urgente non-vitale, utilisez **SOS Docteur** sur doktori.tn/sos."
- Si le patient te demande "qu'est-ce que j'ai ?" ou "quel médicament prendre ?" → refuse poliment et redirige vers une consultation.
- Si le patient décrit des symptômes légers (fièvre, mal de tête), tu peux **suggérer une spécialité** (ex: généraliste) sans diagnostiquer.
- **Langue** : réponds toujours en **français** (sauf si le patient écrit en arabe, alors réponds en arabe tunisien simple).

## Ton
- Chaleureux, professionnel, concis (2-3 phrases max par réponse sauf si liste de médecins)
- Utilise "vous"
- Utilise des puces pour les listes
- Termine souvent par une question de clarification ou une suggestion d'action

## Outils disponibles
- \`search_doctors\` : rechercher des médecins par spécialité et ville
- \`suggest_specialty\` : mapper des symptômes à une spécialité recommandée

## Informations sur Doktori
- **Gratuit** pour les patients
- **SOS Docteur** : trouve un médecin disponible en urgence non-vitale
- **Visite à domicile** : certains médecins se déplacent
- **Annulation** : possible jusqu'à 2h avant le rendez-vous via /mes-rdv
- **Rappel SMS** : envoyé automatiquement la veille du rendez-vous
- **Avis** : disponibles uniquement après une consultation terminée
- **Couverture actuelle** : Grand Tunis (Tunis, Ariana, Manouba, Lac, La Marsa, Soukra)
- **Paiement** : consultation payée directement au cabinet (espèces, carte, CNAM)

## Spécialités disponibles
Généraliste, Dermatologue, Ophtalmologue, Gynécologue, Pédiatre, Dentiste, ORL, Cardiologue, Orthopédiste, Gastro-entérologue.`;

// ──────────────────────────────────────────────────────────────────────────────
// OpenAI-compatible tool definitions (for OpenRouter)
// ──────────────────────────────────────────────────────────────────────────────
interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

const TOOLS: OpenAITool[] = [
  {
    type: "function",
    function: {
      name: "search_doctors",
      description:
        "Recherche les médecins par spécialité et/ou ville. Retourne jusqu'à 5 médecins avec leur nom, spécialité, ville, adresse et URLs (profil + booking).",
      parameters: {
        type: "object",
        properties: {
          specialty: {
            type: "string",
            description:
              "ID de la spécialité. Valeurs : generaliste, dermatologue, ophtalmologue, gynecologue, pediatre, dentiste, orl, cardiologue, orthopediste, gastrologue",
          },
          city: {
            type: "string",
            description:
              "ID de la ville. Valeurs : tunis, la-marsa, lac-1, lac-2, ariana, la-soukra, raoued, manouba",
          },
          query: {
            type: "string",
            description: "Mot-clé de recherche libre (nom, mot dans bio)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_specialty",
      description:
        "Suggère une spécialité médicale en fonction de symptômes ou d'un domaine décrit par le patient. À utiliser uniquement pour ORIENTER, jamais pour diagnostiquer.",
      parameters: {
        type: "object",
        properties: {
          symptoms: {
            type: "string",
            description: "Description courte des symptômes ou de la zone concernée",
          },
        },
        required: ["symptoms"],
      },
    },
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Tool execution
// ──────────────────────────────────────────────────────────────────────────────
async function runTool(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  if (name === "search_doctors") {
    const specialty = typeof input.specialty === "string" ? input.specialty : null;
    const city = typeof input.city === "string" ? input.city : null;
    const query = typeof input.query === "string" ? input.query : null;

    const conditions = [eq(doctors.isActive, true)];
    if (specialty) conditions.push(eq(doctors.specialty, specialty));
    if (city) conditions.push(eq(doctors.city, city));
    if (query) {
      const q = `%${query}%`;
      conditions.push(or(ilike(doctors.name, q), ilike(doctors.address, q))!);
    }

    const results = await db
      .select({
        name: doctors.name,
        slug: doctors.slug,
        specialty: doctors.specialty,
        city: doctors.city,
        address: doctors.address,
      })
      .from(doctors)
      .where(and(...conditions))
      .limit(5);

    if (results.length === 0) {
      return JSON.stringify({
        count: 0,
        doctors: [],
        message: "Aucun médecin trouvé",
      });
    }

    return JSON.stringify({
      count: results.length,
      doctors: results.map((d) => ({
        name: d.name,
        specialty: SPECIALTIES.find((s) => s.id === d.specialty)?.label ?? d.specialty,
        city: CITIES.find((c) => c.id === d.city)?.label ?? d.city,
        address: d.address,
        profileUrl: `/medecin/${d.slug}`,
        bookingUrl: `/rdv/${d.slug}`,
      })),
    });
  }

  if (name === "suggest_specialty") {
    const symptoms = String(input.symptoms || "").toLowerCase();

    const map: Array<{ keywords: string[]; specialty: string; label: string }> = [
      { keywords: ["peau", "bouton", "acné", "eczéma", "allergie cutané", "dermato"], specialty: "dermatologue", label: "Dermatologue" },
      { keywords: ["oeil", "yeux", "vue", "lunette", "ophtalmo"], specialty: "ophtalmologue", label: "Ophtalmologue" },
      { keywords: ["dent", "caries", "gencive", "dentiste"], specialty: "dentiste", label: "Dentiste" },
      { keywords: ["enfant", "bébé", "nourrisson", "pédiatre"], specialty: "pediatre", label: "Pédiatre" },
      { keywords: ["grossesse", "règles", "gynéco", "femme"], specialty: "gynecologue", label: "Gynécologue" },
      { keywords: ["gorge", "oreille", "nez", "sinus", "orl"], specialty: "orl", label: "ORL" },
      { keywords: ["coeur", "tension", "cardiaque", "cardio", "palpitation"], specialty: "cardiologue", label: "Cardiologue" },
      { keywords: ["os", "dos", "articulation", "fracture", "ortho"], specialty: "orthopediste", label: "Orthopédiste" },
      { keywords: ["ventre", "estomac", "digest", "nausée", "gastro"], specialty: "gastrologue", label: "Gastro-entérologue" },
    ];

    const match = map.find((m) => m.keywords.some((k) => symptoms.includes(k)));
    const suggestion = match || { specialty: "generaliste", label: "Médecin généraliste" };

    return JSON.stringify({
      specialty: suggestion.specialty,
      label: suggestion.label,
      note: "Cette suggestion est indicative. Pour un diagnostic précis, consultez un médecin.",
    });
  }

  return JSON.stringify({ error: `Outil inconnu: ${name}` });
}

// ──────────────────────────────────────────────────────────────────────────────
// Rate limiting (in-memory, per IP)
// ──────────────────────────────────────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 5 * 60 * 1000 });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

// ──────────────────────────────────────────────────────────────────────────────
// OpenRouter types
// ──────────────────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

interface OpenRouterResponse {
  choices: Array<{
    message: ChatMessage;
    finish_reason: string;
  }>;
}

// ──────────────────────────────────────────────────────────────────────────────
// POST handler — OpenRouter with Grok
// ──────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Trop de messages. Réessayez dans 5 minutes." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const userMessages: Array<{ role: string; content: string }> = body.messages || [];

  if (!Array.isArray(userMessages) || userMessages.length === 0) {
    return NextResponse.json({ error: "messages requis" }, { status: 400 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "x-ai/grok-4-fast";

  if (!apiKey) {
    return NextResponse.json({
      role: "assistant",
      content:
        "Bonjour 👋 Je suis Dokti, l'assistant virtuel de Doktori. (Mode démo : configurez `OPENROUTER_API_KEY` pour activer les réponses intelligentes.) En attendant, vous pouvez rechercher un médecin via le bouton **Rechercher** en haut de la page.",
    });
  }

  // Build messages array: system + user history
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...userMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const MAX_ITERATIONS = 5;

  try {
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://doktori.tn",
          "X-Title": "Doktori",
        },
        body: JSON.stringify({
          model,
          messages,
          tools: TOOLS,
          temperature: 0.3,
          max_tokens: 1024,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("OpenRouter error:", res.status, err);
        return NextResponse.json(
          { error: "Erreur de l'assistant. Réessayez." },
          { status: 500 }
        );
      }

      const data: OpenRouterResponse = await res.json();
      const message = data.choices[0]?.message;
      if (!message) {
        return NextResponse.json(
          { error: "Réponse vide de l'assistant." },
          { status: 500 }
        );
      }

      const toolCalls = message.tool_calls;

      // No tool calls → final answer
      if (!toolCalls || toolCalls.length === 0) {
        return NextResponse.json({
          role: "assistant",
          content: message.content || "",
        });
      }

      // Execute tool calls and append results
      messages.push({
        role: "assistant",
        content: message.content,
        tool_calls: toolCalls,
      });

      for (const call of toolCalls) {
        let input: Record<string, unknown> = {};
        try {
          input = JSON.parse(call.function.arguments || "{}");
        } catch {}
        const result = await runTool(call.function.name, input);
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: result,
        });
      }
    }

    return NextResponse.json({
      role: "assistant",
      content: "Je n'arrive pas à traiter cette demande. Pouvez-vous reformuler ?",
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    console.error("Chat error:", message);
    return NextResponse.json(
      { error: "Erreur de l'assistant. Réessayez." },
      { status: 500 }
    );
  }
}
