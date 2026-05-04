import { NextRequest, NextResponse } from "next/server";
import { db, patientNotifications } from "@doktori/db";
import { and, eq, isNull } from "drizzle-orm";
import { getPatientFromRequest } from "@/lib/patient-auth";

export async function POST(req: NextRequest) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  await db
    .update(patientNotifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(patientNotifications.patientId, patient.id),
        isNull(patientNotifications.readAt),
      ),
    );

  return NextResponse.json({ ok: true });
}
