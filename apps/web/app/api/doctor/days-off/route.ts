import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db, doctorDaysOff, doctors, secretaries, conversations, messages } from "@doktori/db";
import { eq, gte, and } from "drizzle-orm";

// GET /api/doctor/days-off — list days-off for the authenticated doctor (or their secretary)
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth || (auth.role !== "doctor" && auth.role !== "secretary")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const doctorId = auth.role === "secretary" ? auth.doctorId : auth.id;

  const rows = await db
    .select()
    .from(doctorDaysOff)
    .where(and(eq(doctorDaysOff.doctorId, doctorId), gte(doctorDaysOff.endDate, new Date().toISOString().slice(0, 10))))
    .orderBy(doctorDaysOff.startDate);

  return NextResponse.json(rows);
}

// POST /api/doctor/days-off — declare a new days-off period
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth || auth.role !== "doctor") return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { startDate, endDate, reason, practiceId } = body as Record<string, unknown>;

  if (typeof startDate !== "string" || typeof endDate !== "string") {
    return NextResponse.json({ error: "startDate et endDate sont requis" }, { status: 400 });
  }

  if (startDate > endDate) {
    return NextResponse.json({ error: "startDate doit être avant endDate" }, { status: 400 });
  }

  const [row] = await db
    .insert(doctorDaysOff)
    .values({
      doctorId: auth.id,
      practiceId: typeof practiceId === "string" ? practiceId : null,
      startDate,
      endDate,
      reason: typeof reason === "string" ? reason : null,
    })
    .returning();

  // Notify secretaries via a system message in each active conversation
  const doctor = await db
    .select({ name: doctors.name })
    .from(doctors)
    .where(eq(doctors.id, auth.id))
    .limit(1)
    .then((r) => r[0]);

  if (doctor) {
    const secs = await db
      .select({ id: secretaries.id })
      .from(secretaries)
      .where(eq(secretaries.doctorId, auth.id));

    for (const sec of secs) {
      const convo = await db
        .select({ id: conversations.id })
        .from(conversations)
        .where(
          and(
            eq(conversations.doctorId, auth.id),
            eq(conversations.patientId, sec.id)
          )
        )
        .limit(1)
        .then((r) => r[0]);

      if (convo) {
        const fmtDate = (d: string) =>
          new Date(d).toLocaleDateString("fr-TN", { day: "numeric", month: "long", year: "numeric" });

        await db.insert(messages).values({
          conversationId: convo.id,
          senderType: "system",
          senderId: auth.id,
          content: `🏖️ Dr. ${doctor.name} a déclaré des congés du ${fmtDate(startDate)} au ${fmtDate(endDate)}.${reason ? ` Motif : ${reason}` : ""}`,
          type: "system",
        });
      }
    }
  }

  return NextResponse.json(row, { status: 201 });
}
