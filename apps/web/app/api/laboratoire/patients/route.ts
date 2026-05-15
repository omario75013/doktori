import { NextRequest, NextResponse } from "next/server";
import { db, patients, labOrders } from "@doktori/db";
import { eq } from "drizzle-orm";
import { requireLabContext } from "@/lib/lab-auth";
import { resolveOrCreatePatient } from "@/lib/patient-identity";
import { randomUUID } from "node:crypto";

// POST /api/laboratoire/patients
// Wraps resolveOrCreatePatient with lab audit + optional order creation.
export async function POST(req: NextRequest) {
  const ctx = await requireLabContext();
  if (ctx instanceof NextResponse) return ctx;
  const { labId } = ctx;

  const body = await req.json() as {
    firstName?: string;
    lastName?: string;
    name?: string;
    cin?: string;
    phone?: string;
    email?: string;
    dob?: string;
    gender?: string;
    // Optional immediate order
    createOrder?: boolean;
    order?: {
      tests?: { code: string; label: string }[];
      urgency?: string;
      doctorId?: string | null;
      internalRef?: string;
      specimenCollectedAt?: string;
      expectedResultAt?: string;
    };
  };

  const name =
    body.name?.trim() ||
    [body.firstName?.trim(), body.lastName?.trim()].filter(Boolean).join(" ");

  if (!name) {
    return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });
  }

  const result = await resolveOrCreatePatient({
    name,
    cin: body.cin || null,
    phone: body.phone || null,
    email: body.email || null,
    dateOfBirth: body.dob || null,
    gender: body.gender || null,
  });

  // Fetch patient for response
  const [patient] = await db
    .select({ id: patients.id, name: patients.name, phone: patients.phone, email: patients.email })
    .from(patients)
    .where(eq(patients.id, result.patientId))
    .limit(1);

  let orderId: string | null = null;

  // Optional: create order immediately
  if (body.createOrder && body.order) {
    const o = body.order;
    const newOrderId = randomUUID();
    const accessToken = randomUUID().replace(/-/g, "").slice(0, 32);

    // doctorId is optional for walk-in orders (null = no prescribing doctor)
    if (o.doctorId) {
      await db.insert(labOrders).values({
        id: newOrderId,
        patientId: result.patientId,
        doctorId: o.doctorId,
        labId,
        tests: (o.tests ?? []) as { code: string; label: string }[],
        urgency: (o.urgency ?? "routine") as "routine" | "urgent",
        status: "pending",
        accessToken,
        internalRef: o.internalRef ?? null,
        specimenCollectedAt: o.specimenCollectedAt ? new Date(o.specimenCollectedAt) : null,
        expectedResultAt: o.expectedResultAt ? new Date(o.expectedResultAt) : null,
      });
      orderId = newOrderId;
    }
  }

  return NextResponse.json({
    patient,
    matched: result.matched,
    orderId,
  }, { status: result.matched ? 200 : 201 });
}
