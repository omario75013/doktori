import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { broadcastSos } from "@/lib/sos-broadcast";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(["super_admin"]);
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;
    const body = await req.json() as { doctorId?: string };

    if (!body.doctorId) {
      return NextResponse.json({ error: "doctorId requis" }, { status: 400 });
    }

    const { doctorId } = body;

    // Atomic accept — same logic as regular accept but triggered by admin
    const result = await db.execute(sql`
      UPDATE sos_sessions
      SET
        status     = 'accepted',
        doctor_id  = ${doctorId},
        accepted_at = NOW(),
        distance_m = (
          SELECT ST_Distance(
            s2.patient_location,
            ST_SetSRID(ST_MakePoint(d.longitude, d.latitude), 4326)::geography
          )
          FROM sos_sessions s2, doctors d
          WHERE s2.id = ${id} AND d.id = ${doctorId}
        )
      WHERE id = ${id} AND status = 'pending'
      RETURNING id, patient_id
    `);

    const updated = (result as unknown as Array<{ id: string; patient_id: string }>)[0];
    if (!updated) {
      return NextResponse.json(
        { error: "Session non en attente ou introuvable" },
        { status: 409 }
      );
    }

    // Broadcast to all doctors and the patient
    await broadcastSos("doctors-all", "request-taken", { sessionId: id });
    await broadcastSos(`session:${id}`, "session-update", {
      status: "accepted",
      forcedByAdmin: true,
      doctorId,
    });

    const meta = extractRequestMeta(req);
    await logAudit({
      actor: admin,
      action: "sos.force_accept",
      resourceType: "sos_sessions",
      resourceId: id,
      before: { status: "pending" },
      after: { status: "accepted", doctorId },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[POST /api//admin/sos/[id]/force-accept]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
