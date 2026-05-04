import { NextRequest, NextResponse } from "next/server";
import { db, anonymizationConsents } from "@doktori/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getPatientFromRequest } from "@/lib/patient-auth";

export async function GET(req: NextRequest) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const [row] = await db
    .select()
    .from(anonymizationConsents)
    .where(eq(anonymizationConsents.patientId, patient.id))
    .limit(1);

  if (!row) {
    return NextResponse.json({ consent: null });
  }

  return NextResponse.json({
    consent: {
      ...row,
      grantedAt: row.grantedAt ? row.grantedAt.toISOString() : null,
      revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
      updatedAt: row.updatedAt.toISOString(),
    },
  });
}

const putSchema = z
  .object({
    granted: z.boolean(),
    scope: z.array(z.string().trim().min(1).max(60)).optional(),
  })
  .strict();

export async function PUT(req: NextRequest) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const now = new Date();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;
  const userAgent = req.headers.get("user-agent") ?? null;

  const scope = parsed.data.scope ?? ["aggregate_stats"];

  const [existing] = await db
    .select()
    .from(anonymizationConsents)
    .where(eq(anonymizationConsents.patientId, patient.id))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(anonymizationConsents)
      .set({
        granted: parsed.data.granted,
        grantedAt: parsed.data.granted ? now : existing.grantedAt,
        revokedAt: !parsed.data.granted ? now : null,
        scope,
        ip,
        userAgent,
        updatedAt: now,
      })
      .where(eq(anonymizationConsents.patientId, patient.id))
      .returning();
    return NextResponse.json({
      consent: {
        ...updated,
        grantedAt: updated.grantedAt ? updated.grantedAt.toISOString() : null,
        revokedAt: updated.revokedAt ? updated.revokedAt.toISOString() : null,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  }

  const [created] = await db
    .insert(anonymizationConsents)
    .values({
      patientId: patient.id,
      granted: parsed.data.granted,
      grantedAt: parsed.data.granted ? now : null,
      revokedAt: null,
      scope,
      ip,
      userAgent,
    })
    .returning();

  return NextResponse.json(
    {
      consent: {
        ...created,
        grantedAt: created.grantedAt ? created.grantedAt.toISOString() : null,
        revokedAt: created.revokedAt ? created.revokedAt.toISOString() : null,
        updatedAt: created.updatedAt.toISOString(),
      },
    },
    { status: 201 }
  );
}
