import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { getScheduleForDoctor, upsertSchedule } from "@doktori/db";
import { scheduleUpdateSchema } from "@doktori/validation";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const schedule = await getScheduleForDoctor(user.id);
  return NextResponse.json(schedule);
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (!user || user.role !== "doctor") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = scheduleUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const result = await upsertSchedule(
      user.id,
      parsed.data.slots,
      parsed.data.practiceId,
    );
    return NextResponse.json(result);
  } catch (e) {
    console.error("[PUT /api/schedules]", e);
    const msg = e instanceof Error ? e.message : "Erreur serveur";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
