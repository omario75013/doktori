import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import { db, appointments, secretaries } from "@doktori/db";
import { eq, and } from "drizzle-orm";
import { parsePermissions, type Section } from "@/lib/secretary-permissions";

async function secretaryCan(secretaryId: string, section: Section): Promise<boolean> {
  const [row] = await db
    .select({ permissions: secretaries.permissions })
    .from(secretaries)
    .where(eq(secretaries.id, secretaryId))
    .limit(1);
  if (!row) return false;
  return parsePermissions(row.permissions)[section];
}

async function requireDoctorForAppointment(req: NextRequest, id: string) {
  const user = await requireAuth(req);
  if (!user) {
    return { error: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };
  }
  const role = user.role;
  const doctorId =
    role === "doctor"
      ? user.id
      : role === "secretary"
        ? user.doctorId
        : null;
  if (!doctorId) {
    return {
      error: NextResponse.json({ error: "Accès non autorisé" }, { status: 403 }),
    };
  }
  const [row] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(and(eq(appointments.id, id), eq(appointments.doctorId, doctorId)))
    .limit(1);
  if (!row) {
    return {
      error: NextResponse.json({ error: "RDV introuvable" }, { status: 404 }),
    };
  }
  return { doctorId, role: role as "doctor" | "secretary", selfId: user.id };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authz = await requireDoctorForAppointment(req, id);
  if ("error" in authz) return authz.error;

  const [appt] = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      type: appointments.type,
      reason: appointments.reason,
      patientId: appointments.patientId,
    })
    .from(appointments)
    .where(and(eq(appointments.id, id), eq(appointments.doctorId, authz.doctorId)))
    .limit(1);

  if (!appt) {
    return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });
  }

  return NextResponse.json(appt);
}

const patchSchema = z
  .object({
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
    type: z.enum(["cabinet", "teleconsult", "domicile"]).optional(),
    reason: z.string().trim().max(500).optional().nullable(),
    status: z
      .enum(["pending", "confirmed", "cancelled", "completed", "no_show"])
      .optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: "Aucun champ fourni" });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authz = await requireDoctorForAppointment(req, id);
  if ("error" in authz) return authz.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Secretary permission enforcement
  if (authz.role === "secretary") {
    const wantsCancel = parsed.data.status === "cancelled" || parsed.data.status === "no_show";
    const wantsEdit =
      parsed.data.startsAt || parsed.data.endsAt || parsed.data.type || parsed.data.reason !== undefined;
    if (wantsCancel) {
      const can = await secretaryCan(authz.selfId!, "rendezVousCancel");
      if (!can) {
        return NextResponse.json(
          { error: "Permission refusée : annuler RDV" },
          { status: 403 }
        );
      }
    }
    if (wantsEdit) {
      const can = await secretaryCan(authz.selfId!, "rendezVousEdit");
      if (!can) {
        return NextResponse.json(
          { error: "Permission refusée : modifier RDV" },
          { status: 403 }
        );
      }
    }
  }

  const update: Record<string, unknown> = {};
  if (parsed.data.startsAt) update.startsAt = new Date(parsed.data.startsAt);
  if (parsed.data.endsAt) update.endsAt = new Date(parsed.data.endsAt);
  if (parsed.data.type) update.type = parsed.data.type;
  if (parsed.data.reason !== undefined) update.reason = parsed.data.reason;
  if (parsed.data.status) update.status = parsed.data.status;

  if (
    update.startsAt &&
    update.endsAt &&
    (update.startsAt as Date) >= (update.endsAt as Date)
  ) {
    return NextResponse.json(
      { error: "L'heure de fin doit être postérieure au début" },
      { status: 400 }
    );
  }

  await db.update(appointments).set(update).where(eq(appointments.id, id));

  const [updated] = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      type: appointments.type,
      reason: appointments.reason,
      patientId: appointments.patientId,
    })
    .from(appointments)
    .where(eq(appointments.id, id))
    .limit(1);

  return NextResponse.json(updated);
}
