import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, conversations, messages } from "@doktori/db";
import { and, eq, isNull, ne, count } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const doctorId = session.user.id;

  const [row] = await db
    .select({ value: count() })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(
      and(
        eq(conversations.doctorId, doctorId),
        ne(messages.senderType, "doctor"),
        isNull(messages.readAt),
      ),
    );

  return NextResponse.json({ count: Number(row?.value ?? 0) });
}
