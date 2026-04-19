import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export type SecretarySession = {
  id: string;
  email: string;
  name: string;
  /** The doctor ID this secretary is authorized to manage */
  doctorId: string;
  clinicId: string | null;
};

/**
 * Guard a secretary-facing API route. Returns the secretary session or a NextResponse error.
 *
 * Usage:
 *   const secretary = await requireSecretary();
 *   if (secretary instanceof NextResponse) return secretary;
 *   // ...use secretary.doctorId here
 */
export async function requireSecretary(): Promise<SecretarySession | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== "secretary") {
    return NextResponse.json({ error: "Accès réservé aux secrétaires" }, { status: 403 });
  }
  const doctorId = session.user.doctorId;
  if (!doctorId) {
    return NextResponse.json({ error: "Secrétaire non associée à un médecin" }, { status: 403 });
  }
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
    doctorId,
    clinicId: session.user.clinicId ?? null,
  };
}

/**
 * Guard a route that can be accessed by either a doctor or a secretary.
 * Returns the effective doctorId along with the actor's role.
 */
export async function requireDoctorOrSecretary(): Promise<
  { doctorId: string; role: "doctor" | "secretary"; actorId: string } | NextResponse
> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const role = session.user.role;
  if (role === "doctor") {
    return { doctorId: session.user.id, role: "doctor", actorId: session.user.id };
  }
  if (role === "secretary") {
    const doctorId = session.user.doctorId;
    if (!doctorId) {
      return NextResponse.json({ error: "Secrétaire non associée à un médecin" }, { status: 403 });
    }
    return { doctorId, role: "secretary", actorId: session.user.id };
  }
  return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
}
