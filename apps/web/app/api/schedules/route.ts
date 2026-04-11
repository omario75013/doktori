import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getScheduleForDoctor, upsertSchedule } from "@doktori/db";
import { scheduleUpdateSchema } from "@doktori/validation";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const schedule = await getScheduleForDoctor(session.user.id);
  return NextResponse.json(schedule);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = scheduleUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await upsertSchedule(session.user.id, parsed.data.slots);
  return NextResponse.json(result);
}
