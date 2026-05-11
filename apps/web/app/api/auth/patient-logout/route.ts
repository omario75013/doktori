import { NextResponse } from "next/server";
import { clearPatientCookie } from "@/lib/patient-auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  return clearPatientCookie(res);
}
