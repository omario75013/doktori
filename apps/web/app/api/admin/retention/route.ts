import { NextResponse } from "next/server";
import { db, retentionPolicies } from "@doktori/db";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const rows = await db
    .select()
    .from(retentionPolicies)
    .orderBy(retentionPolicies.resourceType);

  return NextResponse.json({
    policies: rows.map((p) => ({
      ...p,
      lastRunAt: p.lastRunAt ? p.lastRunAt.toISOString() : null,
      updatedAt: p.updatedAt.toISOString(),
    })),
  });
}
