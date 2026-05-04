import { NextRequest, NextResponse } from "next/server";
import { db, patientNotifications } from "@doktori/db";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getPatientFromRequest } from "@/lib/patient-auth";

export async function GET(req: NextRequest) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unread") === "1";
  const limit = Math.min(Number(searchParams.get("limit") ?? "50") || 50, 100);

  const where = unreadOnly
    ? and(eq(patientNotifications.patientId, patient.id), isNull(patientNotifications.readAt))
    : eq(patientNotifications.patientId, patient.id);

  const rows = await db
    .select()
    .from(patientNotifications)
    .where(where)
    .orderBy(desc(patientNotifications.createdAt))
    .limit(limit);

  return NextResponse.json({ items: rows });
}
