/**
 * Homepage visual content — runtime configuration of the 5 platform_settings
 * keys that drive the hero, how-it-works, and testimonials sections.
 *
 * GET  → super_admin | moderator. Lazy-seeds rows on first call so a fresh
 *        env doesn't 404 on the admin UI. Returns the 5 rows.
 * POST → super_admin only. Updates a single key with a free-form string value
 *        (image URL or JSON). Audit-logs the diff and invalidates the
 *        platform-settings cache so the homepage picks up the change within
 *        the cache TTL.
 *
 * Settings persisted:
 *   - homepage.hero_image_url            (text)
 *   - homepage.howto_step1_image_url     (text)
 *   - homepage.howto_step2_image_url     (text)
 *   - homepage.howto_step3_image_url     (text)
 *   - homepage.testimonials              (text — JSON-encoded array)
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { db, platformSettings } from "@doktori/db";
import { eq, inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { invalidateSettingsCache } from "@/lib/platform-settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Registered = {
  key: string;
  default: string;
  label: string;
  description: string;
};

export const VISUAL_REGISTRY: Registered[] = [
  {
    key: "homepage.hero_image_url",
    default: "/images/defaults/hero.webp",
    label: "Image hero homepage",
    description: "Photo affichée à droite du H1 (lg+). 600×500 recommandé.",
  },
  {
    key: "homepage.howto_step1_image_url",
    default: "/images/defaults/howto-1.webp",
    label: "Comment ça marche — étape 1",
    description: "Image au-dessus de la carte « Recherchez ». 600×450, 4:3.",
  },
  {
    key: "homepage.howto_step2_image_url",
    default: "/images/defaults/howto-2.webp",
    label: "Comment ça marche — étape 2",
    description: "Image au-dessus de la carte « Réservez ». 600×450, 4:3.",
  },
  {
    key: "homepage.howto_step3_image_url",
    default: "/images/defaults/howto-3.webp",
    label: "Comment ça marche — étape 3",
    description: "Image au-dessus de la carte « Consultez ». 600×450, 4:3.",
  },
  {
    key: "homepage.testimonials",
    default: JSON.stringify(
      [
        {
          name: "Asma B.",
          city: "Tunis",
          specialty: "Dermatologue",
          photoUrl: "/images/defaults/testimonial-placeholder.webp",
          quote:
            "RDV pris en 2 minutes, médecin reçu pendant la matinée. Service sérieux.",
          rating: 5,
        },
        {
          name: "Yassine R.",
          city: "Sfax",
          specialty: "Généraliste",
          photoUrl: "/images/defaults/testimonial-placeholder.webp",
          quote:
            "Pratique pour gérer les rendez-vous de toute la famille. Rappels SMS appréciables.",
          rating: 5,
        },
        {
          name: "Mariem K.",
          city: "Sousse",
          specialty: "Pédiatre",
          photoUrl: "/images/defaults/testimonial-placeholder.webp",
          quote:
            "Interface claire, médecin disponible le jour même pour mon fils. Je recommande.",
          rating: 5,
        },
      ],
      null,
      2
    ),
    label: "Témoignages homepage (JSON)",
    description:
      "Tableau JSON de 3 objets {name, city, specialty, photoUrl, quote, rating (1-5)}.",
  },
];

const REGISTRY_KEYS = VISUAL_REGISTRY.map((r) => r.key);

async function ensureRowsExist(): Promise<void> {
  const existing = await db
    .select({ key: platformSettings.key })
    .from(platformSettings)
    .where(inArray(platformSettings.key, REGISTRY_KEYS));
  const existingKeys = new Set(existing.map((r) => r.key));
  const missing = VISUAL_REGISTRY.filter((r) => !existingKeys.has(r.key));
  if (missing.length === 0) return;
  await db.insert(platformSettings).values(
    missing.map((r) => ({
      key: r.key,
      value: r.default,
      category: "visuals",
      label: r.label,
      description: r.description,
      type: "text",
    }))
  );
}

export async function GET() {
  const admin = await requireAdmin(["super_admin", "moderator"]);
  if (admin instanceof NextResponse) return admin;

  await ensureRowsExist();

  const rows = await db
    .select({
      key: platformSettings.key,
      value: platformSettings.value,
      label: platformSettings.label,
      description: platformSettings.description,
      type: platformSettings.type,
      updatedAt: platformSettings.updatedAt,
    })
    .from(platformSettings)
    .where(inArray(platformSettings.key, REGISTRY_KEYS));

  // Project the registry order, so the UI doesn't need to sort.
  const settings = VISUAL_REGISTRY.map((registered) => {
    const row = rows.find((r) => r.key === registered.key);
    return {
      key: registered.key,
      label: registered.label,
      description: registered.description,
      value: row?.value ?? registered.default,
      defaultValue: registered.default,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    };
  });

  return NextResponse.json({ settings });
}

const bodySchema = z.object({
  key: z.enum(REGISTRY_KEYS as [string, ...string[]]),
  value: z.string().min(1).max(20_000),
});

export async function POST(req: Request) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // For testimonials, validate JSON shape so we don't ship a broken homepage.
  if (parsed.data.key === "homepage.testimonials") {
    try {
      const arr = JSON.parse(parsed.data.value);
      if (!Array.isArray(arr) || arr.length === 0) {
        throw new Error("Tableau de témoignages requis (au moins 1).");
      }
      for (const t of arr) {
        if (
          typeof t?.name !== "string" ||
          typeof t?.city !== "string" ||
          typeof t?.specialty !== "string" ||
          typeof t?.photoUrl !== "string" ||
          typeof t?.quote !== "string" ||
          typeof t?.rating !== "number"
        ) {
          throw new Error(
            "Chaque témoignage doit avoir : name, city, specialty, photoUrl, quote, rating."
          );
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "JSON invalide";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  await ensureRowsExist();

  const meta = extractRequestMeta(req);
  const [before] = await db
    .select({ value: platformSettings.value })
    .from(platformSettings)
    .where(eq(platformSettings.key, parsed.data.key))
    .limit(1);

  if (before?.value === parsed.data.value) {
    // No-op: don't audit unchanged updates.
    return NextResponse.json({ ok: true, unchanged: true });
  }

  await db
    .update(platformSettings)
    .set({ value: parsed.data.value, updatedAt: new Date() })
    .where(eq(platformSettings.key, parsed.data.key));

  await logAudit({
    actor: admin,
    action: "visuals.update",
    resourceType: "platform_settings",
    resourceId: parsed.data.key,
    before: { value: before?.value ?? null },
    after: { value: parsed.data.value },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  invalidateSettingsCache();
  return NextResponse.json({ ok: true });
}
