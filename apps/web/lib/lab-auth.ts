import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export type LabSession = {
  id: string;
  email: string;
  name: string;
};

export type LabUserSession = {
  labUserId: string;
  labId: string;
  labUserRole: "admin" | "technician";
};

export type LabContext = {
  labId: string;
  isInHouse: boolean;
};

/**
 * Guard a lab-facing API route for the legacy single-account model (role === "lab").
 * Returns the lab session (id = labs.id) or a 401/403 NextResponse.
 */
export async function requireLab(): Promise<LabSession | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "lab") {
    return NextResponse.json(
      { error: "Accès réservé aux laboratoires" },
      { status: 403 }
    );
  }
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
  };
}

/**
 * Guard a lab-facing API route for the multi-user model (role === "lab_user").
 * Returns { labUserId, labId, labUserRole } or a 401/403 NextResponse.
 */
export async function requireLabUser(): Promise<LabUserSession | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const user = session.user as {
    role?: string;
    labId?: string;
    labUserRole?: "admin" | "technician";
  };
  if (user.role !== "lab_user") {
    return NextResponse.json(
      { error: "Accès réservé aux utilisateurs de laboratoire" },
      { status: 403 }
    );
  }
  if (!user.labId) {
    return NextResponse.json({ error: "Session invalide — labId manquant" }, { status: 403 });
  }
  return {
    labUserId: session.user.id,
    labId: user.labId,
    labUserRole: user.labUserRole ?? "technician",
  };
}

/**
 * Unified context for /laboratoire/* API routes.
 * Accepts both legacy single-account labs (role === "lab") and
 * multi-user lab staff (role === "lab_user"). Returns { labId, isInHouse }.
 *
 * isInHouse is always true for lab_user sessions.
 * For legacy lab sessions it is inferred from whether clinic_id is set on the
 * labs row — but to keep this helper fast (no extra DB call), we set it to
 * false and let callers fetch the labs row if they need it.
 */
export async function requireLabContext(): Promise<LabContext | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const user = session.user as {
    role?: string;
    labId?: string;
  };

  if (user.role === "lab") {
    // Legacy single-account: lab id is the session user id
    return { labId: session.user.id, isInHouse: false };
  }

  if (user.role === "lab_user") {
    if (!user.labId) {
      return NextResponse.json({ error: "Session invalide — labId manquant" }, { status: 403 });
    }
    return { labId: user.labId, isInHouse: true };
  }

  return NextResponse.json(
    { error: "Accès réservé aux laboratoires" },
    { status: 403 }
  );
}
