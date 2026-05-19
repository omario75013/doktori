import { NextRequest, NextResponse } from "next/server";
import { desc, eq, and } from "drizzle-orm";
import { db, supportTickets, supportTicketMessages, doctors, clinics, labs, secretaries, patients } from "@doktori/db";
import { requireAuth } from "@/lib/require-auth";

type ResolvedActor = {
  type: "doctor" | "clinic" | "lab" | "secretary" | "patient";
  id: string;
  email: string | null;
  name: string;
};

async function resolveActor(req: NextRequest): Promise<ResolvedActor | null> {
  const user = await requireAuth(req);
  if (!user) return null;
  if (user.role === "admin") return null;
  if (user.role === "doctor") {
    const [d] = await db.select({ id: doctors.id, email: doctors.email, name: doctors.name }).from(doctors).where(eq(doctors.id, user.id)).limit(1);
    return d ? { type: "doctor", ...d } : null;
  }
  if (user.role === "clinic") {
    const [c] = await db.select({ id: clinics.id, email: clinics.email, name: clinics.name }).from(clinics).where(eq(clinics.id, user.id)).limit(1);
    return c ? { type: "clinic", ...c } : null;
  }
  if (user.role === "lab") {
    const [l] = await db.select({ id: labs.id, email: labs.email, name: labs.name }).from(labs).where(eq(labs.id, user.id)).limit(1);
    return l ? { type: "lab", ...l } : null;
  }
  if (user.role === "secretary") {
    const [s] = await db.select({ id: secretaries.id, email: secretaries.email, name: secretaries.name }).from(secretaries).where(eq(secretaries.id, user.id)).limit(1);
    return s ? { type: "secretary", ...s } : null;
  }
  if (user.role === "patient") {
    const [p] = await db.select({ id: patients.id, email: patients.email, name: patients.name }).from(patients).where(eq(patients.id, user.id)).limit(1);
    return p ? { type: "patient", ...p } : null;
  }
  return null;
}

// List the caller's own tickets.
export async function GET(req: NextRequest) {
  const actor = await resolveActor(req);
  if (!actor) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const tickets = await db
    .select({
      id: supportTickets.id,
      subject: supportTickets.subject,
      status: supportTickets.status,
      priority: supportTickets.priority,
      lastMessageAt: supportTickets.lastMessageAt,
      createdAt: supportTickets.createdAt,
    })
    .from(supportTickets)
    .where(and(eq(supportTickets.requesterType, actor.type), eq(supportTickets.requesterId, actor.id)))
    .orderBy(desc(supportTickets.lastMessageAt));

  return NextResponse.json({ tickets });
}

// Open a new ticket. Body: { subject, body, category?, priority? }
export async function POST(req: NextRequest) {
  const actor = await resolveActor(req);
  if (!actor) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as {
    subject?: string;
    body?: string;
    category?: string;
    priority?: string;
  } | null;
  if (!body?.subject || !body?.body) {
    return NextResponse.json({ error: "subject et body requis" }, { status: 400 });
  }
  const [ticket] = await db
    .insert(supportTickets)
    .values({
      requesterType: actor.type,
      requesterId: actor.id,
      requesterEmail: actor.email,
      requesterName: actor.name,
      subject: body.subject.slice(0, 255),
      category: body.category ?? "general",
      priority: ["low", "normal", "high", "urgent"].includes(body.priority ?? "")
        ? (body.priority as string)
        : "normal",
    })
    .returning();
  await db.insert(supportTicketMessages).values({
    ticketId: ticket.id,
    authorType: actor.type,
    authorId: actor.id,
    body: body.body,
  });
  return NextResponse.json({ ok: true, ticketId: ticket.id });
}
