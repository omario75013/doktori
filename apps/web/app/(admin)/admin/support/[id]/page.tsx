import { db, supportTickets, supportTicketMessages } from "@doktori/db";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, LifeBuoy } from "lucide-react";
import { TicketDetailClient } from "./ticket-detail-client";

export const dynamic = "force-dynamic";

export default async function AdminSupportTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [ticket] = await db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.id, id))
    .limit(1);
  if (!ticket) notFound();

  const messages = await db
    .select()
    .from(supportTicketMessages)
    .where(eq(supportTicketMessages.ticketId, id))
    .orderBy(asc(supportTicketMessages.createdAt));

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link
        href="/admin/support"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux tickets
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
            <LifeBuoy className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{ticket.subject}</h1>
            <p className="text-slate-500 text-sm">
              {ticket.requesterName ?? "Anonyme"} ({ticket.requesterType})
              {ticket.requesterEmail ? ` · ${ticket.requesterEmail}` : ""}
            </p>
          </div>
        </div>
      </div>

      <TicketDetailClient
        ticket={{
          id: ticket.id,
          status: ticket.status,
          priority: ticket.priority,
        }}
        initialMessages={messages.map((m) => ({
          id: m.id,
          authorType: m.authorType,
          body: m.body,
          isInternal: m.isInternal,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
