import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, cnamClaims, patients } from "@doktori/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";

// Monthly CSV export for the cabinet's fiduciaire / comptable.
// Columns are Tunisia-standard: date, name, CNAM number, role, amount (DT), status.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month=YYYY-MM requis" }, { status: 400 });
  }

  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();

  const rows = await db
    .select({
      consultationDate: cnamClaims.consultationDate,
      patientName: patients.name,
      cnamNumber: cnamClaims.cnamNumber,
      patientRole: cnamClaims.patientRole,
      amount: cnamClaims.amount,
      status: cnamClaims.status,
    })
    .from(cnamClaims)
    .innerJoin(patients, eq(cnamClaims.patientId, patients.id))
    .where(
      and(
        eq(cnamClaims.doctorId, session.user.id),
        gte(cnamClaims.consultationDate, `${month}-01`),
        lte(cnamClaims.consultationDate, `${month}-${String(lastDay).padStart(2, "0")}`),
      ),
    )
    .orderBy(desc(cnamClaims.consultationDate));

  const header = "Date;Patient;N° CNAM;Qualité;Montant (DT);Statut";
  const lines = rows.map((r) =>
    [
      r.consultationDate,
      r.patientName.replace(/;/g, ","),
      r.cnamNumber,
      r.patientRole === "assure" ? "Assuré" : "Ayant-droit",
      (r.amount / 1000).toFixed(3).replace(".", ","),
      r.status,
    ].join(";"),
  );
  const total = rows.reduce((s, r) => s + r.amount, 0);
  lines.push(`;;;Total;${(total / 1000).toFixed(3).replace(".", ",")};`);

  // BOM + CRLF so Excel FR opens it cleanly
  const csv = "\ufeff" + [header, ...lines].join("\r\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cnam-${month}.csv"`,
    },
  });
}
