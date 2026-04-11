import { NextResponse } from "next/server";
import { verifyFlouciPayment } from "@/lib/flouci";
import { markAppointmentPaid } from "@/lib/queries/payments";

export async function POST(req: Request) {
  const body = await req.json();
  const { payment_id, reference } = body;

  if (!reference) return NextResponse.json({ error: "Missing reference" }, { status: 400 });

  const verification = await verifyFlouciPayment(payment_id || reference);
  if (!verification.success) {
    return NextResponse.json({ error: "Payment not verified" }, { status: 402 });
  }

  // Mark the appointment as paid
  await markAppointmentPaid(reference, payment_id || reference, "flouci");

  return NextResponse.json({ success: true });
}
