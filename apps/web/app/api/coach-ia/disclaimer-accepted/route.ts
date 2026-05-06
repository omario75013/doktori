import { NextResponse, type NextRequest } from "next/server";
import { isEnabled } from "@/lib/feature-flags";
import { requireAuth } from "@/lib/require-auth";
import { recordUsage } from "@/lib/coach-ia";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Logs that the patient accepted the Coach IA disclaimer modal.
 *
 * Stored in `coach_ia_usage` with `event_type='disclaimer_accepted'`. No
 * content, only the consent event + patient_id (DPIA: lawful basis Art 9(2)(a)
 * — explicit consent for special category health data).
 */
export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || user.role !== "patient") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  if (!(await isEnabled("coach_ia_enabled"))) {
    return NextResponse.json({ error: "Feature unavailable" }, { status: 403 });
  }

  await recordUsage({
    patientId: user.id,
    eventType: "disclaimer_accepted",
  });

  return NextResponse.json({ ok: true });
}
