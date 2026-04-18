import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, doctors } from "@doktori/db";
import { generateSlug } from "@doktori/shared";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { createAdminNotification } from "@/lib/admin-notifications";

const DEFAULT_PASSWORD = "DoktoriTemp2026!";

type ImportRow = {
  name?: string;
  email?: string;
  phone?: string;
  specialty?: string;
  city?: string;
  address?: string;
};

type RowError = { row: number; error: string };

function validateRow(row: ImportRow, index: number): string | null {
  if (!row.name?.trim()) return `Ligne ${index + 1}: nom requis`;
  if (!row.email?.trim()) return `Ligne ${index + 1}: email requis`;
  if (!row.phone?.trim()) return `Ligne ${index + 1}: téléphone requis`;
  if (!row.specialty?.trim()) return `Ligne ${index + 1}: spécialité requise`;
  if (!row.city?.trim()) return `Ligne ${index + 1}: ville requise`;
  if (!row.address?.trim()) return `Ligne ${index + 1}: adresse requise`;

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(row.email.trim())) {
    return `Ligne ${index + 1}: email invalide`;
  }

  return null;
}

export async function POST(req: Request) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  let rows: ImportRow[];
  try {
    rows = await req.json();
    if (!Array.isArray(rows)) throw new Error("JSON array attendu");
  } catch {
    return NextResponse.json({ error: "Corps invalide — JSON array attendu" }, { status: 400 });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "Aucune ligne à importer" }, { status: 400 });
  }
  if (rows.length > 500) {
    return NextResponse.json({ error: "Maximum 500 médecins par import" }, { status: 400 });
  }

  // Validate all rows before inserting any
  const validationErrors: RowError[] = [];
  for (let i = 0; i < rows.length; i++) {
    const err = validateRow(rows[i], i);
    if (err) validationErrors.push({ row: i + 1, error: err });
  }
  if (validationErrors.length > 0) {
    return NextResponse.json({ imported: 0, errors: validationErrors }, { status: 422 });
  }

  const passwordHash = await hash(DEFAULT_PASSWORD, 12);
  let imported = 0;
  const errors: RowError[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const email = row.email!.trim().toLowerCase();

    try {
      // Skip duplicates
      const [existing] = await db
        .select({ id: doctors.id })
        .from(doctors)
        .where(eq(doctors.email, email))
        .limit(1);

      if (existing) {
        errors.push({ row: i + 1, error: `Email déjà utilisé : ${email}` });
        continue;
      }

      const slug = generateSlug(row.name!.trim(), row.specialty!.trim(), row.city!.trim());

      await db.insert(doctors).values({
        name: row.name!.trim(),
        slug,
        email,
        passwordHash,
        phone: row.phone!.trim(),
        specialty: row.specialty!.trim(),
        city: row.city!.trim(),
        address: row.address!.trim(),
        isActive: false, // require admin activation
      });

      imported++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      errors.push({ row: i + 1, error: msg });
    }
  }

  if (imported > 0) {
    createAdminNotification({
      type: "new_doctor",
      title: `Import en masse : ${imported} médecin(s) ajouté(s)`,
      link: "/admin/medecins",
    }).catch(console.error);
  }

  const meta = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "doctors.bulk_import",
    resourceType: "doctors",
    resourceId: null,
    before: null,
    after: { imported, errors: errors.length, total: rows.length },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ imported, errors });
}
