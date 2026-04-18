import { NextRequest, NextResponse } from "next/server";
import { db, reviews, appointments, patients, doctors } from "@doktori/db";
import { eq, and, desc } from "drizzle-orm";
import { getPatientFromRequest } from "@/lib/patient-auth";
import { recomputeDoctorRating } from "@/lib/doctor-rating";
import { createAdminNotification } from "@/lib/admin-notifications";

// Only published reviews are exposed on public pages; pending/rejected are hidden
// until an admin moderates them via /admin/reviews.

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const doctorId = searchParams.get("doctorId");
  if (!doctorId) return NextResponse.json({ error: "doctorId requis" }, { status: 400 });

  const results = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      verified: reviews.verified,
      createdAt: reviews.createdAt,
      patientName: patients.name,
    })
    .from(reviews)
    .innerJoin(patients, eq(reviews.patientId, patients.id))
    .where(and(eq(reviews.doctorId, doctorId), eq(reviews.status, "published")))
    .orderBy(desc(reviews.createdAt))
    .limit(50);

  // Compute aggregate stats
  const count = results.length;
  const avg = count === 0 ? 0 : results.reduce((sum, r) => sum + r.rating, 0) / count;

  return NextResponse.json({
    reviews: results,
    stats: { count, average: Math.round(avg * 10) / 10 },
  });
}

export async function POST(req: NextRequest) {
  // Auth check first — before any DB work
  const patientAuth = getPatientFromRequest(req);
  if (!patientAuth) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json();
  const { appointmentId, rating, comment } = body;

  if (!appointmentId || typeof rating !== "number" || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "appointmentId et rating (1-5) requis" }, { status: 400 });
  }

  // Verify the appointment exists and is completed
  const [appt] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, appointmentId))
    .limit(1);

  if (!appt) return NextResponse.json({ error: "Rendez-vous introuvable" }, { status: 404 });
  if (appt.status !== "completed") {
    return NextResponse.json({ error: "Vous pouvez laisser un avis uniquement après une consultation terminée" }, { status: 400 });
  }

  // Verify caller owns this specific appointment
  if (patientAuth.id !== appt.patientId) {
    return NextResponse.json({ error: "Ce rendez-vous ne vous appartient pas" }, { status: 403 });
  }

  // Check if already reviewed
  const [existing] = await db
    .select()
    .from(reviews)
    .where(eq(reviews.appointmentId, appointmentId))
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: "Vous avez déjà laissé un avis pour ce rendez-vous" }, { status: 409 });
  }

  const [review] = await db
    .insert(reviews)
    .values({
      doctorId: appt.doctorId,
      patientId: appt.patientId,
      appointmentId,
      rating,
      comment: comment || null,
      verified: true,
      status: "pending",
    })
    .returning();

  // Notify admin of pending review (fire-and-forget)
  createAdminNotification({
    type: "review_pending",
    title: "Nouvel avis à modérer",
    link: "/admin/reviews",
  }).catch(console.error);

  // Fire-and-forget: recompute doctor's average rating without blocking the response
  recomputeDoctorRating(appt.doctorId).catch(console.error);

  return NextResponse.json(review, { status: 201 });
}
