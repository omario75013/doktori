import { NextResponse } from "next/server";
import { requireDoctor } from "@/lib/doctor-auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { generateInvoiceHTML } from "@/lib/invoice-template";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const doctor = await requireDoctor(req);
  if (doctor instanceof NextResponse) return doctor;

  const { id } = await params;

  // Fetch subscription — enforce ownership via doctor_id filter
  const subRows = await db.execute(sql`
    SELECT
      s.id,
      s.plan,
      s.status,
      s.price_millimes   AS "priceMillimes",
      s.billing_cycle    AS "billingCycle",
      s.starts_at        AS "startsAt",
      s.ends_at          AS "endsAt",
      s.created_at       AS "createdAt",
      d.name             AS "doctorName",
      d.email            AS "doctorEmail",
      d.address          AS "doctorAddress",
      d.city             AS "doctorCity"
    FROM subscriptions s
    JOIN doctors d ON d.id = s.doctor_id
    WHERE s.id = ${id}
      AND s.doctor_id = ${doctor.id}
    LIMIT 1
  `);

  type SubRow = {
    id: string;
    plan: string;
    status: string;
    priceMillimes: number;
    billingCycle: string;
    startsAt: string | null;
    endsAt: string | null;
    createdAt: string;
    doctorName: string;
    doctorEmail: string;
    doctorAddress: string | null;
    doctorCity: string | null;
  };

  const rows = subRows as unknown as SubRow[];

  if (rows.length === 0) {
    return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
  }

  const row = rows[0];

  // Only generate invoices for non-pending subscriptions
  if (row.status === "pending" || row.status === "trial") {
    return NextResponse.json(
      { error: "Aucune facture disponible pour ce statut" },
      { status: 422 }
    );
  }

  const createdAt = new Date(row.createdAt);
  const year = createdAt.getFullYear();
  // Use a deterministic short sequence derived from the UUID suffix
  const seq = row.id.slice(-4).toUpperCase();
  const invoiceNumber = `FAC-${year}-${seq}`;

  const html = generateInvoiceHTML({
    invoiceNumber,
    invoiceDate: createdAt,
    doctor: {
      name: row.doctorName,
      email: row.doctorEmail,
      address: row.doctorAddress,
      city: row.doctorCity,
    },
    subscription: {
      plan: row.plan,
      billingCycle: row.billingCycle,
      startsAt: row.startsAt ? new Date(row.startsAt) : null,
      endsAt: row.endsAt ? new Date(row.endsAt) : null,
      priceMillimes: row.priceMillimes,
    },
  });

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="facture-${invoiceNumber}.html"`,
    },
  });
}
