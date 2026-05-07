/**
 * Coach IA admin settings — runtime configuration of the patient-facing
 * Coach IA assistant. Lets a super_admin toggle the feature flag and tune
 * the rate limits / cost cap / disclaimer text without redeploying.
 *
 * GET  → super_admin | moderator. Returns the 4 platform_settings rows
 *        (lazy-seeded on first call) plus the current `coach_ia_enabled`
 *        feature flag state.
 * POST → super_admin only. Patches whichever fields are present, audit-logs
 *        each mutation, and invalidates the platform-settings cache so the
 *        next /api/coach-ia request picks up the new values immediately.
 *
 * Settings persisted:
 *   - coach_ia.rate_limit_per_patient (number)
 *   - coach_ia.rate_limit_global       (number)
 *   - coach_ia.daily_cost_cap_usd      (number)
 *   - coach_ia.disclaimer_html         (text)
 *
 * Feature flag persisted:
 *   - feature_flags.coach_ia_enabled   (boolean)
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { db, platformSettings, featureFlags } from "@doktori/db";
import { eq, inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { invalidateSettingsCache } from "@/lib/platform-settings";
import {
  COACH_IA_SETTING_KEYS,
  DEFAULT_DISCLAIMER_HTML,
} from "@/lib/coach-ia";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Registry — single source of truth for keys + defaults + UI metadata.
type Registered = {
  key: string;
  type: "number" | "text";
  default: string;
  label: string;
  description: string;
  category: "coach_ia";
};

const REGISTRY: Registered[] = [
  {
    key: COACH_IA_SETTING_KEYS.ratePerPatient,
    type: "number",
    default: "10",
    label: "Limite par patient (24h)",
    description: "Nombre maximum de messages par patient toutes les 24h.",
    category: "coach_ia",
  },
  {
    key: COACH_IA_SETTING_KEYS.rateGlobal,
    type: "number",
    default: "1000",
    label: "Limite globale (24h)",
    description:
      "Nombre maximum de messages tous patients confondus toutes les 24h.",
    category: "coach_ia",
  },
  {
    key: COACH_IA_SETTING_KEYS.dailyCostCapUsd,
    type: "number",
    default: "5",
    label: "Plafond coût quotidien (USD)",
    description:
      "Coût quotidien maximum (USD) avant arrêt automatique des appels au modèle.",
    category: "coach_ia",
  },
  {
    key: COACH_IA_SETTING_KEYS.disclaimerHtml,
    type: "text",
    default: DEFAULT_DISCLAIMER_HTML,
    label: "Texte du disclaimer (HTML)",
    description:
      "Wording du disclaimer affiché avant la première conversation. HTML autorisé : strong, a, p, ul, li, br.",
    category: "coach_ia",
  },
];

const REGISTRY_KEYS = REGISTRY.map((r) => r.key);

/**
 * Insert any missing platform_settings rows with their default values.
 * Idempotent — safe to call on every GET.
 */
async function ensureRowsExist(): Promise<void> {
  const existing = await db
    .select({ key: platformSettings.key })
    .from(platformSettings)
    .where(inArray(platformSettings.key, REGISTRY_KEYS));
  const existingKeys = new Set(existing.map((r) => r.key));
  const missing = REGISTRY.filter((r) => !existingKeys.has(r.key));
  if (missing.length === 0) return;
  await db.insert(platformSettings).values(
    missing.map((r) => ({
      key: r.key,
      value: r.default,
      category: r.category,
      label: r.label,
      description: r.description,
      type: r.type,
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
  const settings = REGISTRY.map((registered) => {
    const row = rows.find((r) => r.key === registered.key);
    return {
      key: registered.key,
      type: registered.type,
      label: registered.label,
      description: registered.description,
      value: row?.value ?? registered.default,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    };
  });

  const [flag] = await db
    .select({ enabled: featureFlags.enabled })
    .from(featureFlags)
    .where(eq(featureFlags.key, "coach_ia_enabled"))
    .limit(1);

  return NextResponse.json({
    settings,
    enabled: flag?.enabled ?? false,
  });
}

const bodySchema = z
  .object({
    enabled: z.boolean().optional(),
    ratePerPatient: z.number().int().min(1).max(1000).optional(),
    rateGlobal: z.number().int().min(1).max(100_000).optional(),
    dailyCostCapUsd: z.number().min(0.1).max(1000).optional(),
    disclaimerHtml: z.string().min(50).max(20_000).optional(),
  })
  .refine(
    (v) =>
      v.enabled !== undefined ||
      v.ratePerPatient !== undefined ||
      v.rateGlobal !== undefined ||
      v.dailyCostCapUsd !== undefined ||
      v.disclaimerHtml !== undefined,
    { message: "Au moins un champ requis" }
  );

export async function POST(req: Request) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await ensureRowsExist();

  const meta = extractRequestMeta(req);
  const updates = parsed.data;

  // Feature flag toggle
  if (updates.enabled !== undefined) {
    const [before] = await db
      .select({ enabled: featureFlags.enabled })
      .from(featureFlags)
      .where(eq(featureFlags.key, "coach_ia_enabled"))
      .limit(1);

    if (before === undefined) {
      // Flag row missing — insert. (seed-coach-ia-flag.ts normally creates
      // it, but be defensive so first-time writes don't 500.)
      await db.insert(featureFlags).values({
        key: "coach_ia_enabled",
        enabled: updates.enabled,
        description: "Coach IA — assistant d'orientation médicale",
      });
    } else if (before.enabled !== updates.enabled) {
      await db
        .update(featureFlags)
        .set({ enabled: updates.enabled, updatedAt: new Date() })
        .where(eq(featureFlags.key, "coach_ia_enabled"));
    }

    if (before?.enabled !== updates.enabled) {
      await logAudit({
        actor: admin,
        action: "coach_ia.toggle",
        resourceType: "feature_flags",
        resourceId: "coach_ia_enabled",
        before: { enabled: before?.enabled ?? null },
        after: { enabled: updates.enabled },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
    }
  }

  // Setting writes — map each request field to its platform_settings key.
  const fieldToKey: Record<string, string> = {
    ratePerPatient: COACH_IA_SETTING_KEYS.ratePerPatient,
    rateGlobal: COACH_IA_SETTING_KEYS.rateGlobal,
    dailyCostCapUsd: COACH_IA_SETTING_KEYS.dailyCostCapUsd,
    disclaimerHtml: COACH_IA_SETTING_KEYS.disclaimerHtml,
  };

  for (const [field, key] of Object.entries(fieldToKey)) {
    const raw = (updates as Record<string, unknown>)[field];
    if (raw === undefined) continue;
    const value =
      typeof raw === "number" ? String(raw) : String(raw ?? "");

    const [current] = await db
      .select({ value: platformSettings.value })
      .from(platformSettings)
      .where(eq(platformSettings.key, key))
      .limit(1);
    if (current && current.value === value) continue;

    await db
      .update(platformSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(platformSettings.key, key));

    await logAudit({
      actor: admin,
      action: "coach_ia.settings_update",
      resourceType: "platform_settings",
      resourceId: key,
      before: { value: current?.value ?? null },
      after: { value },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  }

  invalidateSettingsCache();
  return NextResponse.json({ ok: true });
}
