import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, appointmentTypes } from "@doktori/db";
import { eq, asc } from "drizzle-orm";
import { invalidate } from "@/lib/cache";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const rows = await db
    .select()
    .from(appointmentTypes)
    .where(eq(appointmentTypes.doctorId, id))
    .orderBy(asc(appointmentTypes.createdAt));

  return NextResponse.json({ appointmentTypes: rows });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(["super_admin"]);
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;
    const body = (await req.json()) as Record<string, unknown>;

    const name = body.name as string | undefined;
    const durationMinutes = body.durationMinutes as number | undefined;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "name est requis" }, { status: 400 });
    }
    if (
      typeof durationMinutes !== "number" ||
      !Number.isInteger(durationMinutes) ||
      durationMinutes <= 0
    ) {
      return NextResponse.json(
        { error: "durationMinutes doit être un entier positif" },
        { status: 400 }
      );
    }

    const insert: {
      doctorId: string;
      name: string;
      durationMinutes: number;
      fee?: number;
      color?: string;
      isDefault?: boolean;
    } = {
      doctorId: id,
      name: name.trim(),
      durationMinutes,
    };

    if (typeof body.fee === "number") insert.fee = body.fee;
    if (typeof body.color === "string") insert.color = body.color;
    if (typeof body.isDefault === "boolean") insert.isDefault = body.isDefault;

    const [newType] = await db
      .insert(appointmentTypes)
      .values(insert)
      .returning();

    const meta = extractRequestMeta(req);
    await logAudit({
      actor: admin,
      action: "appointment_types.create",
      resourceType: "appointment_types",
      resourceId: newType.id,
      before: null,
      after: {
        name: newType.name,
        durationMinutes: newType.durationMinutes,
        fee: newType.fee,
        doctorId: id,
      },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    await invalidate(`doctor:apptTypes:${id}`);

    return NextResponse.json({ ok: true, appointmentType: newType }, { status: 201 });
  } catch (e) {
    console.error("[POST /api//admin/doctors/[id]/appointment-types]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
