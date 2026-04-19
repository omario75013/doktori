import { NextResponse } from "next/server";
import { requireDoctor } from "@/lib/doctor-auth";

/**
 * TODO: Integrate with Flouci/Paymee to process payment for SMS packs.
 * Pack: 50 SMS for 10 DT.
 */
export async function POST() {
  const doctor = await requireDoctor();
  if (doctor instanceof NextResponse) return doctor;

  return NextResponse.json(
    {
      todo: true,
      message:
        "L'achat de packs SMS n'est pas encore disponible. Intégration paiement à venir (Flouci/Paymee).",
      pack: { sms: 50, price: "10 DT" },
    },
    { status: 501 }
  );
}
