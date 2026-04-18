import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, webhooks } from "@doktori/db";
import { desc } from "drizzle-orm";
import { randomBytes } from "crypto";

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const rows = await db.select().from(webhooks).orderBy(desc(webhooks.createdAt));
  return NextResponse.json({ webhooks: rows });
}

export async function POST(req: Request) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const body = (await req.json()) as { url?: string; events?: string[] };

  if (!body.url || !Array.isArray(body.events) || body.events.length === 0) {
    return NextResponse.json({ error: "url et events requis" }, { status: 400 });
  }

  // Validate URL format
  try {
    new URL(body.url);
  } catch {
    return NextResponse.json({ error: "URL invalide" }, { status: 400 });
  }

  const secret = randomBytes(32).toString("hex");

  const [hook] = await db
    .insert(webhooks)
    .values({
      url: body.url,
      events: body.events,
      secret,
      createdBy: admin.id,
    })
    .returning();

  const meta = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "webhooks.create",
    resourceType: "webhooks",
    resourceId: hook.id,
    before: null,
    after: { url: hook.url, events: hook.events },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ webhook: hook }, { status: 201 });
}
