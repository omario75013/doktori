import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, appointments, patients } from "@doktori/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { CalendarClient } from "./calendar-client";
import { AgendaEditor } from "./agenda-editor";
import { CalendrierTabs } from "./tabs";

export default async function CalendrierPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const { tab } = await searchParams;
  const activeTab: "calendrier" | "agenda" = tab === "agenda" ? "agenda" : "calendrier";

  let calendarBody: React.ReactNode = null;
  if (activeTab === "calendrier") {
    const doctorId = session.user.id;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const appts = await db
      .select({
        id: appointments.id,
        startsAt: appointments.startsAt,
        endsAt: appointments.endsAt,
        status: appointments.status,
        type: appointments.type,
        reason: appointments.reason,
        patientId: appointments.patientId,
        patientName: patients.name,
        patientPhone: patients.phone,
      })
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .where(
        and(
          eq(appointments.doctorId, doctorId),
          gte(appointments.startsAt, monthStart),
          lte(appointments.startsAt, monthEnd),
        )
      )
      .orderBy(appointments.startsAt);

    calendarBody = <CalendarClient appointments={appts} />;
  }

  return (
    <div className="space-y-4">
      <CalendrierTabs active={activeTab} />
      {activeTab === "calendrier" ? calendarBody : <AgendaEditor />}
    </div>
  );
}
