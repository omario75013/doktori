import { NextResponse } from "next/server";
import { requireDoctorOrSecretary } from "@/lib/secretary-auth";
import { getSMSUsage } from "@/lib/sms-quota";

export async function GET() {
  const actor = await requireDoctorOrSecretary();
  if (actor instanceof NextResponse) return actor;

  const { used, limit, plan } = await getSMSUsage(actor.doctorId);
  const remaining = limit >= 999999 ? 999999 : Math.max(0, limit - used);

  return NextResponse.json({ used, limit, plan, remaining });
}
