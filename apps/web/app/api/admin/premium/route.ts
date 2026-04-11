import { NextResponse } from "next/server";
import { db, doctorPremium } from "@doktori/db";
import { eq } from "drizzle-orm";

// Admin-only endpoint protected by CRON_SECRET for MVP.
// POST { doctorId, isActive, until? } — upserts a doctor_premium row.
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: { doctorId?: string; isActive?: boolean; until?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const { doctorId, isActive, until } = body;

  if (!doctorId || typeof isActive !== "boolean") {
    return NextResponse.json(
      { error: "doctorId (string) et isActive (boolean) sont requis" },
      { status: 422 }
    );
  }

  const untilDate = until ? new Date(until) : null;

  await db
    .insert(doctorPremium)
    .values({
      doctorId,
      isActive,
      until: untilDate,
    })
    .onConflictDoUpdate({
      target: doctorPremium.doctorId,
      set: {
        isActive,
        until: untilDate,
      },
    });

  return NextResponse.json({ ok: true, doctorId, isActive, until: untilDate });
}
