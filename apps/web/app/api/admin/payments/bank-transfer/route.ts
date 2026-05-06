import { NextResponse } from "next/server";
import { db, bankTransferIntents, doctors, patients } from "@doktori/db";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * GET /api/admin/payments/bank-transfer?status=pending
 *
 * Returns up to 100 bank-transfer intents matching the requested status,
 * joined with patient + doctor names for the admin UI.
 *
 * Allowed roles: super_admin, finance.
 */
export async function GET(req: Request) {
  const admin = await requireAdmin(["super_admin", "finance"]);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);
  const requested = searchParams.get("status") ?? "pending";
  const ALLOWED = ["pending", "confirmed", "rejected", "expired"] as const;
  const status = (ALLOWED as readonly string[]).includes(requested) ? requested : "pending";

  const rows = await db
    .select({
      id: bankTransferIntents.id,
      reference: bankTransferIntents.reference,
      amount: bankTransferIntents.amount,
      status: bankTransferIntents.status,
      proofFileUrl: bankTransferIntents.proofFileUrl,
      expiresAt: bankTransferIntents.expiresAt,
      createdAt: bankTransferIntents.createdAt,
      appointmentId: bankTransferIntents.appointmentId,
      doctorName: doctors.name,
      patientName: patients.name,
    })
    .from(bankTransferIntents)
    .leftJoin(doctors, eq(bankTransferIntents.doctorId, doctors.id))
    .leftJoin(patients, eq(bankTransferIntents.patientId, patients.id))
    .where(eq(bankTransferIntents.status, status))
    .orderBy(desc(bankTransferIntents.createdAt))
    .limit(100);

  return NextResponse.json({ intents: rows });
}
