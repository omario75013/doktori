import { NextRequest, NextResponse } from "next/server";
import { db, labClosedDays } from "@doktori/db";
import { requireLabContext, requireLabUser } from "@/lib/lab-auth";

// POST /api/laboratoire/schedule/closed-days (admin-only)
export async function POST(req: NextRequest) {
  let labId: string;
  const user = await requireLabUser();
  if (user instanceof NextResponse) {
    const ctx = await requireLabContext();
    if (ctx instanceof NextResponse) return ctx;
    labId = ctx.labId;
  } else {
    if (user.labUserRole !== "admin") {
      return NextResponse.json({ error: "Réservé aux administrateurs" }, { status: 403 });
    }
    labId = user.labId;
  }

  let body: { date?: unknown; reason?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  if (typeof body.date !== "string" || !body.date) {
    return NextResponse.json({ error: "date requis (YYYY-MM-DD)" }, { status: 400 });
  }

  const [inserted] = await db
    .insert(labClosedDays)
    .values({
      labId,
      date: body.date,
      reason: typeof body.reason === "string" ? body.reason.trim() || null : null,
    })
    .returning();

  return NextResponse.json({ closedDay: inserted }, { status: 201 });
}
