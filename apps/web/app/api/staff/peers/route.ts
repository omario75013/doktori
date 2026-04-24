import { NextResponse, NextRequest } from "next/server";
import { db, doctors, secretaries } from "@doktori/db";
import { and, eq, ne } from "drizzle-orm";
import { requireStaff } from "@/lib/staff-context";

export async function GET(req: NextRequest) {
  const ctx = await requireStaff(req);
  if ("err" in ctx) return ctx.err;

  // The doctor of the cabinet + all other active secretaries
  const [doctor] = await db
    .select({ id: doctors.id, name: doctors.name, photoUrl: doctors.photoUrl })
    .from(doctors)
    .where(eq(doctors.id, ctx.doctorId))
    .limit(1);

  const secs = await db
    .select({ id: secretaries.id, name: secretaries.name, photoUrl: secretaries.photoUrl })
    .from(secretaries)
    .where(and(eq(secretaries.doctorId, ctx.doctorId), eq(secretaries.isActive, true)));

  const peers: Array<{ type: "doctor" | "secretary"; id: string; name: string; photoUrl: string | null }> = [];
  if (doctor && !(ctx.selfType === "doctor" && ctx.selfId === doctor.id)) {
    peers.push({ type: "doctor", id: doctor.id, name: `Dr. ${doctor.name}`, photoUrl: doctor.photoUrl });
  }
  for (const s of secs) {
    if (ctx.selfType === "secretary" && ctx.selfId === s.id) continue;
    peers.push({ type: "secretary", id: s.id, name: s.name, photoUrl: s.photoUrl });
  }
  return NextResponse.json(peers);
}
