import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { confirmBankTransfer, rejectBankTransfer } from "@/lib/bank-transfer";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm") }),
  z.object({ action: z.literal("reject"), reason: z.string().min(3).max(500) }),
]);

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/payments/bank-transfer/[id]
 *
 * Admin confirms or rejects a pending bank-transfer intent. Wraps
 * lib/bank-transfer.ts which handles the appointment + wallet updates
 * inside a single transaction.
 *
 * Allowed roles: super_admin, finance.
 * Body: { action: "confirm" } | { action: "reject", reason: string (3..500) }
 */
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const admin = await requireAdmin(["super_admin", "finance"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    if (parsed.data.action === "confirm") {
      await confirmBankTransfer({ intentId: id, adminId: admin.id });
    } else {
      await rejectBankTransfer({
        intentId: id,
        adminId: admin.id,
        reason: parsed.data.reason,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur";
    console.error(`[admin bank-transfer/${id}]`, e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
