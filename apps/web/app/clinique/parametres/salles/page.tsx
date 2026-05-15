import { requireClinic } from "@/lib/clinic-auth";
import { redirect } from "next/navigation";
import { db, clinicSites, clinicRooms, appointments } from "@doktori/db";
import { eq, asc, desc, and, gte, lte, count } from "drizzle-orm";
import { DoorOpen } from "lucide-react";
import { SallesClient } from "./salles-client";

export default async function SallesPage() {
  const clinic = await requireClinic();
  if (clinic instanceof Response) redirect("/clinique-login");

  const clinicId = (clinic as { id: string }).id;

  const sites = await db
    .select()
    .from(clinicSites)
    .where(eq(clinicSites.clinicId, clinicId))
    .orderBy(desc(clinicSites.isPrimary), asc(clinicSites.name));

  const rooms = await db
    .select({
      id: clinicRooms.id,
      siteId: clinicRooms.siteId,
      name: clinicRooms.name,
      color: clinicRooms.color,
      isActive: clinicRooms.isActive,
      capacity: clinicRooms.capacity,
      floor: clinicRooms.floor,
      equipmentNotes: clinicRooms.equipmentNotes,
      status: clinicRooms.status,
      lastCleanedAt: clinicRooms.lastCleanedAt,
      createdAt: clinicRooms.createdAt,
    })
    .from(clinicRooms)
    .innerJoin(clinicSites, eq(clinicRooms.siteId, clinicSites.id))
    .where(eq(clinicSites.clinicId, clinicId))
    .orderBy(asc(clinicRooms.name));

  // Compute today's bookings count per room
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const bookingCounts = rooms.length > 0
    ? await db
        .select({
          clinicRoomId: appointments.clinicRoomId,
          cnt: count(appointments.id),
        })
        .from(appointments)
        .where(
          and(
            gte(appointments.startsAt, todayStart),
            lte(appointments.startsAt, todayEnd),
          )
        )
        .groupBy(appointments.clinicRoomId)
    : [];

  const bookingCountMap = new Map(
    bookingCounts.map((r) => [r.clinicRoomId, Number(r.cnt)])
  );

  // Attach today's count to each room
  const roomsWithCounts = rooms.map((r) => ({
    ...r,
    todayBookings: bookingCountMap.get(r.id) ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center">
          <DoorOpen className="h-5 w-5 text-purple-700" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-foreground">Salles</h1>
          <p className="text-sm text-muted-foreground">
            Gérez les salles de consultation par site.
          </p>
        </div>
      </div>

      <SallesClient initialSites={sites} initialRooms={roomsWithCounts} />
    </div>
  );
}
