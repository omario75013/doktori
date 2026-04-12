import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, conversations, patients } from "@doktori/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const results = await db
    .select({
      id: conversations.id,
      status: conversations.status,
      lastMessageAt: conversations.lastMessageAt,
      createdAt: conversations.createdAt,
      patientId: conversations.patientId,
      patientName: patients.name,
      patientPhone: patients.phone,
    })
    .from(conversations)
    .innerJoin(patients, eq(conversations.patientId, patients.id))
    .where(eq(conversations.doctorId, session.user.id))
    .orderBy(desc(conversations.lastMessageAt));

  return NextResponse.json(results);
}
