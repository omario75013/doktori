import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db, doctorNotificationPrefs } from "@doktori/db";
import { eq } from "drizzle-orm";

const ALLOWED_CHANNELS = new Set(["email", "sms", "push"]);

const DEFAULTS = {
  emailNewBooking: true,
  emailCancellation: true,
  emailDailyDigest: false,
  pushNewBooking: true,
  pushCancellation: true,
  pushRemindersEnabled: true,
  smsEnabled: false,
  cancelAlertChannels: ["email", "sms"],
  cancelAlertTemplate: null as string | null,
  reminderOffsetsHours: [72, 24, 2],
  cancelAlertOffsetsHours: [0],
};

function sanitizeHourArray(value: unknown, max: number): number[] | null {
  if (!Array.isArray(value)) return null;
  const clean = value
    .map((v) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null))
    .filter((v): v is number => v !== null && v >= 0 && v <= max);
  // dedupe + sort desc (earliest reminder first)
  return Array.from(new Set(clean)).sort((a, b) => b - a);
}

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const [row] = await db
    .select()
    .from(doctorNotificationPrefs)
    .where(eq(doctorNotificationPrefs.doctorId, user.id))
    .limit(1);

  return NextResponse.json({ ...DEFAULTS, ...(row ?? {}) });
}

export async function PUT(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Partial<typeof DEFAULTS> | null;
  if (!body) return NextResponse.json({ error: "Corps invalide" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (typeof body.emailNewBooking === "boolean") patch.emailNewBooking = body.emailNewBooking;
  if (typeof body.emailCancellation === "boolean")
    patch.emailCancellation = body.emailCancellation;
  if (typeof body.emailDailyDigest === "boolean")
    patch.emailDailyDigest = body.emailDailyDigest;
  if (typeof body.pushNewBooking === "boolean") patch.pushNewBooking = body.pushNewBooking;
  if (typeof body.pushCancellation === "boolean")
    patch.pushCancellation = body.pushCancellation;
  if (typeof body.pushRemindersEnabled === "boolean")
    patch.pushRemindersEnabled = body.pushRemindersEnabled;
  if (typeof body.smsEnabled === "boolean") patch.smsEnabled = body.smsEnabled;

  if (Array.isArray(body.cancelAlertChannels)) {
    const channels = body.cancelAlertChannels.filter(
      (c): c is string => typeof c === "string" && ALLOWED_CHANNELS.has(c)
    );
    patch.cancelAlertChannels = channels;
  }
  if (body.cancelAlertTemplate !== undefined) {
    patch.cancelAlertTemplate =
      typeof body.cancelAlertTemplate === "string"
        ? body.cancelAlertTemplate.slice(0, 2000)
        : null;
  }

  if (body.reminderOffsetsHours !== undefined) {
    const clean = sanitizeHourArray(body.reminderOffsetsHours, 720);
    if (clean) patch.reminderOffsetsHours = clean;
  }
  if (body.cancelAlertOffsetsHours !== undefined) {
    const clean = sanitizeHourArray(body.cancelAlertOffsetsHours, 168);
    if (clean) patch.cancelAlertOffsetsHours = clean;
  }

  patch.updatedAt = new Date();

  // UPSERT pattern
  await db
    .insert(doctorNotificationPrefs)
    .values({ doctorId: user.id, ...patch })
    .onConflictDoUpdate({
      target: doctorNotificationPrefs.doctorId,
      set: patch,
    });

  return NextResponse.json({ ok: true });
}
