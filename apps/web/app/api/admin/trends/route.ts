import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db, appointments, patients, doctors } from "@doktori/db";
import { gte, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

type Point = { date: string; bookings: number; signups: number; doctors: number };

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const url = new URL(req.url);
  const days = Math.min(Math.max(Number(url.searchParams.get("days") ?? 30), 1), 90);
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const [bookingRows, signupRows, doctorRows] = await Promise.all([
    db
      .select({
        day: sql<string>`to_char(${appointments.createdAt}, 'YYYY-MM-DD')`,
        n: sql<number>`count(*)::int`,
      })
      .from(appointments)
      .where(gte(appointments.createdAt, start))
      .groupBy(sql`to_char(${appointments.createdAt}, 'YYYY-MM-DD')`),
    db
      .select({
        day: sql<string>`to_char(${patients.createdAt}, 'YYYY-MM-DD')`,
        n: sql<number>`count(*)::int`,
      })
      .from(patients)
      .where(gte(patients.createdAt, start))
      .groupBy(sql`to_char(${patients.createdAt}, 'YYYY-MM-DD')`),
    db
      .select({
        day: sql<string>`to_char(${doctors.createdAt}, 'YYYY-MM-DD')`,
        n: sql<number>`count(*)::int`,
      })
      .from(doctors)
      .where(gte(doctors.createdAt, start))
      .groupBy(sql`to_char(${doctors.createdAt}, 'YYYY-MM-DD')`),
  ]);

  const map = new Map<string, Point>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, { date: key, bookings: 0, signups: 0, doctors: 0 });
  }
  for (const r of bookingRows) {
    const p = map.get(r.day);
    if (p) p.bookings = Number(r.n);
  }
  for (const r of signupRows) {
    const p = map.get(r.day);
    if (p) p.signups = Number(r.n);
  }
  for (const r of doctorRows) {
    const p = map.get(r.day);
    if (p) p.doctors = Number(r.n);
  }

  return NextResponse.json({ series: Array.from(map.values()) });
}
