import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, cnamClaims, appointments, patients, doctors } from "@doktori/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";

// Normalizes a Tunisian CNAM number to digits-only so duplicates across formats collapse
function normalizeCnam(raw: string): string {
  return raw.replace(/\s/g, "").trim();
}

// Tunisian CNAM IDs are 6–12 digits in practice. Reject anything with
// non-digit characters after normalization so a typo doesn't overwrite a
// good number on patients.cnam_number.
function isValidCnam(normalized: string): boolean {
  return /^\d{6,15}$/.test(normalized);
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // YYYY-MM
  const status = searchParams.get("status");

  const conditions = [eq(cnamClaims.doctorId, session.user.id)];
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    conditions.push(gte(cnamClaims.consultationDate, `${month}-01`));
    const [y, m] = month.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    conditions.push(lte(cnamClaims.consultationDate, `${month}-${String(lastDay).padStart(2, "0")}`));
  }
  if (status && ["draft", "submitted", "reimbursed", "rejected"].includes(status)) {
    conditions.push(eq(cnamClaims.status, status));
  }

  const rows = await db
    .select({
      id: cnamClaims.id,
      cnamNumber: cnamClaims.cnamNumber,
      patientRole: cnamClaims.patientRole,
      amount: cnamClaims.amount,
      consultationDate: cnamClaims.consultationDate,
      status: cnamClaims.status,
      submittedAt: cnamClaims.submittedAt,
      reimbursedAt: cnamClaims.reimbursedAt,
      createdAt: cnamClaims.createdAt,
      patientName: patients.name,
      patientId: patients.id,
    })
    .from(cnamClaims)
    .innerJoin(patients, eq(cnamClaims.patientId, patients.id))
    .where(and(...conditions))
    .orderBy(desc(cnamClaims.consultationDate))
    .limit(500);

  const totals = rows.reduce(
    (acc, r) => {
      acc.count++;
      acc.amount += r.amount;
      acc.byStatus[r.status] = (acc.byStatus[r.status] ?? 0) + r.amount;
      return acc;
    },
    { count: 0, amount: 0, byStatus: {} as Record<string, number> },
  );

  return NextResponse.json({ rows, totals });
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { appointmentId, cnamNumber, amount, patientRole, notes } = body;

    if (!appointmentId || typeof cnamNumber !== "string" || !cnamNumber.trim()) {
      return NextResponse.json({ error: "appointmentId et numéro CNAM requis" }, { status: 400 });
    }
    const amountMillimes = Number(amount);
    if (!Number.isFinite(amountMillimes) || amountMillimes < 1000 || amountMillimes > 1000000) {
      return NextResponse.json({ error: "Montant invalide (1 à 1000 DT)" }, { status: 400 });
    }
    if (patientRole && !["assure", "ayant_droit"].includes(patientRole)) {
      return NextResponse.json({ error: "Rôle invalide" }, { status: 400 });
    }

    const [appt] = await db
      .select()
      .from(appointments)
      .where(and(eq(appointments.id, appointmentId), eq(appointments.doctorId, session.user.id)))
      .limit(1);

    if (!appt) return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });
    if (!appt.patientId) {
      return NextResponse.json(
        { error: "Ce RDV n'a pas de patient lié." },
        { status: 400 },
      );
    }

    const normalized = normalizeCnam(cnamNumber);
    if (!isValidCnam(normalized)) {
      return NextResponse.json(
        { error: "Numéro CNAM invalide (6 à 15 chiffres)." },
        { status: 400 },
      );
    }

    // Persist the CNAM number on the patient so future bookings auto-fill
    await db
      .update(patients)
      .set({ cnamNumber: normalized })
      .where(eq(patients.id, appt.patientId));

    const [created] = await db
      .insert(cnamClaims)
      .values({
        appointmentId: appt.id,
        doctorId: session.user.id,
        patientId: appt.patientId,
        cnamNumber: normalized,
        patientRole: patientRole ?? "assure",
        amount: amountMillimes,
        consultationDate: appt.startsAt.toISOString().slice(0, 10),
        notes: notes || null,
      })
      .onConflictDoUpdate({
        target: cnamClaims.appointmentId,
        set: {
          cnamNumber: normalized,
          patientRole: patientRole ?? "assure",
          amount: amountMillimes,
          notes: notes || null,
        },
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error("[POST /api//cnam/claims]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
