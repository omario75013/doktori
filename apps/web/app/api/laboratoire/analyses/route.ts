import { NextRequest, NextResponse } from "next/server";
import { db, labAnalysisTypes } from "@doktori/db";
import { and, eq, desc } from "drizzle-orm";
import { requireLabContext, requireLabUser } from "@/lib/lab-auth";

// GET /api/laboratoire/analyses
// Returns this lab's analyses. Pass ?all=1 to include inactive.
export async function GET(req: NextRequest) {
  const ctx = await requireLabContext();
  if (ctx instanceof NextResponse) return ctx;
  const { labId } = ctx;

  const { searchParams } = new URL(req.url);
  const includeAll = searchParams.get("all") === "1";

  const rows = await db
    .select()
    .from(labAnalysisTypes)
    .where(
      includeAll
        ? eq(labAnalysisTypes.labId, labId)
        : and(eq(labAnalysisTypes.labId, labId), eq(labAnalysisTypes.isActive, true))
    )
    .orderBy(desc(labAnalysisTypes.createdAt));

  return NextResponse.json({ analyses: rows });
}

// POST /api/laboratoire/analyses (admin-only)
export async function POST(req: NextRequest) {
  const user = await requireLabUser();
  if (user instanceof NextResponse) return user;
  if (user.labUserRole !== "admin") {
    // Also allow legacy "lab" role sessions via requireLabContext fallback
    return NextResponse.json({ error: "Réservé aux administrateurs" }, { status: 403 });
  }
  const { labId } = user;

  let body: {
    code?: unknown;
    name?: unknown;
    category?: unknown;
    priceMillimes?: unknown;
    durationHours?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  if (typeof body.code !== "string" || !body.code.trim()) {
    return NextResponse.json({ error: "code requis" }, { status: 400 });
  }
  if (typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "name requis" }, { status: 400 });
  }

  try {
    const [inserted] = await db
      .insert(labAnalysisTypes)
      .values({
        labId,
        code: body.code.trim().toUpperCase(),
        name: body.name.trim(),
        category: typeof body.category === "string" ? body.category.trim() || null : null,
        priceMillimes: typeof body.priceMillimes === "number" ? body.priceMillimes : null,
        durationHours: typeof body.durationHours === "number" ? body.durationHours : null,
      })
      .returning();
    return NextResponse.json({ analysis: inserted }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("unique")) {
      return NextResponse.json({ error: "Ce code existe déjà pour ce laboratoire" }, { status: 409 });
    }
    throw err;
  }
}
