import { NextResponse } from "next/server";
import { db, clinicRdvRequests } from "@doktori/db";
import { and, eq, desc } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";

// GET /api/clinique/notifications
// Aggregates clinic-side notifications. Today: pending RDV requests.
// Returns a stable shape consumed by NotificationsBell.
export async function GET() {
  const ctx = await requireClinic();
  if (ctx instanceof NextResponse) return ctx;

  const pending = await db
    .select({
      id: clinicRdvRequests.id,
      patientName: clinicRdvRequests.patientName,
      preferredDate: clinicRdvRequests.preferredDate,
      preferredTimeRange: clinicRdvRequests.preferredTimeRange,
      createdAt: clinicRdvRequests.createdAt,
    })
    .from(clinicRdvRequests)
    .where(
      and(
        eq(clinicRdvRequests.clinicId, ctx.id),
        eq(clinicRdvRequests.status, "pending"),
      ),
    )
    .orderBy(desc(clinicRdvRequests.createdAt))
    .limit(15);

  const items = pending.map((r) => ({
    id: r.id,
    title: `Demande de RDV — ${r.patientName}`,
    body: `${new Date(r.preferredDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} · ${r.preferredTimeRange === "any" ? "Toute heure" : r.preferredTimeRange}`,
    createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
    readAt: null as string | null,
    href: "/clinique/rdv-requests",
  }));

  return NextResponse.json({
    items,
    unreadCount: items.length,
    counts: { rdvRequests: items.length },
  });
}
