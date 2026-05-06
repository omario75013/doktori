import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { confirmBankTransfer, rejectBankTransfer } from "@/lib/bank-transfer";
import { bankTransferIntents } from "@doktori/db";
import { eq } from "drizzle-orm";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm") }),
  z.object({ action: z.literal("reject"), reason: z.string().min(3).max(500) }),
]);

type RouteContext = { params: Promise<{ id: string }> };

type ActionBody = z.infer<typeof bodySchema>;

/**
 * PATCH /api/admin/payments/bank-transfer/[id]
 *
 * Admin confirms or rejects a pending bank-transfer intent. The handler runs
 * inside the withAdminAudit transaction; the lib helpers participate in the
 * same tx so the appointment + wallet updates are atomic with the audit log.
 *
 * Allowed roles: super_admin, finance.
 * Body: { action: "confirm" } | { action: "reject", reason: string (3..500) }
 */
export const PATCH = withAdminAudit<{ ok: true }, RouteContext>({
  resourceType: "bank_transfer_intents",
  allowedRoles: ["super_admin", "finance"],
  action: ({ body }) => {
    const parsed = bodySchema.safeParse(body);
    return parsed.success && parsed.data.action === "reject"
      ? "payments.bank_transfer.reject"
      : "payments.bank_transfer.confirm";
  },
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getReason: ({ body }) => {
    const parsed = bodySchema.safeParse(body);
    return parsed.success && parsed.data.action === "reject" ? parsed.data.reason : null;
  },
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx
      .select({
        status: bankTransferIntents.status,
        amount: bankTransferIntents.amount,
        reference: bankTransferIntents.reference,
      })
      .from(bankTransferIntents)
      .where(eq(bankTransferIntents.id, resourceId))
      .limit(1);
    return row ?? null;
  },
  handler: async ({ tx, admin, resourceId, body }) => {
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const action: ActionBody = parsed.data;
    try {
      if (action.action === "confirm") {
        await confirmBankTransfer({ intentId: resourceId, adminId: admin.id, tx });
      } else {
        await rejectBankTransfer({
          intentId: resourceId,
          adminId: admin.id,
          reason: action.reason,
          tx,
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur";
      console.error(`[admin bank-transfer/${resourceId}]`, e);
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return { ok: true } as const;
  },
});
