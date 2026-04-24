import { NextResponse, NextRequest } from "next/server";
import { db, pushTokens } from "@doktori/db";
import { eq } from "drizzle-orm";
import { getPatientFromRequest } from "@/lib/patient-auth";
import { getStaffFromRequest } from "@/lib/staff-auth";

type Actor =
  | { actorType: "patient"; actorId: string }
  | { actorType: "doctor"; actorId: string }
  | { actorType: "secretary"; actorId: string };

function resolveActor(req: NextRequest | Request): Actor | null {
  const reqAsNext = req as NextRequest;
  const patient = getPatientFromRequest(reqAsNext);
  if (patient) return { actorType: "patient", actorId: patient.id };
  const staff = getStaffFromRequest(reqAsNext);
  if (staff) {
    if (staff.role === "doctor" || staff.role === "secretary") {
      return { actorType: staff.role, actorId: staff.id };
    }
  }
  return null;
}

/**
 * POST /api/push-tokens
 * Body: { token: string, platform: 'ios' | 'android', deviceId?: string }
 *
 * Upserts a device token for the calling user (patient / doctor / secretary).
 * Token uniqueness guarantees a device is bound to exactly one user — re-registering
 * the same token with a different actor rebinds it.
 */
export async function POST(req: NextRequest) {
  const actor = resolveActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { token?: string; platform?: string; deviceId?: string }
    | null;

  const token = body?.token?.trim();
  const platform = body?.platform;

  if (!token || (platform !== "ios" && platform !== "android")) {
    return NextResponse.json({ error: "token et platform requis" }, { status: 400 });
  }

  const deviceId = body?.deviceId?.slice(0, 255) ?? null;

  await db
    .insert(pushTokens)
    .values({
      patientId: actor.actorType === "patient" ? actor.actorId : null,
      actorType: actor.actorType,
      actorId: actor.actorId,
      token,
      platform,
      deviceId,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: pushTokens.token,
      set: {
        patientId: actor.actorType === "patient" ? actor.actorId : null,
        actorType: actor.actorType,
        actorId: actor.actorId,
        platform,
        deviceId,
        isActive: true,
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/push-tokens
 * Body: { token: string }
 * Used on logout to stop pushes to this device.
 */
export async function DELETE(req: NextRequest) {
  const actor = resolveActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { token?: string } | null;
  const token = body?.token?.trim();
  if (!token) return NextResponse.json({ error: "token requis" }, { status: 400 });

  await db
    .update(pushTokens)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(pushTokens.token, token));

  return NextResponse.json({ ok: true });
}
