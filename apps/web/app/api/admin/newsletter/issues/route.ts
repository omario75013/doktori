import { NextRequest, NextResponse } from "next/server";
import { db, newsletterIssues } from "@doktori/db";
import { desc } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const rows = await db
    .select()
    .from(newsletterIssues)
    .orderBy(desc(newsletterIssues.createdAt))
    .limit(100);

  return NextResponse.json({ issues: rows });
}

const createSchema = z
  .object({
    titleFr: z.string().trim().min(1).max(200),
    titleAr: z.string().trim().max(200).optional().nullable(),
    contentHtmlFr: z.string().trim().min(1),
    contentHtmlAr: z.string().trim().optional().nullable(),
    scheduledAt: z.string().datetime().optional().nullable(),
  })
  .strict();

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation échouée", details: parsed.error.flatten() }, { status: 400 });
  }

  const [row] = await db
    .insert(newsletterIssues)
    .values({
      titleFr: parsed.data.titleFr,
      titleAr: parsed.data.titleAr ?? null,
      contentHtmlFr: parsed.data.contentHtmlFr,
      contentHtmlAr: parsed.data.contentHtmlAr ?? null,
      scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
      createdByAdmin: admin.id,
    })
    .returning();

  return NextResponse.json({ issue: row }, { status: 201 });
}
