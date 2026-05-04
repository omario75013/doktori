import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { getDoctorPlanInfo } from "@/lib/plan-gates";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth || auth.role !== "doctor") return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const info = await getDoctorPlanInfo(auth.id);
  return NextResponse.json(info ?? { planCode: null, enabledFeatures: [], limits: {} });
}
