import { NextRequest, NextResponse } from "next/server";
import { db, patientConsents } from "@doktori/db";
import { eq } from "drizzle-orm";
import { getPatientFromRequest } from "@/lib/patient-auth";

const VALID_CONSENT_TYPES = [
  "cookies_analytics",
  "cookies_marketing",
  "marketing_email",
  "research_anonymized",
] as const;

type ConsentType = (typeof VALID_CONSENT_TYPES)[number];

// GET /api/me/consents — list all consents for the patient
export async function GET(req: NextRequest) {
  const session = getPatientFromRequest(req);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const consents = await db
    .select()
    .from(patientConsents)
    .where(eq(patientConsents.patientId, session.id));

  return NextResponse.json({ consents });
}

// PUT /api/me/consents — upsert consent values
// Body: { consents: { [type]: boolean } }
export async function PUT(req: NextRequest) {
  const session = getPatientFromRequest(req);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.consents !== "object") {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;
  const userAgent = req.headers.get("user-agent") ?? null;

  const updates: Promise<unknown>[] = [];

  for (const [type, granted] of Object.entries(body.consents)) {
    if (!VALID_CONSENT_TYPES.includes(type as ConsentType)) continue;
    if (typeof granted !== "boolean") continue;

    // Drizzle ON CONFLICT via insert + update pattern
    updates.push(
      db
        .insert(patientConsents)
        .values({
          patientId: session.id,
          consentType: type,
          granted,
          ip,
          userAgent,
        })
        // patientConsents has no unique constraint in the schema, so we insert a new row each time
        // This preserves audit history — each change is a new row
    );
  }

  await Promise.all(updates);

  const consents = await db
    .select()
    .from(patientConsents)
    .where(eq(patientConsents.patientId, session.id));

  return NextResponse.json({ consents });
}
