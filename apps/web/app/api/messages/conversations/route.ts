import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, conversations, doctors, patients } from "@doktori/db";
import { eq, desc, and } from "drizzle-orm";
import { getPatientFromRequest } from "@/lib/patient-auth";

/**
 * Detect caller: doctor (session-based) or patient (JWT Bearer).
 * Returns { role, id } or null if unauthenticated.
 */
async function resolveCaller(
  req: NextRequest
): Promise<{ role: "doctor" | "patient"; id: string } | null> {
  // Patient token in Authorization header takes priority
  const patient = getPatientFromRequest(req);
  if (patient) return { role: "patient", id: patient.id };

  // Doctor session via NextAuth
  const session = await auth();
  if (session?.user?.id && (session.user as any).role === "doctor") {
    return { role: "doctor", id: session.user.id };
  }

  return null;
}

/**
 * GET /api/messages/conversations
 * List all conversations for the authenticated caller (doctor or patient).
 */
export async function GET(req: NextRequest) {
  const caller = await resolveCaller(req);
  if (!caller) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  if (caller.role === "doctor") {
    const results = await db
      .select({
        id: conversations.id,
        status: conversations.status,
        lastMessageAt: conversations.lastMessageAt,
        createdAt: conversations.createdAt,
        patientId: conversations.patientId,
        patientName: patients.name,
        patientPhone: patients.phone,
      })
      .from(conversations)
      .innerJoin(patients, eq(conversations.patientId, patients.id))
      .where(eq(conversations.doctorId, caller.id))
      .orderBy(desc(conversations.lastMessageAt));

    return NextResponse.json(results);
  }

  // Patient
  const results = await db
    .select({
      id: conversations.id,
      status: conversations.status,
      lastMessageAt: conversations.lastMessageAt,
      createdAt: conversations.createdAt,
      doctorId: conversations.doctorId,
      doctorName: doctors.name,
      doctorSpecialty: doctors.specialty,
      doctorPhotoUrl: doctors.photoUrl,
    })
    .from(conversations)
    .innerJoin(doctors, eq(conversations.doctorId, doctors.id))
    .where(eq(conversations.patientId, caller.id))
    .orderBy(desc(conversations.lastMessageAt));

  return NextResponse.json(results);
}

/**
 * POST /api/messages/conversations
 * Body: { doctorId, patientId? }
 * - If caller is a patient, patientId defaults to caller.id (body patientId ignored).
 * - If caller is a doctor, both doctorId and patientId are required.
 * Idempotent: returns existing conversation if it already exists.
 */
export async function POST(req: NextRequest) {
  const caller = await resolveCaller(req);
  if (!caller) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const { doctorId } = body;

  if (!doctorId || typeof doctorId !== "string") {
    return NextResponse.json({ error: "doctorId requis" }, { status: 400 });
  }

  let resolvedPatientId: string;
  let resolvedDoctorId: string;

  if (caller.role === "patient") {
    // Patient creates conversation with a doctor — patientId is always caller
    resolvedPatientId = caller.id;
    resolvedDoctorId = doctorId;
  } else {
    // Doctor creates conversation — patientId must be provided in body
    const { patientId } = body;
    if (!patientId || typeof patientId !== "string") {
      return NextResponse.json({ error: "patientId requis" }, { status: 400 });
    }
    resolvedDoctorId = caller.id;
    resolvedPatientId = patientId;
  }

  const [existing] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.doctorId, resolvedDoctorId),
        eq(conversations.patientId, resolvedPatientId)
      )
    )
    .limit(1);

  if (existing) return NextResponse.json(existing);

  const [created] = await db
    .insert(conversations)
    .values({ doctorId: resolvedDoctorId, patientId: resolvedPatientId, lastMessageAt: new Date() })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
