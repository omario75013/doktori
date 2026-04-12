import { NextResponse } from "next/server";
import { requireDoctor } from "@/lib/doctor-auth";
import { db, doctors, doctorSchedules } from "@doktori/db";
import { eq, count } from "drizzle-orm";

const VALID_MODES = ["cabinet", "teleconsult", "both"] as const;
type ConsultationMode = (typeof VALID_MODES)[number];

export async function GET() {
  const doctor = await requireDoctor();
  if (doctor instanceof NextResponse) return doctor;

  const [row] = await db
    .select({
      consultationMode: doctors.consultationMode,
      teleconsultFee: doctors.teleconsultFee,
    })
    .from(doctors)
    .where(eq(doctors.id, doctor.id))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
  }

  return NextResponse.json({
    consultationMode: row.consultationMode,
    teleconsultFee: row.teleconsultFee,
  });
}

export async function PUT(req: Request) {
  const doctor = await requireDoctor();
  if (doctor instanceof NextResponse) return doctor;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const { consultationMode, teleconsultFee } = body as Record<string, unknown>;

  if (!consultationMode || !VALID_MODES.includes(consultationMode as ConsultationMode)) {
    return NextResponse.json(
      { error: "Mode de consultation invalide. Valeurs acceptées : cabinet, teleconsult, both" },
      { status: 400 }
    );
  }

  if (teleconsultFee !== undefined && teleconsultFee !== null) {
    if (typeof teleconsultFee !== "number" || !Number.isInteger(teleconsultFee) || teleconsultFee < 0) {
      return NextResponse.json(
        { error: "Le tarif de téléconsultation doit être un entier positif (en millimes)" },
        { status: 400 }
      );
    }
  }

  // If switching to teleconsult-only, verify at least 1 active schedule slot exists
  if (consultationMode === "teleconsult") {
    const [scheduleCount] = await db
      .select({ count: count() })
      .from(doctorSchedules)
      .where(eq(doctorSchedules.doctorId, doctor.id));

    if (!scheduleCount || scheduleCount.count === 0) {
      return NextResponse.json(
        { error: "Vous devez avoir au moins un créneau horaire avant d'activer la téléconsultation exclusive" },
        { status: 422 }
      );
    }
  }

  const [updated] = await db
    .update(doctors)
    .set({
      consultationMode: consultationMode as ConsultationMode,
      teleconsultFee: teleconsultFee != null ? (teleconsultFee as number) : null,
      updatedAt: new Date(),
    })
    .where(eq(doctors.id, doctor.id))
    .returning({
      consultationMode: doctors.consultationMode,
      teleconsultFee: doctors.teleconsultFee,
    });

  if (!updated) {
    return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
