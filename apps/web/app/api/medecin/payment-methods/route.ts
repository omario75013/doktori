import { NextRequest, NextResponse } from "next/server";
import { db, doctorPaymentMethods } from "@doktori/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { z } from "zod";

// GET: list this doctor's configured methods (returns all rows; UI decides what to show)
export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const rows = await db
    .select({
      method: doctorPaymentMethods.method,
      enabled: doctorPaymentMethods.enabled,
      config: doctorPaymentMethods.config,
    })
    .from(doctorPaymentMethods)
    .where(eq(doctorPaymentMethods.doctorId, user.id));

  return NextResponse.json({ methods: rows });
}

const upsertSchema = z.object({
  method: z.enum(["stripe_card", "bank_transfer", "cash_on_premises", "flouci", "paymee"]),
  enabled: z.boolean(),
  config: z.record(z.string(), z.unknown()).optional().default({}),
});

// POST: upsert one method (one body = one method update)
export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = upsertSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { method, enabled, config } = parsed.data;

  // For bank_transfer, validate config has required fields if enabled
  if (method === "bank_transfer" && enabled) {
    const c = config as Record<string, unknown>;
    if (!c.iban || !c.bankName || !c.accountHolder) {
      return NextResponse.json(
        {
          error: "bank_transfer config requires iban, bankName, accountHolder when enabled",
        },
        { status: 400 }
      );
    }
  }

  await db
    .insert(doctorPaymentMethods)
    .values({
      doctorId: user.id,
      method,
      enabled,
      config,
    })
    .onConflictDoUpdate({
      target: [doctorPaymentMethods.doctorId, doctorPaymentMethods.method],
      set: {
        enabled,
        config,
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ ok: true });
}
