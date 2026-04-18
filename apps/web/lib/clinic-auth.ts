import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export type ClinicSession = {
  id: string;
  email: string;
  name: string;
};

/**
 * Guard a clinic-facing API route. Returns the clinic session or a 403 NextResponse.
 *
 * Usage:
 *   const clinic = await requireClinic();
 *   if (clinic instanceof NextResponse) return clinic;
 *   // ...use clinic.id here
 */
export async function requireClinic(): Promise<ClinicSession | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "clinic") {
    return NextResponse.json(
      { error: "Accès réservé aux cliniques" },
      { status: 403 }
    );
  }
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
  };
}
