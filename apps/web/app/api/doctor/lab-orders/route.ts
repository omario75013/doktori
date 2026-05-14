import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { db, labOrders, patients, labs } from "@doktori/db";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { requireDoctor } from "@/lib/doctor-auth";
import { z } from "zod";

const CreateOrderSchema = z.object({
  patientId: z.string().uuid(),
  labId: z.string().uuid().optional().nullable(),
  tests: z.array(z.object({ code: z.string(), label: z.string() })).min(1),
  instructions: z.string().optional().nullable(),
  urgency: z.enum(["routine", "urgent"]),
});

export async function GET(req: NextRequest) {
  const doctor = await requireDoctor(req);
  if (doctor instanceof NextResponse) return doctor;

  const patientId = req.nextUrl.searchParams.get("patientId");

  const rows = await db
    .select({
      id: labOrders.id,
      patientId: labOrders.patientId,
      patientName: patients.name,
      labId: labOrders.labId,
      labName: labs.name,
      tests: labOrders.tests,
      instructions: labOrders.instructions,
      urgency: labOrders.urgency,
      status: labOrders.status,
      accessToken: labOrders.accessToken,
      completedAt: labOrders.completedAt,
      createdAt: labOrders.createdAt,
    })
    .from(labOrders)
    .innerJoin(patients, eq(labOrders.patientId, patients.id))
    .leftJoin(labs, eq(labOrders.labId, labs.id))
    .where(
      and(
        eq(labOrders.doctorId, doctor.id),
        patientId ? eq(labOrders.patientId, patientId) : undefined,
      ),
    )
    .orderBy(desc(labOrders.createdAt));

  return NextResponse.json({ orders: rows });
}

export async function POST(req: NextRequest) {
  const doctor = await requireDoctor(req);
  if (doctor instanceof NextResponse) return doctor;

  const body = await req.json().catch(() => null);
  const parsed = CreateOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { patientId, labId, tests, instructions, urgency } = parsed.data;
  const accessToken = randomBytes(16).toString("hex");

  const [row] = await db
    .insert(labOrders)
    .values({
      doctorId: doctor.id,
      patientId,
      labId: labId ?? null,
      tests,
      instructions: instructions ?? null,
      urgency,
      status: "pending",
      accessToken,
    })
    .returning();

  return NextResponse.json({ order: row }, { status: 201 });
}
