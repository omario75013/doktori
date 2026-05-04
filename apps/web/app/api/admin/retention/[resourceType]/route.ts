import { NextResponse } from "next/server";
import { db, retentionPolicies } from "@doktori/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";

const patchSchema = z
  .object({
    retentionDays: z.number().int().min(1).max(365 * 50).optional(),
    hardDelete: z.boolean().optional(),
    description: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ resourceType: string }> }
) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const { resourceType } = await params;
  const [existing] = await db
    .select()
    .from(retentionPolicies)
    .where(eq(retentionPolicies.resourceType, resourceType))
    .limit(1);
  if (!existing) {
    return NextResponse.json(
      { error: "Politique introuvable" },
      { status: 404 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.retentionDays !== undefined)
    updates.retentionDays = parsed.data.retentionDays;
  if (parsed.data.hardDelete !== undefined)
    updates.hardDelete = parsed.data.hardDelete;
  if (parsed.data.description !== undefined)
    updates.description = parsed.data.description;

  const [updated] = await db
    .update(retentionPolicies)
    .set(updates)
    .where(eq(retentionPolicies.resourceType, resourceType))
    .returning();

  const meta = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "retention.update",
    resourceType: "retention_policies",
    resourceId: resourceType,
    before: {
      retentionDays: existing.retentionDays,
      hardDelete: existing.hardDelete,
    },
    after: {
      retentionDays: updated.retentionDays,
      hardDelete: updated.hardDelete,
    },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({
    policy: {
      ...updated,
      lastRunAt: updated.lastRunAt ? updated.lastRunAt.toISOString() : null,
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}
