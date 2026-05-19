import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db, supportTickets, supportTicketMessages } from "@doktori/db";
import { requireAdmin } from "@/lib/admin-auth";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteContext) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;
  const { id } = await ctx.params;
  const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, id)).limit(1);
  if (!ticket) return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });
  const messages = await db
    .select()
    .from(supportTicketMessages)
    .where(eq(supportTicketMessages.ticketId, id))
    .orderBy(asc(supportTicketMessages.createdAt));
  return NextResponse.json({ ticket, messages });
}

// Update status / priority / assignment, OR post an admin reply.
// Body: { status?, priority?, assignedAdminId?, replyBody?, internal? }
export const PATCH = withAdminAudit<{ ok: true }, RouteContext>({
  action: ({ body }) => {
    const b = body as Record<string, unknown> | null;
    if (b && typeof b.replyBody === "string" && b.replyBody.trim()) {
      return "support.reply";
    }
    return "support.update";
  },
  resourceType: "support_tickets",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx.select().from(supportTickets).where(eq(supportTickets.id, resourceId)).limit(1);
    return row ?? null;
  },
  handler: async ({ tx, resourceId, body, admin }) => {
    const b = (body ?? {}) as {
      status?: string;
      priority?: string;
      assignedAdminId?: string | null;
      replyBody?: string;
      internal?: boolean;
    };
    const [exists] = await tx
      .select({ id: supportTickets.id })
      .from(supportTickets)
      .where(eq(supportTickets.id, resourceId))
      .limit(1);
    if (!exists) {
      return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof b.status === "string") updates.status = b.status;
    if (typeof b.priority === "string") updates.priority = b.priority;
    if (b.assignedAdminId !== undefined) updates.assignedAdminId = b.assignedAdminId;

    if (typeof b.replyBody === "string" && b.replyBody.trim()) {
      await tx.insert(supportTicketMessages).values({
        ticketId: resourceId,
        authorType: "admin",
        authorId: admin.id,
        body: b.replyBody.trim(),
        isInternal: b.internal === true,
      });
      if (!b.internal) {
        updates.lastMessageAt = new Date();
        // If admin replied and status is open, move it to in_progress / waiting_user
        if (!b.status) updates.status = "waiting_user";
      }
    }

    if (Object.keys(updates).length > 1) {
      await tx.update(supportTickets).set(updates).where(eq(supportTickets.id, resourceId));
    }
    return { ok: true } as const;
  },
});
