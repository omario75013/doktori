import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const admin = await requireAdmin(["super_admin", "support"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;

  const sessionResult = await db.execute(sql`
    SELECT
      s.id,
      s.status,
      s.symptom_category,
      s.description,
      s.fee,
      s.commission,
      s.distance_m,
      s.resolution,
      s.admin_notes,
      s.requested_at,
      s.accepted_at,
      s.completed_at,
      s.expires_at,
      s.cancel_reason,
      s.cancelled_by,
      s.cancelled_at,
      s.patient_lat,
      s.patient_lng,
      s.doctor_id,
      p.name  AS patient_name,
      p.phone AS patient_phone,
      d.name  AS doctor_name,
      d.phone AS doctor_phone,
      d.city  AS doctor_city,
      d.latitude  AS doctor_lat,
      d.longitude AS doctor_lng,
      pp.proxy_number,
      pp.is_active AS proxy_active,
      r.rating   AS review_rating,
      r.comment  AS review_comment,
      r.created_at AS review_at
    FROM sos_sessions s
    LEFT JOIN patients p   ON p.id = s.patient_id
    LEFT JOIN doctors  d   ON d.id = s.doctor_id
    LEFT JOIN phone_proxies pp ON pp.sos_session_id = s.id AND pp.is_active = true
    LEFT JOIN reviews r    ON r.sos_session_id = s.id
    WHERE s.id = ${id}
    LIMIT 1
  `);

  const session = (sessionResult as unknown as Record<string, unknown>[])[0];
  if (!session) {
    return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
  }

  // Declines with doctor names
  const declinesResult = await db.execute(sql`
    SELECT
      sd.id,
      sd.declined_at,
      sd.reason,
      d.name AS doctor_name
    FROM sos_declines sd
    LEFT JOIN doctors d ON d.id = sd.doctor_id
    WHERE sd.sos_session_id = ${id}
    ORDER BY sd.declined_at ASC
  `);

  // Phone proxy details
  const proxyResult = await db.execute(sql`
    SELECT proxy_number, patient_phone, doctor_phone, is_active
    FROM phone_proxies
    WHERE sos_session_id = ${id}
    LIMIT 1
  `);

  return NextResponse.json({
    session,
    declines: declinesResult as unknown as Record<string, unknown>[],
    proxy: (proxyResult as unknown as Record<string, unknown>[])[0] ?? null,
  });
}

export const PATCH = withAdminAudit<{ ok: true }, RouteContext>({
  action: "sos.admin_update",
  resourceType: "sos_sessions",
  allowedRoles: ["super_admin", "support"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  handler: async ({ tx, resourceId, body }) => {
    const b = (body ?? {}) as {
      adminNotes?: string;
      status?: string;
      resolution?: string;
    };

    const ALLOWED_STATUSES = ["pending", "accepted", "completed", "expired", "cancelled"];

    if (
      typeof b.adminNotes === "undefined" &&
      typeof b.status === "undefined" &&
      typeof b.resolution === "undefined"
    ) {
      return NextResponse.json(
        { error: "adminNotes, status ou resolution requis" },
        { status: 400 }
      );
    }

    if (b.status !== undefined && !ALLOWED_STATUSES.includes(b.status)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }

    const updates: ReturnType<typeof sql>[] = [];

    if (typeof b.adminNotes !== "undefined") {
      updates.push(sql`admin_notes = ${b.adminNotes}`);
    }
    if (typeof b.status !== "undefined") {
      updates.push(sql`status = ${b.status}`);
      if (b.status === "completed") {
        updates.push(sql`completed_at = COALESCE(completed_at, NOW())`);
      }
      if (b.status === "cancelled") {
        updates.push(sql`cancelled_at = COALESCE(cancelled_at, NOW())`);
        updates.push(sql`cancelled_by = 'admin'`);
      }
    }
    if (typeof b.resolution !== "undefined") {
      updates.push(sql`resolution = ${b.resolution}`);
    }

    const setClauses = updates.reduce(
      (acc, clause, idx) => (idx === 0 ? sql`${clause}` : sql`${acc}, ${clause}`),
      sql``
    );

    await tx.execute(sql`
      UPDATE sos_sessions SET ${setClauses} WHERE id = ${resourceId}
    `);

    return { ok: true } as const;
  },
});
