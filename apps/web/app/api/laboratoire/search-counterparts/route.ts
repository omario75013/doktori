import { NextResponse } from "next/server";
import { db, doctors, labs } from "@doktori/db";
import { and, eq, ilike, or, ne } from "drizzle-orm";
import { requireLabContext } from "@/lib/lab-auth";

export async function GET(req: Request) {
  const ctx = await requireLabContext();
  if (ctx instanceof NextResponse) return ctx;

  const url = new URL(req.url);
  const type = (url.searchParams.get("type") ?? "doctor") as "doctor" | "lab";
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const term = `%${q}%`;

  if (type === "doctor") {
    const rows = await db
      .select({
        id: doctors.id,
        name: doctors.name,
        specialty: doctors.specialty,
        city: doctors.city,
        photoUrl: doctors.photoUrl,
      })
      .from(doctors)
      .where(
        and(
          eq(doctors.verificationStatus, "verified"),
          or(ilike(doctors.name, term), ilike(doctors.email, term)),
        ),
      )
      .limit(20);
    return NextResponse.json({
      results: rows.map((r) => ({
        id: r.id,
        name: r.name,
        sub: [r.specialty, r.city].filter(Boolean).join(" · "),
        photoUrl: r.photoUrl ?? null,
      })),
    });
  }

  // type === 'lab': exclude self, verified only
  const rows = await db
    .select({
      id: labs.id,
      name: labs.name,
      city: labs.city,
      kind: labs.kind,
    })
    .from(labs)
    .where(
      and(
        eq(labs.verificationStatus, "verified"),
        ne(labs.id, ctx.labId),
        or(ilike(labs.name, term), ilike(labs.email, term)),
      ),
    )
    .limit(20);
  return NextResponse.json({
    results: rows.map((r) => ({
      id: r.id,
      name: r.name,
      sub: [r.kind === "radiology" ? "Radiologie" : "Laboratoire", r.city].filter(Boolean).join(" · "),
      photoUrl: null,
    })),
  });
}
