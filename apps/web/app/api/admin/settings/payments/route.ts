import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, platformSettings } from "@doktori/db";
import { eq, inArray } from "drizzle-orm";
import { invalidateSettingsCache } from "@/lib/platform-settings";

/**
 * Payment platform-settings registry. Defaults are inserted lazily on first GET
 * so the admin UI always has rows to render even before any DB seed.
 *
 * Type: "boolean" | "number" — stored as text in `platform_settings.value`,
 * parsed/serialized at the API boundary.
 */
const PAYMENT_KEYS = [
  {
    key: "payment.stripe.enabled",
    type: "boolean" as const,
    default: "false",
    label: "Stripe activé",
    description: "Master switch pour le paiement par carte via Stripe Checkout.",
  },
  {
    key: "payment.stripe.commission_percent",
    type: "number" as const,
    default: "10",
    label: "Commission Stripe (%)",
    description:
      "Pourcentage retenu par Doktori sur chaque paiement Stripe (0-100).",
  },
  {
    key: "payment.bank_transfer.enabled",
    type: "boolean" as const,
    default: "false",
    label: "Virement bancaire activé",
    description:
      "Master switch pour les paiements par virement bancaire (vérif. manuelle admin).",
  },
  {
    key: "payment.bank_transfer.expiry_days",
    type: "number" as const,
    default: "7",
    label: "Expiration virement (jours)",
    description: "Délai en jours avant expiration automatique d'un intent virement.",
  },
  {
    key: "payment.cash_on_premises.enabled",
    type: "boolean" as const,
    default: "true",
    label: "Espèces au cabinet activé",
    description: "Master switch pour le paiement en espèces sur place.",
  },
];

const KEYS = PAYMENT_KEYS.map((k) => k.key);

function envStatus(): {
  stripeSecretConfigured: boolean;
  stripeWebhookSecretConfigured: boolean;
} {
  return {
    stripeSecretConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
    stripeWebhookSecretConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
  };
}

async function ensureRowsExist(): Promise<void> {
  const existing = await db
    .select({ key: platformSettings.key })
    .from(platformSettings)
    .where(inArray(platformSettings.key, KEYS));
  const existingKeys = new Set(existing.map((r) => r.key));
  const missing = PAYMENT_KEYS.filter((k) => !existingKeys.has(k.key));
  if (missing.length === 0) return;
  await db.insert(platformSettings).values(
    missing.map((k) => ({
      key: k.key,
      value: k.default,
      category: "payments",
      label: k.label,
      description: k.description,
      type: k.type,
    }))
  );
}

/**
 * GET /api/admin/settings/payments
 * Returns the full payment settings registry (lazy-seeded if missing) and
 * Stripe env-presence indicators (no values exposed).
 */
export async function GET() {
  const admin = await requireAdmin(["super_admin"]);
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
    .where(inArray(platformSettings.key, KEYS));

  const settings = PAYMENT_KEYS.map((registered) => {
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

  return NextResponse.json({ settings, env: envStatus() });
}

const updateSchema = z.object({
  updates: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
    })
  ),
});

/**
 * POST /api/admin/settings/payments
 * Bulk update payment settings. Validates keys against the registry and
 * coerces values per type.
 */
export async function POST(req: Request) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const json = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await ensureRowsExist();

  const meta = extractRequestMeta(req);
  const errors: Array<{ key: string; error: string }> = [];

  for (const u of parsed.data.updates) {
    const registered = PAYMENT_KEYS.find((k) => k.key === u.key);
    if (!registered) {
      errors.push({ key: u.key, error: "Clé inconnue" });
      continue;
    }

    let normalized: string;
    if (registered.type === "boolean") {
      if (u.value !== "true" && u.value !== "false") {
        errors.push({ key: u.key, error: "Valeur booléenne invalide" });
        continue;
      }
      normalized = u.value;
    } else {
      const n = Number(u.value);
      if (!Number.isFinite(n) || n < 0) {
        errors.push({ key: u.key, error: "Nombre invalide" });
        continue;
      }
      // Commission percent must be 0..100
      if (registered.key === "payment.stripe.commission_percent" && (n < 0 || n > 100)) {
        errors.push({ key: u.key, error: "Doit être entre 0 et 100" });
        continue;
      }
      normalized = String(Math.trunc(n));
    }

    const [current] = await db
      .select({ value: platformSettings.value })
      .from(platformSettings)
      .where(eq(platformSettings.key, u.key))
      .limit(1);

    if (current && current.value === normalized) continue; // no-op

    await db
      .update(platformSettings)
      .set({ value: normalized, updatedAt: new Date() })
      .where(eq(platformSettings.key, u.key));

    await logAudit({
      actor: admin,
      action: "update",
      resourceType: "platform_settings",
      resourceId: u.key,
      before: { key: u.key, value: current?.value ?? null },
      after: { key: u.key, value: normalized },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  }

  invalidateSettingsCache();

  if (errors.length > 0) {
    return NextResponse.json({ ok: false, errors }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
