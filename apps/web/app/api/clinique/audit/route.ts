import { NextRequest, NextResponse } from "next/server";
import { db, clinicAuditLog, doctors, clinics } from "@doktori/db";
import { eq, and, gte, lte, desc, inArray } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";
import { toCsv, parseExportFormat } from "@/lib/exports";

const LIMIT = 500;

export async function GET(req: NextRequest) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const { searchParams } = req.nextUrl;
  const action = searchParams.get("action") ?? undefined;
  const actorType = searchParams.get("actorType") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  // Build WHERE conditions
  const conditions = [eq(clinicAuditLog.clinicId, clinic.id)];

  if (action) conditions.push(eq(clinicAuditLog.action, action));
  if (actorType) conditions.push(eq(clinicAuditLog.actorType, actorType));
  if (from) conditions.push(gte(clinicAuditLog.createdAt, new Date(from)));
  if (to) conditions.push(lte(clinicAuditLog.createdAt, new Date(to)));

  const rows = await db
    .select()
    .from(clinicAuditLog)
    .where(and(...conditions))
    .orderBy(desc(clinicAuditLog.createdAt))
    .limit(LIMIT);

  // Resolve doctor actor names
  const doctorActorIds = [
    ...new Set(
      rows
        .filter((r) => r.actorType === "doctor" && r.actorId)
        .map((r) => r.actorId as string),
    ),
  ];

  const doctorNames: Record<string, string> = {};
  if (doctorActorIds.length > 0) {
    const doctorRows = await db
      .select({ id: doctors.id, name: doctors.name })
      .from(doctors)
      .where(inArray(doctors.id, doctorActorIds));
    for (const d of doctorRows) {
      doctorNames[d.id] = d.name;
    }
  }

  // Clinic name for actor_type = 'clinic'
  const [clinicRow] = await db
    .select({ name: clinics.name })
    .from(clinics)
    .where(eq(clinics.id, clinic.id))
    .limit(1);
  const clinicName = clinicRow?.name ?? "Clinique";

  const enriched = rows.map((r) => {
    let actorLabel: string = r.actorId ?? r.actorType;
    if (r.actorType === "doctor" && r.actorId && doctorNames[r.actorId]) {
      actorLabel = doctorNames[r.actorId]!;
    } else if (r.actorType === "clinic") {
      actorLabel = clinicName;
    }
    return { ...r, actorLabel };
  });

  const fmt = parseExportFormat(req);
  if (fmt === "csv") {
    type EnrichedRow = (typeof enriched)[number];
    return toCsv<EnrichedRow>(
      enriched,
      [
        {
          key: "createdAt",
          header: "Timestamp",
          format: (v) => (v instanceof Date ? v.toISOString() : String(v)),
        },
        { key: "actorType", header: "Actor Type" },
        { key: "actorLabel", header: "Actor" },
        { key: "action", header: "Action" },
        { key: "targetType", header: "Target Type" },
        { key: "targetId", header: "Target ID" },
        {
          key: "metadata",
          header: "Metadata (JSON)",
          format: (v) => (v ? JSON.stringify(v) : ""),
        },
      ],
      "audit-clinique",
    );
  }

  return NextResponse.json({ rows: enriched, total: enriched.length });
}
