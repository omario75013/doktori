import { NextResponse } from "next/server";
import { getAppointmentPayment } from "@/lib/queries/payments";

/**
 * GET /api/payments/status?appt=<appointmentId>
 *
 * Returns the payment status of an appointment.
 * Intentionally returns only the payment status — not full appointment data —
 * to avoid leaking sensitive info to unauthenticated callers.
 *
 * This endpoint is polled by the payment success page to confirm server-side
 * payment verification without exposing any write path to the browser.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const apptId = searchParams.get("appt");

  if (!apptId) {
    return NextResponse.json({ error: "Paramètre 'appt' manquant" }, { status: 400 });
  }

  const appt = await getAppointmentPayment(apptId);
  if (!appt) {
    return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });
  }

  return NextResponse.json({ paymentStatus: appt.payment_status });
}
