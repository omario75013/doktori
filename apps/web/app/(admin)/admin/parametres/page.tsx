import { requireAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { db, platformSettings } from "@doktori/db";
import { asc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { SettingsPanel } from "./settings-panel";

export const dynamic = "force-dynamic";

export default async function AdminParametresPage() {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) redirect("/admin");

  const rows = await db.select().from(platformSettings).orderBy(asc(platformSettings.category), asc(platformSettings.key));

  // Mask secrets before passing to client
  const masked = rows.map((row) => ({
    ...row,
    value: row.type === "secret" ? maskSecret(row.value) : row.value,
    options: row.options as string[] | null,
    updatedAt: row.updatedAt.toISOString(),
  }));

  // Group by category
  const grouped: Record<string, typeof masked> = {};
  for (const row of masked) {
    if (!grouped[row.category]) grouped[row.category] = [];
    grouped[row.category].push(row);
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Paramètres de la plateforme</h1>
        <p className="text-slate-500 mt-1">
          Configuration globale — modifications appliquées immédiatement
        </p>
      </div>
      <SettingsPanel settings={grouped} />
    </div>
  );
}

function maskSecret(value: string): string {
  if (!value) return "";
  if (value.length <= 4) return "••••";
  return `••••••••${value.slice(-4)}`;
}
