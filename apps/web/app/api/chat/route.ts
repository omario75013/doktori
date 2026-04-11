import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db, doctors, doctorSchedules } from "@doktori/db";
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
- Tutoiement : NON. Utilise "vous"
- Utilise des puces pour les listes
- Termine souvent par une question de clarification ou une suggestion d'action

## Outils disponibles
- \`search_doctors\` : rechercher des médecins par spécialité et ville
- \`suggest_specialty\` : mapper des symptômes à une spécialité recommandée

## Informations sur Doktori
- **Gratuit** pour les patients
- **SOS Docteur** : trouve un médecin disponible en urgence non-vitale
- **Visite à domicile** : certains médecins se déplacent (voir leur profil)
- **Annulation** : possible jusqu'à 2h avant le rendez-vous via /mes-rdv
- **Rappel SMS** : envoyé automatiquement la veille du rendez-vous
- **Avis** : disponibles uniquement après une consultation terminée
- **Couverture actuelle** : Grand Tunis (Tunis, Ariana, Manouba, Lac, La Marsa, Soukra)
- **Paiement** : consultation payée directement au cabinet (espèces, carte, CNAM)

## Spécialités disponibles
Généraliste, Dermatologue, Ophtalmologue, Gynécologue, Pédiatre, Dentiste, ORL, Cardiologue, Orthopédiste, Gastro-entérologue.

Démarre toujours par un accueil court si c'est le début de la conversation.`;

// ──────────────────────────────────────────────────────────────────────────────
// Tool definitions
// ──────────────────────────────────────────────────────────────────────────────
const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_doctors",
    description:
      "Recherche les médecins par spécialité et/ou ville. Retourne jusqu'à 5 médecins avec leur nom, spécialité, ville, adresse et slug (pour construire le lien vers leur profil).",
    input_schema: {
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
  {
    name: "suggest_specialty",
    description:
      "Suggère une spécialité médicale en fonction de symptômes ou d'un domaine décrit par le patient. À utiliser uniquement pour ORIENTER, jamais pour diagnostiquer.",
    input_schema: {
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
      conditions.push(
        or(ilike(doctors.name, q), ilike(doctors.address, q))!
      );
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
      return JSON.stringify({ count: 0, doctors: [], message: "Aucun médecin trouvé" });
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
      note:
        "Cette suggestion est indicative. Pour un diagnostic précis, consultez un médecin.",
    });
  }

  return JSON.stringify({ error: `Outil inconnu: ${name}` });
}

// ──────────────────────────────────────────────────────────────────────────────
// Rate limiting (in-memory, per IP, simple)
// ──────────────────────────────────────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30; // messages per 5 min per IP

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
// POST handler — streams Claude response
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
  const messages: Anthropic.MessageParam[] = body.messages || [];

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages requis" }, { status: 400 });
  }

  // Dev fallback when API key is missing
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const fakeResponse = {
      role: "assistant" as const,
      content:
        "Bonjour 👋 Je suis Dokti, l'assistant virtuel de Doktori. (Mode démo : configurez ANTHROPIC_API_KEY pour activer les réponses intelligentes.) Que puis-je faire pour vous ?",
    };
    return NextResponse.json(fakeResponse);
  }

  const client = new Anthropic({ apiKey });

  try {
    // Agentic loop: call tools until model stops
    let currentMessages = [...messages];
    const maxIterations = 5;

    for (let i = 0; i < maxIterations; i++) {
      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages: currentMessages,
      });

      // If stop_reason is "end_turn" we're done
      if (response.stop_reason === "end_turn" || !response.content.some((c) => c.type === "tool_use")) {
        const textContent = response.content
          .filter((c): c is Anthropic.TextBlock => c.type === "text")
          .map((c) => c.text)
          .join("\n");
        return NextResponse.json({ role: "assistant", content: textContent });
      }

      // Tool use: execute all tools and feed back
      const assistantMsg: Anthropic.MessageParam = {
        role: "assistant",
        content: response.content,
      };

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          const result = await runTool(block.name, block.input as Record<string, unknown>);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }
      }

      currentMessages = [
        ...currentMessages,
        assistantMsg,
        { role: "user", content: toolResults },
      ];
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
