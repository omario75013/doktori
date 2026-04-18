import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db, adminNotifications } from "@doktori/db";
import { eq, desc, count, and, inArray } from "drizzle-orm";

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

  const [notifications, [{ unreadCount }]] = await Promise.all([
    db
      .select()
      .from(adminNotifications)
      .orderBy(desc(adminNotifications.createdAt))
      .limit(limit),
    db
      .select({ unreadCount: count() })
      .from(adminNotifications)
      .where(eq(adminNotifications.isRead, false)),
  ]);

  return NextResponse.json({ notifications, unreadCount: Number(unreadCount) });
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const body = (await req.json()) as { ids?: string[]; markAllRead?: boolean };

  if (body.markAllRead) {
    await db
      .update(adminNotifications)
      .set({ isRead: true })
      .where(eq(adminNotifications.isRead, false));
    return NextResponse.json({ ok: true });
  }

  if (Array.isArray(body.ids) && body.ids.length > 0) {
    await db
      .update(adminNotifications)
      .set({ isRead: true })
      .where(
        and(
          inArray(adminNotifications.id, body.ids),
          eq(adminNotifications.isRead, false)
        )
      );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "ids ou markAllRead requis" }, { status: 400 });
}
