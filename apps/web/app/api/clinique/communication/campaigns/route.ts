import { NextResponse } from "next/server";
import { db, bulkSmsCampaigns } from "@doktori/db";
import { eq, desc } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";

// ── GET /api/clinique/communication/campaigns ─────────────────────────────────

export async function GET() {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const rows = await db
    .select()
    .from(bulkSmsCampaigns)
    .where(eq(bulkSmsCampaigns.clinicId, clinic.id))
    .orderBy(desc(bulkSmsCampaigns.createdAt))
    .limit(50);

  return NextResponse.json({ campaigns: rows });
}
