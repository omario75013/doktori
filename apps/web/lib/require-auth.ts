import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getPatientFromRequest } from "@/lib/patient-auth";
import { getStaffFromRequest } from "@/lib/staff-auth";

export type AuthedUser =
  | { id: string; role: "doctor"; doctorId: string; source: "cookie" | "bearer" }
  | {
      id: string;
      role: "secretary";
      doctorId: string;
      clinicId: string | null;
      source: "cookie" | "bearer";
    }
  | { id: string; role: "admin"; source: "cookie" | "bearer" }
  | { id: string; role: "clinic"; source: "cookie" | "bearer" }
  | { id: string; role: "patient"; phone?: string; source: "bearer" };

/**
 * Unified auth for API routes. Tries NextAuth cookie first (web), then falls back
 * to a Bearer JWT (mobile apps + other non-browser clients). Returns the normalized
 * user or null — caller decides the status code.
 *
 * Use this instead of `auth()` directly on any route that needs to work from both
 * the web app AND the mobile app. For web-only routes, stick with `auth()` — no
 * reason to open a Bearer path that isn't needed.
 */
export async function requireAuth(req?: NextRequest): Promise<AuthedUser | null> {
  // 1. NextAuth cookie session (existing web flow)
  const session = await auth();
  if (session?.user?.id && session.user.role) {
    const role = session.user.role;
    switch (role) {
      case "doctor":
        return { id: session.user.id, role, doctorId: session.user.id, source: "cookie" };
      case "secretary":
        return {
          id: session.user.id,
          role,
          doctorId: (session.user.doctorId as string) ?? "",
          clinicId: (session.user.clinicId as string | null) ?? null,
          source: "cookie",
        };
      case "admin":
        return { id: session.user.id, role, source: "cookie" };
      case "clinic":
        return { id: session.user.id, role, source: "cookie" };
    }
  }

  // 2. Bearer JWT — requires the Request object
  if (!req) return null;

  const patient = getPatientFromRequest(req);
  if (patient) {
    return { id: patient.id, role: "patient", phone: patient.phone, source: "bearer" };
  }

  const staff = getStaffFromRequest(req);
  if (staff) {
    switch (staff.role) {
      case "doctor":
        return { id: staff.id, role: "doctor", doctorId: staff.id, source: "bearer" };
      case "secretary":
        return {
          id: staff.id,
          role: "secretary",
          doctorId: (staff as { doctorId: string }).doctorId,
          clinicId: (staff as { clinicId: string | null }).clinicId ?? null,
          source: "bearer",
        };
      case "admin":
        return { id: staff.id, role: "admin", source: "bearer" };
      case "clinic":
        return { id: staff.id, role: "clinic", source: "bearer" };
    }
  }

  return null;
}

/**
 * Narrower helpers for common call sites. Each returns the auth payload or a
 * JSON 401/403 Response — callers just `if (res instanceof Response) return res`.
 */
export async function requireDoctorOrSecretaryUnified(
  req?: NextRequest
): Promise<{ doctorId: string; actorId: string; role: "doctor" | "secretary" } | Response> {
  const user = await requireAuth(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (user.role === "doctor") return { doctorId: user.id, actorId: user.id, role: "doctor" };
  if (user.role === "secretary") {
    return { doctorId: user.doctorId, actorId: user.id, role: "secretary" };
  }
  return new Response(JSON.stringify({ error: "Accès non autorisé" }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}
