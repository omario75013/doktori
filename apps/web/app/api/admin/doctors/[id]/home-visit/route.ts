import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, doctorHomeVisitSettings, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const [row] = await db
    .select()
    .from(doctorHomeVisitSettings)
    .where(eq(doctorHomeVisitSettings.doctorId, id))
    .limit(1);

  return NextResponse.json({ homeVisit: row ?? null });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;

  const [doctor] = await db
    .select()
    .from(doctors)
    .where(eq(doctors.id, id))
    .limit(1);
  if (!doctor) {
    return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
  }

  const body = (await req.json()) as {
    isAvailable?: unknown;
    radiusKm?: unknown;
    fee?: unknown;
  };

  if (body.isAvailable === undefined) {
    return NextResponse.json({ error: "isAvailable requis" }, { status: 400 });
  }
  if (typeof body.isAvailable !== "boolean") {
    return NextResponse.json({ error: "isAvailable doit être un booléen" }, { status: 400 });
  }
  if (body.radiusKm !== undefined && typeof body.radiusKm !== "number") {
    return NextResponse.json({ error: "radiusKm doit être un entier" }, { status: 400 });
  }
  if (body.fee !== undefined && typeof body.fee !== "number") {
    return NextResponse.json({ error: "fee doit être un entier (en millimes)" }, { status: 400 });
  }

  const [before] = await db
    .select()
    .from(doctorHomeVisitSettings)
    .where(eq(doctorHomeVisitSettings.doctorId, id))
    .limit(1);

  const now = new Date();

  let after: typeof before;
  if (before) {
    const updates: Record<string, unknown> = {
      isAvailable: body.isAvailable,
      updatedAt: now,
    };
    if (body.radiusKm !== undefined) updates.radiusKm = body.radiusKm;
    if (body.fee !== undefined) updates.fee = body.fee;

    [after] = await db
      .update(doctorHomeVisitSettings)
      .set(updates)
      .where(eq(doctorHomeVisitSettings.doctorId, id))
      .returning();
  } else {
    const insertValues: {
      doctorId: string;
      isAvailable: boolean;
      radiusKm?: number;
      fee?: number;
      updatedAt: Date;
    } = {
      doctorId: id,
      isAvailable: body.isAvailable,
      updatedAt: now,
    };
    if (body.radiusKm !== undefined) insertValues.radiusKm = body.radiusKm as number;
    if (body.fee !== undefined) insertValues.fee = body.fee as number;

    [after] = await db
      .insert(doctorHomeVisitSettings)
      .values(insertValues)
      .returning();
  }

  const meta = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "doctors.home_visit_update",
    resourceType: "doctors",
    resourceId: id,
    before: before
      ? { isAvailable: before.isAvailable, radiusKm: before.radiusKm, fee: before.fee }
      : null,
    after: { isAvailable: after.isAvailable, radiusKm: after.radiusKm, fee: after.fee },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ ok: true, homeVisit: after });
}
