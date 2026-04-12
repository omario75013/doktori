import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, doctorInsurance, doctors } from "@doktori/db";
import { eq, and } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const rows = await db
    .select()
    .from(doctorInsurance)
    .where(eq(doctorInsurance.doctorId, id));

  return NextResponse.json({ insurance: rows });
}

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

  const body = (await req.json()) as {
    insuranceType?: unknown;
    isConventioned?: unknown;
  };
  if (
    !body.insuranceType ||
    typeof body.insuranceType !== "string" ||
    body.insuranceType.trim() === ""
  ) {
    return NextResponse.json({ error: "insuranceType requis" }, { status: 400 });
  }

  const [row] = await db
    .insert(doctorInsurance)
    .values({
      doctorId: id,
      insuranceType: body.insuranceType.trim(),
      isConventioned:
        typeof body.isConventioned === "boolean" ? body.isConventioned : true,
    })
    .returning();

  const meta = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "doctors.insurance_add",
    resourceType: "doctors",
    resourceId: id,
    before: null,
    after: {
      insuranceId: row.id,
      insuranceType: row.insuranceType,
      isConventioned: row.isConventioned,
    },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ ok: true, insurance: row }, { status: 201 });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;

  let insuranceId: string | null = null;
  const url = new URL(req.url);
  const queryInsuranceId = url.searchParams.get("insuranceId");
  if (queryInsuranceId) {
    insuranceId = queryInsuranceId;
  } else {
    try {
      const body = (await req.json()) as { insuranceId?: unknown };
      if (typeof body.insuranceId === "string") insuranceId = body.insuranceId;
    } catch {
      // body may be empty for query-param-only requests
    }
  }

  if (!insuranceId) {
    return NextResponse.json({ error: "insuranceId requis" }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(doctorInsurance)
    .where(
      and(eq(doctorInsurance.id, insuranceId), eq(doctorInsurance.doctorId, id))
    )
    .limit(1);

  if (!existing) {
    return NextResponse.json(
      { error: "Convention introuvable" },
      { status: 404 }
    );
  }

  await db
    .delete(doctorInsurance)
    .where(
      and(eq(doctorInsurance.id, insuranceId), eq(doctorInsurance.doctorId, id))
    );

  const meta = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "doctors.insurance_remove",
    resourceType: "doctors",
    resourceId: id,
    before: {
      insuranceId: existing.id,
      insuranceType: existing.insuranceType,
      isConventioned: existing.isConventioned,
    },
    after: null,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ ok: true });
}
