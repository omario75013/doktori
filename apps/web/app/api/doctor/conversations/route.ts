import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db, conversations, patients } from "@doktori/db";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
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
    .where(eq(conversations.doctorId, user.id))
    .orderBy(desc(conversations.lastMessageAt));

  return NextResponse.json(results);
}
