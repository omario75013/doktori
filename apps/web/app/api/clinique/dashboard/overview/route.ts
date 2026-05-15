import { NextResponse } from "next/server";
import {
  db,
  appointments,
  doctors,
  patients,
  clinics,
  clinicDoctors,
  cnamClaims,
  clinicInvitations,
  patientDocuments,
  doctorDaysOff,
  labOrders,
  labs,
} from "@doktori/db";
import {
  eq,
  and,
  inArray,
  gte,
  lte,
  lt,
  sql,
  count,
  sum,
  isNotNull,
  isNull,
  ne,
} from "drizzle-orm";
// Note: isNotNull already imported above
import { requireClinic } from "@/lib/clinic-auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Safe wrapper — returns fallback on any error
async function safe<T>(fn: () => Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[dashboard/overview] ${label} failed:`, err);
    return fallback;
  }
}

// db.execute() returns a RowList which is array-like (no .rows property).
// Cast to unknown[] for typed access.
type AnyRow = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export async function GET() {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const lastWeekStart = startOfDay(addDays(now, -7));
  const lastWeekEnd = endOfDay(addDays(now, -7));
  const yesterdayStart = startOfDay(addDays(now, -1));
  const yesterdayEnd = endOfDay(addDays(now, -1));
  const thirtyDaysAgo = startOfDay(addDays(now, -29));
  const sevenDaysAgo = startOfDay(addDays(now, -6));

  // ── Resolve clinic info & doctor IDs ──────────────────────────────────────
  const [clinicRow, clinicDoctorRows] = await Promise.all([
    db.select().from(clinics).where(eq(clinics.id, clinic.id)).limit(1),
    db
      .select({ doctorId: clinicDoctors.doctorId })
      .from(clinicDoctors)
      .where(eq(clinicDoctors.clinicId, clinic.id)),
  ]);

  const clinicData = clinicRow[0];
  if (!clinicData) {
    return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
  }

  const allDoctorIds = clinicDoctorRows.map((r) => r.doctorId);
  // Inline UUID array literal — drizzle's sql template splats JS arrays into a
  // ($1,$2,...) tuple which is not a uuid[]. IDs come from DB so embedding is safe.
  const doctorIdsArr = sql.raw(
    `ARRAY[${allDoctorIds.map((id) => `'${id}'::uuid`).join(",")}]`,
  );

  // Empty clinic guard — still return valid shape
  if (allDoctorIds.length === 0) {
    return NextResponse.json(buildEmptyPayload(clinicData));
  }

  // ── Run all sections concurrently (fail-soft per section) ─────────────────

  const [
    kpiRdvToday,
    kpiRdvLastWeek,
    kpiNoShow30d,
    kpiTotal30d,
    kpiAvgWaitToday,
    kpiRevenueToday,
    kpiRevenueYesterday,
    kpiCnam,
    kpiNewPatientsToday,
    kpiNewPatientsLastWeek,
    pipeline,
    inboxLabs,
    inboxCnamRejected,
    inboxInvites,
    inboxDocs,
    inboxLabsAwaiting,
    alertsBirthdays,
    alertsDoctorsLate,
    alertsDoctorsOff,
    rdv7dRows,
    revenue30dRows,
    topMotifsRows,
    occupancyRows,
    doctorRows,
    forecastRows,
  ] = await Promise.all([
    // KPI: RDV today
    safe(
      () =>
        db
          .select({ cnt: count() })
          .from(appointments)
          .where(
            and(
              inArray(appointments.doctorId, allDoctorIds),
              gte(appointments.startsAt, todayStart),
              lte(appointments.startsAt, todayEnd),
              ne(appointments.status, "cancelled"),
            ),
          ),
      [{ cnt: 0 }],
      "kpiRdvToday",
    ),

    // KPI: RDV same weekday last week
    safe(
      () =>
        db
          .select({ cnt: count() })
          .from(appointments)
          .where(
            and(
              inArray(appointments.doctorId, allDoctorIds),
              gte(appointments.startsAt, lastWeekStart),
              lte(appointments.startsAt, lastWeekEnd),
              ne(appointments.status, "cancelled"),
            ),
          ),
      [{ cnt: 0 }],
      "kpiRdvLastWeek",
    ),

    // KPI: no-show count last 30d
    safe(
      () =>
        db
          .select({ cnt: count() })
          .from(appointments)
          .where(
            and(
              inArray(appointments.doctorId, allDoctorIds),
              gte(appointments.startsAt, thirtyDaysAgo),
              eq(appointments.status, "no_show"),
            ),
          ),
      [{ cnt: 0 }],
      "kpiNoShow30d",
    ),

    // KPI: total appointments (non-cancelled) last 30d for no-show rate denominator
    safe(
      () =>
        db
          .select({ cnt: count() })
          .from(appointments)
          .where(
            and(
              inArray(appointments.doctorId, allDoctorIds),
              gte(appointments.startsAt, thirtyDaysAgo),
              ne(appointments.status, "cancelled"),
            ),
          ),
      [{ cnt: 0 }],
      "kpiTotal30d",
    ),

    // KPI: avg wait minutes today (checked-in, not yet completed)
    safe(
      () =>
        db
          .select({ checkedInAt: appointments.checkedInAt })
          .from(appointments)
          .where(
            and(
              inArray(appointments.doctorId, allDoctorIds),
              gte(appointments.startsAt, todayStart),
              lte(appointments.startsAt, todayEnd),
              isNotNull(appointments.checkedInAt),
              ne(appointments.status, "completed"),
              ne(appointments.status, "cancelled"),
            ),
          )
          .limit(50),
      [] as { checkedInAt: Date | null }[],
      "kpiAvgWait",
    ),

    // KPI: revenue today (completed appointments)
    safe(
      () =>
        db
          .select({ total: sum(appointments.paymentAmount) })
          .from(appointments)
          .where(
            and(
              inArray(appointments.doctorId, allDoctorIds),
              gte(appointments.startsAt, todayStart),
              lte(appointments.startsAt, todayEnd),
              eq(appointments.status, "completed"),
            ),
          ),
      [{ total: null as string | null }],
      "kpiRevenueToday",
    ),

    // KPI: revenue yesterday (for delta)
    safe(
      () =>
        db
          .select({ total: sum(appointments.paymentAmount) })
          .from(appointments)
          .where(
            and(
              inArray(appointments.doctorId, allDoctorIds),
              gte(appointments.startsAt, yesterdayStart),
              lte(appointments.startsAt, yesterdayEnd),
              eq(appointments.status, "completed"),
            ),
          ),
      [{ total: null as string | null }],
      "kpiRevenueYesterday",
    ),

    // KPI: CNAM pending/submitted
    safe(
      () =>
        db
          .select({ cnt: count(), total: sum(cnamClaims.amount) })
          .from(cnamClaims)
          .where(
            and(
              inArray(cnamClaims.doctorId, allDoctorIds),
              inArray(cnamClaims.status, ["pending", "submitted"]),
            ),
          ),
      [{ cnt: 0, total: null as string | null }],
      "kpiCnam",
    ),

    // KPI: new patients today (first-ever appointment with any clinic doctor today)
    safe(
      async () => {
        const rows = (await db.execute(
          sql`
          SELECT COUNT(DISTINCT a.patient_id) AS cnt
          FROM appointments a
          WHERE a.doctor_id = ANY(${doctorIdsArr})
            AND date_trunc('day', a.starts_at AT TIME ZONE 'Africa/Tunis') = date_trunc('day', NOW() AT TIME ZONE 'Africa/Tunis')
            AND a.status != 'cancelled'
            AND NOT EXISTS (
              SELECT 1 FROM appointments a2
              WHERE a2.patient_id = a.patient_id
                AND a2.doctor_id = ANY(${doctorIdsArr})
                AND a2.starts_at < date_trunc('day', NOW() AT TIME ZONE 'Africa/Tunis')
                AND a2.status != 'cancelled'
            )
        `,
        )) as unknown as AnyRow[];
        return rows;
      },
      [] as AnyRow[],
      "kpiNewPatientsToday",
    ),

    // KPI: new patients same weekday last week
    safe(
      async () => {
        const rows = (await db.execute(
          sql`
          SELECT COUNT(DISTINCT a.patient_id) AS cnt
          FROM appointments a
          WHERE a.doctor_id = ANY(${doctorIdsArr})
            AND date_trunc('day', a.starts_at AT TIME ZONE 'Africa/Tunis') = date_trunc('day', (NOW() - INTERVAL '7 days') AT TIME ZONE 'Africa/Tunis')
            AND a.status != 'cancelled'
            AND NOT EXISTS (
              SELECT 1 FROM appointments a2
              WHERE a2.patient_id = a.patient_id
                AND a2.doctor_id = ANY(${doctorIdsArr})
                AND a2.starts_at < date_trunc('day', (NOW() - INTERVAL '7 days') AT TIME ZONE 'Africa/Tunis')
                AND a2.status != 'cancelled'
            )
        `,
        )) as unknown as AnyRow[];
        return rows;
      },
      [] as AnyRow[],
      "kpiNewPatientsLastWeek",
    ),

    // Pipeline: today's appointment status split
    safe(
      () =>
        db
          .select({
            status: appointments.status,
            checkedInAt: appointments.checkedInAt,
            startsAt: appointments.startsAt,
          })
          .from(appointments)
          .where(
            and(
              inArray(appointments.doctorId, allDoctorIds),
              gte(appointments.startsAt, todayStart),
              lte(appointments.startsAt, todayEnd),
              ne(appointments.status, "cancelled"),
              ne(appointments.status, "no_show"),
            ),
          ),
      [] as { status: string; checkedInAt: Date | null; startsAt: Date }[],
      "pipeline",
    ),

    // Inbox: lab orders with result ready (completed)
    safe(
      () =>
        db
          .select({ cnt: count() })
          .from(labOrders)
          .where(
            and(
              inArray(labOrders.doctorId, allDoctorIds),
              eq(labOrders.status, "completed"),
            ),
          ),
      [{ cnt: 0 }],
      "inboxLabs",
    ),

    // Inbox: CNAM rejected last 30d
    safe(
      () =>
        db
          .select({ cnt: count() })
          .from(cnamClaims)
          .where(
            and(
              inArray(cnamClaims.doctorId, allDoctorIds),
              eq(cnamClaims.status, "rejected"),
              gte(cnamClaims.createdAt, thirtyDaysAgo),
            ),
          ),
      [{ cnt: 0 }],
      "inboxCnamRejected",
    ),

    // Inbox: pending invitations
    safe(
      () =>
        db
          .select({ cnt: count() })
          .from(clinicInvitations)
          .where(
            and(
              eq(clinicInvitations.clinicId, clinic.id),
              eq(clinicInvitations.status, "pending"),
              gte(clinicInvitations.expiresAt, now),
            ),
          ),
      [{ cnt: 0 }],
      "inboxInvites",
    ),

    // Inbox: docs to validate (lab-uploaded patient docs in last 7 days)
    safe(
      () =>
        db
          .select({ cnt: count() })
          .from(patientDocuments)
          .where(
            and(
              eq(patientDocuments.uploadedBy, "lab"),
              gte(patientDocuments.createdAt, sevenDaysAgo),
            ),
          ),
      [{ cnt: 0 }],
      "inboxDocs",
    ),

    // Inbox: in-house labs awaiting results (pending/in_progress)
    safe(
      async () => {
        const inHouseLabs = await db
          .select({ id: labs.id })
          .from(labs)
          .where(and(isNotNull(labs.clinicId), eq(labs.clinicId, clinic.id)));
        const inHouseLabIds = inHouseLabs.map((l) => l.id);
        if (inHouseLabIds.length === 0) return [{ cnt: 0 }];
        return db
          .select({ cnt: count() })
          .from(labOrders)
          .where(
            and(
              inArray(labOrders.labId, inHouseLabIds),
              inArray(labOrders.status, ["pending", "in_progress"]),
            ),
          );
      },
      [{ cnt: 0 }],
      "inboxLabsAwaiting",
    ),

    // Alerts: birthdays today
    safe(
      async () => {
        const rows = (await db.execute(
          sql`
          SELECT DISTINCT p.id, p.name,
            EXTRACT(YEAR FROM NOW()) - EXTRACT(YEAR FROM p.date_of_birth::date) AS age
          FROM patients p
          INNER JOIN appointments a ON a.patient_id = p.id
          WHERE a.doctor_id = ANY(${doctorIdsArr})
            AND p.date_of_birth IS NOT NULL
            AND TO_CHAR(p.date_of_birth::date, 'MM-DD') = TO_CHAR(NOW(), 'MM-DD')
          LIMIT 10
        `,
        )) as unknown as AnyRow[];
        return rows;
      },
      [] as AnyRow[],
      "alertsBirthdays",
    ),

    // Alerts: doctors running late (scheduled RDV started >15min ago, still confirmed, not checked-in)
    safe(
      async () => {
        const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000);
        const rows = await db
          .select({
            doctorId: appointments.doctorId,
            startsAt: appointments.startsAt,
          })
          .from(appointments)
          .where(
            and(
              inArray(appointments.doctorId, allDoctorIds),
              gte(appointments.startsAt, todayStart),
              lt(appointments.startsAt, fifteenMinAgo),
              eq(appointments.status, "confirmed"),
              isNull(appointments.checkedInAt),
            ),
          );

        // Group by doctor, find max lateness
        const byDoctor = new Map<string, number>();
        for (const r of rows) {
          const minutesLate = Math.floor((now.getTime() - r.startsAt.getTime()) / 60000);
          const cur = byDoctor.get(r.doctorId) ?? 0;
          if (minutesLate > cur) byDoctor.set(r.doctorId, minutesLate);
        }
        return byDoctor;
      },
      new Map<string, number>(),
      "alertsDoctorsLate",
    ),

    // Alerts: doctors off today
    safe(
      () =>
        db
          .select({ doctorId: doctorDaysOff.doctorId })
          .from(doctorDaysOff)
          .where(
            and(
              inArray(doctorDaysOff.doctorId, allDoctorIds),
              lte(doctorDaysOff.startDate, dateStr(todayStart)),
              gte(doctorDaysOff.endDate, dateStr(todayStart)),
            ),
          ),
      [] as { doctorId: string }[],
      "alertsDoctorsOff",
    ),

    // Mini-chart: RDV last 7 days
    safe(
      async () => {
        return (await db.execute(
          sql`
          SELECT
            date_trunc('day', starts_at AT TIME ZONE 'Africa/Tunis')::date AS day,
            COUNT(*) AS cnt
          FROM appointments
          WHERE doctor_id = ANY(${doctorIdsArr})
            AND starts_at >= ${sevenDaysAgo}
            AND status != 'cancelled'
          GROUP BY 1
          ORDER BY 1
        `,
        )) as unknown as AnyRow[];
      },
      [] as AnyRow[],
      "rdv7d",
    ),

    // Mini-chart: revenue last 30 days
    safe(
      async () => {
        return (await db.execute(
          sql`
          SELECT
            date_trunc('day', starts_at AT TIME ZONE 'Africa/Tunis')::date AS day,
            COALESCE(SUM(payment_amount), 0) AS total
          FROM appointments
          WHERE doctor_id = ANY(${doctorIdsArr})
            AND starts_at >= ${thirtyDaysAgo}
            AND status = 'completed'
          GROUP BY 1
          ORDER BY 1
        `,
        )) as unknown as AnyRow[];
      },
      [] as AnyRow[],
      "revenue30d",
    ),

    // Mini-chart: top motifs
    safe(
      async () => {
        return (await db.execute(
          sql`
          SELECT
            LOWER(TRIM(reason)) AS motif,
            COUNT(*) AS cnt
          FROM appointments
          WHERE doctor_id = ANY(${doctorIdsArr})
            AND starts_at >= ${thirtyDaysAgo}
            AND reason IS NOT NULL
            AND TRIM(reason) != ''
            AND status != 'cancelled'
          GROUP BY 1
          ORDER BY cnt DESC
          LIMIT 5
        `,
        )) as unknown as AnyRow[];
      },
      [] as AnyRow[],
      "topMotifs",
    ),

    // Occupancy: this week appointments by (doctorId, weekday, hour)
    safe(
      async () => {
        const weekStart = startOfDay(addDays(now, -((now.getDay() + 6) % 7))); // Mon
        const weekEnd = endOfDay(addDays(weekStart, 6)); // Sun
        return (await db.execute(
          sql`
          SELECT
            doctor_id,
            EXTRACT(DOW FROM starts_at AT TIME ZONE 'Africa/Tunis') AS dow,
            EXTRACT(HOUR FROM starts_at AT TIME ZONE 'Africa/Tunis') AS hour,
            COUNT(*) AS cnt
          FROM appointments
          WHERE doctor_id = ANY(${doctorIdsArr})
            AND starts_at >= ${weekStart}
            AND starts_at <= ${weekEnd}
            AND status != 'cancelled'
          GROUP BY 1, 2, 3
        `,
        )) as unknown as AnyRow[];
      },
      [] as AnyRow[],
      "occupancy",
    ),

    // Doctor rows (name + specialty)
    safe(
      () =>
        db
          .select({ id: doctors.id, name: doctors.name, specialty: doctors.specialty })
          .from(doctors)
          .where(inArray(doctors.id, allDoctorIds)),
      [] as { id: string; name: string; specialty: string }[],
      "doctorRows",
    ),

    // Forecast: next 7 days confirmed appointments
    safe(
      async () => {
        return (await db.execute(
          sql`
          SELECT COUNT(*) AS cnt,
            COALESCE(SUM(COALESCE(a.payment_amount, d.consultation_fee, 0)), 0) AS revenue_est
          FROM appointments a
          INNER JOIN doctors d ON d.id = a.doctor_id
          WHERE a.doctor_id = ANY(${doctorIdsArr})
            AND a.starts_at >= NOW()
            AND a.starts_at <= NOW() + INTERVAL '7 days'
            AND a.status IN ('confirmed', 'pending')
        `,
        )) as unknown as AnyRow[];
      },
      [] as AnyRow[],
      "forecast",
    ),
  ]);

  // ── Post-process ───────────────────────────────────────────────────────────

  // KPIs
  const rdvTodayVal = Number(kpiRdvToday[0]?.cnt ?? 0);
  const rdvLastWeekVal = Number(kpiRdvLastWeek[0]?.cnt ?? 0);

  const noShowCount = Number(kpiNoShow30d[0]?.cnt ?? 0);
  const total30dCount = Number(kpiTotal30d[0]?.cnt ?? 0);
  const noShowRate = total30dCount > 0 ? Math.round((noShowCount / total30dCount) * 100) : 0;
  // TODO: store historical no-show rate for trend direction
  const noShowTrend: "up" | "down" | "flat" = "flat";

  // Avg wait minutes: compute from checkedInAt rows
  const waitRows = kpiAvgWaitToday;
  const avgWait =
    waitRows.length > 0
      ? Math.round(
          waitRows.reduce((acc, r) => {
            const mins = r.checkedInAt
              ? (now.getTime() - new Date(r.checkedInAt).getTime()) / 60000
              : 0;
            return acc + mins;
          }, 0) / waitRows.length,
        )
      : 0;

  // Revenue
  const revTodayMillimes = Number(kpiRevenueToday[0]?.total ?? 0);
  const revYesterdayMillimes = Number(kpiRevenueYesterday[0]?.total ?? 0);
  const revDeltaPct =
    revYesterdayMillimes > 0
      ? Math.round(((revTodayMillimes - revYesterdayMillimes) / revYesterdayMillimes) * 100)
      : 0;

  // CNAM
  const cnamCount = Number(kpiCnam[0]?.cnt ?? 0);
  const cnamTotal = Number(kpiCnam[0]?.total ?? 0);

  // New patients
  const newPatientsToday = Number(kpiNewPatientsToday[0]?.cnt ?? 0);
  const newPatientsLastWeek = Number(kpiNewPatientsLastWeek[0]?.cnt ?? 0);

  // Pipeline
  let attendus = 0;
  let arrives = 0;
  let enConsultation = 0;
  let termines = 0;
  for (const r of pipeline) {
    if (r.status === "completed") {
      termines++;
    } else if (r.checkedInAt) {
      if (new Date(r.startsAt) <= now) {
        enConsultation++;
      } else {
        arrives++;
      }
    } else {
      attendus++;
    }
  }

  // Inbox
  const labsUnread = Number(inboxLabs[0]?.cnt ?? 0);
  const cnamRejected = Number(inboxCnamRejected[0]?.cnt ?? 0);
  const pendingInvites = Number(inboxInvites[0]?.cnt ?? 0);
  const docsToValidate = Number(inboxDocs[0]?.cnt ?? 0);
  const labsAwaitingResults = Number(
    Array.isArray(inboxLabsAwaiting) && inboxLabsAwaiting[0]
      ? (inboxLabsAwaiting[0] as { cnt: number }).cnt
      : 0
  );

  // Alerts: birthdays
  const birthdaysToday = alertsBirthdays.map((r) => ({
    patientId: String(r.id ?? ""),
    name: String(r.name ?? ""),
    age: Math.round(Number(r.age ?? 0)),
  }));

  // Alerts: doctors late — need doctor names
  const doctorMap = new Map(doctorRows.map((d) => [d.id, d]));
  const doctorsRunningLate = [...(alertsDoctorsLate as Map<string, number>).entries()]
    .filter(([, mins]) => mins >= 15)
    .map(([doctorId, minutesLate]) => ({
      doctorId,
      name: doctorMap.get(doctorId)?.name ?? "Dr.",
      minutesLate,
    }));

  // Alerts: doctors off today
  const doctorOffIds = new Set(alertsDoctorsOff.map((r) => r.doctorId));
  const doctorsOffToday = [...doctorOffIds].map((id) => ({
    doctorId: id,
    name: doctorMap.get(id)?.name ?? "Dr.",
  }));

  // Mini-charts: RDV 7d — fill missing days
  const rdv7dMap = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    rdv7dMap.set(dateStr(addDays(now, -i)), 0);
  }
  for (const r of rdv7dRows) {
    const raw = r.day;
    const d = typeof raw === "string" ? raw.slice(0, 10) : dateStr(new Date(raw as unknown as string));
    rdv7dMap.set(d, Number(r.cnt ?? 0));
  }
  const rdv7d = [...rdv7dMap.entries()].map(([date, c]) => ({ date, count: c }));

  // Mini-charts: revenue 30d — fill missing days
  const rev30dMap = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    rev30dMap.set(dateStr(addDays(now, -i)), 0);
  }
  for (const r of revenue30dRows) {
    const raw = r.day;
    const d = typeof raw === "string" ? raw.slice(0, 10) : dateStr(new Date(raw as unknown as string));
    rev30dMap.set(d, Number(r.total ?? 0));
  }
  const revenue30d = [...rev30dMap.entries()].map(([date, v]) => ({ date, valueMillimes: v }));

  // Mini-charts: top motifs
  const motifTotal = topMotifsRows.reduce((acc, r) => acc + Number(r.cnt ?? 0), 0);
  const topMotifs = topMotifsRows.map((r) => ({
    motif: String(r.motif ?? ""),
    count: Number(r.cnt ?? 0),
    pct: motifTotal > 0 ? Math.round((Number(r.cnt ?? 0) / motifTotal) * 100) : 0,
  }));

  // Occupancy heatmap
  // DOW from postgres: 0=Sun, 1=Mon…6=Sat → remap to 0=Mon..6=Sun
  function pgDowToMon(pgDow: number): number {
    return pgDow === 0 ? 6 : pgDow - 1;
  }

  const CAPACITY_PER_HOUR = 2; // 30-min slots
  const WORK_HOURS = 10; // 8:00–18:00

  const occByDoctor = new Map<string, Map<string, { bookedCount: number; capacity: number }>>();
  for (const r of occupancyRows) {
    const did = String(r.doctor_id ?? "");
    const day = pgDowToMon(Number(r.dow ?? 0));
    const hour = Number(r.hour ?? 0);
    if (hour < 8 || hour > 18) continue;
    if (!occByDoctor.has(did)) occByDoctor.set(did, new Map());
    const key = `${day}-${hour}`;
    occByDoctor.get(did)!.set(key, {
      bookedCount: Number(r.cnt ?? 0),
      capacity: CAPACITY_PER_HOUR,
    });
  }

  // Today weekday (0=Mon)
  const todayDow = (now.getDay() + 6) % 7;

  const occupancyDoctors = allDoctorIds.map((doctorId) => {
    const docInfo = doctorMap.get(doctorId);
    const cellMap = occByDoctor.get(doctorId) ?? new Map();
    const cells: { day: number; hour: number; bookedCount: number; capacity: number }[] = [];

    for (let day = 0; day <= 6; day++) {
      for (let hour = 8; hour <= 18; hour++) {
        const key = `${day}-${hour}`;
        const cell = cellMap.get(key);
        if (cell) {
          cells.push({ day, hour, bookedCount: cell.bookedCount, capacity: cell.capacity });
        }
      }
    }

    // Today's pct: booked in today's column / (WORK_HOURS * CAPACITY_PER_HOUR)
    let todayBooked = 0;
    for (let hour = 8; hour <= 18; hour++) {
      const cell = cellMap.get(`${todayDow}-${hour}`);
      if (cell) todayBooked += cell.bookedCount;
    }
    const todayPct = Math.min(1, todayBooked / (WORK_HOURS * CAPACITY_PER_HOUR));

    return {
      doctorId,
      name: docInfo?.name ?? "Dr.",
      specialty: docInfo?.specialty ?? "",
      cells,
      todayPct: Math.round(todayPct * 100) / 100,
    };
  });

  // Forecast
  const forecastRow = forecastRows[0];
  const forecastRdv = Number(forecastRow?.cnt ?? 0);
  const forecastRevenue = Number(forecastRow?.revenue_est ?? 0);

  // ── Build response ─────────────────────────────────────────────────────────
  return NextResponse.json({
    clinic: {
      id: clinicData.id,
      name: clinicData.name,
      city: clinicData.city,
      plan: clinicData.plan,
      slug: clinicData.slug,
    },
    generatedAt: now.toISOString(),
    kpis: {
      rdvToday: {
        value: rdvTodayVal,
        deltaVsLastWeek: rdvTodayVal - rdvLastWeekVal,
      },
      noShowRate: {
        value: noShowRate,
        target: 5,
        trend: noShowTrend,
      },
      avgWaitMinutes: {
        value: avgWait,
        deltaVsYesterday: 0, // TODO: store historical for comparison
      },
      revenueToday: {
        valueMillimes: revTodayMillimes,
        deltaPct: revDeltaPct,
      },
      cnamPending: {
        count: cnamCount,
        totalMillimes: cnamTotal,
      },
      newPatientsToday: {
        value: newPatientsToday,
        deltaVsLastWeek: newPatientsToday - newPatientsLastWeek,
      },
    },
    pipeline: {
      attendus,
      arrives,
      enConsultation,
      termines,
    },
    inbox: {
      labsUnread,
      cnamRejected,
      pendingInvites,
      docsToValidate,
      labsAwaitingResults,
    },
    alerts: {
      birthdaysToday,
      doctorsRunningLate,
      smsCreditLow: false, // TODO: wire to SMS credit balance when available
      doctorsOffToday,
    },
    miniCharts: {
      rdv7d,
      revenue30d,
      topMotifs,
    },
    occupancy: {
      doctors: occupancyDoctors,
    },
    forecast: {
      rdvConfirmed: forecastRdv,
      revenueEstMillimes: forecastRevenue,
    },
  });
}

// ---------------------------------------------------------------------------
// Empty payload (no doctors yet)
// ---------------------------------------------------------------------------

function buildEmptyPayload(clinicData: {
  id: string;
  name: string;
  city: string;
  plan: string;
  slug: string;
}) {
  return {
    clinic: {
      id: clinicData.id,
      name: clinicData.name,
      city: clinicData.city,
      plan: clinicData.plan,
      slug: clinicData.slug,
    },
    generatedAt: new Date().toISOString(),
    kpis: {
      rdvToday: { value: 0, deltaVsLastWeek: 0 },
      noShowRate: { value: 0, target: 5, trend: "flat" as const },
      avgWaitMinutes: { value: 0, deltaVsYesterday: 0 },
      revenueToday: { valueMillimes: 0, deltaPct: 0 },
      cnamPending: { count: 0, totalMillimes: 0 },
      newPatientsToday: { value: 0, deltaVsLastWeek: 0 },
    },
    pipeline: { attendus: 0, arrives: 0, enConsultation: 0, termines: 0 },
    inbox: { labsUnread: 0, cnamRejected: 0, pendingInvites: 0, docsToValidate: 0, labsAwaitingResults: 0 },
    alerts: {
      birthdaysToday: [] as { patientId: string; name: string; age: number }[],
      doctorsRunningLate: [] as { doctorId: string; name: string; minutesLate: number }[],
      smsCreditLow: false,
      doctorsOffToday: [] as { doctorId: string; name: string }[],
    },
    miniCharts: {
      rdv7d: [] as { date: string; count: number }[],
      revenue30d: [] as { date: string; valueMillimes: number }[],
      topMotifs: [] as { motif: string; count: number; pct: number }[],
    },
    occupancy: { doctors: [] },
    forecast: { rdvConfirmed: 0, revenueEstMillimes: 0 },
  };
}
