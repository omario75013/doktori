import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, doctorPremium, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;

  const [doctor] = await db
    .select({ id: doctors.id })
    .from(doctors)
    .where(eq(doctors.id, id))
    .limit(1);
  if (!doctor) {
    return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
  }

  const body = (await req.json()) as { isActive?: unknown; until?: unknown };

  if (typeof body.isActive !== "boolean") {
    return NextResponse.json(
      { error: "isActive (boolean) est requis" },
      { status: 422 }
    );
  }

  const [before] = await db
    .select()
    .from(doctorPremium)
    .where(eq(doctorPremium.doctorId, id))
    .limit(1);

  const untilDate =
    typeof body.until === "string" ? new Date(body.until) : null;

  const [after] = await db
    .insert(doctorPremium)
    .values({
      doctorId: id,
      isActive: body.isActive,
      until: untilDate,
    })
    .onConflictDoUpdate({
      target: doctorPremium.doctorId,
      set: {
        isActive: body.isActive,
        until: untilDate,
      },
    })
    .returning();

  const meta = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: body.isActive ? "doctors.premium_activate" : "doctors.premium_deactivate",
    resourceType: "doctors",
    resourceId: id,
    before: before ? { isActive: before.isActive, until: before.until } : null,
    after: { isActive: after.isActive, until: after.until },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ ok: true, premium: after });
}
