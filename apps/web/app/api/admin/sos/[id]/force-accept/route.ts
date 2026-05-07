import { NextResponse } from "next/server";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { sql } from "drizzle-orm";
import { broadcastSos } from "@/lib/sos-broadcast";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withAdminAudit<{ ok: true }, RouteContext>({
  action: "sos.force_accept",
  resourceType: "sos_sessions",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  handler: async ({ tx, resourceId, body }) => {
    const b = (body ?? {}) as { doctorId?: string };

    if (!b.doctorId) {
      return NextResponse.json({ error: "doctorId requis" }, { status: 400 });
    }

    const { doctorId } = b;

    // Atomic accept — same logic as regular accept but triggered by admin
    const result = await tx.execute(sql`
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
          WHERE s2.id = ${resourceId} AND d.id = ${doctorId}
        )
      WHERE id = ${resourceId} AND status = 'pending'
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
    await broadcastSos("doctors-all", "request-taken", { sessionId: resourceId });
    await broadcastSos(`session:${resourceId}`, "session-update", {
      status: "accepted",
      forcedByAdmin: true,
      doctorId,
    });

    return { ok: true } as const;
  },
});
