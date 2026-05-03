import { db, prescriptionTemplates } from "@doktori/db";
import { isNull, and, eq, desc, sql } from "drizzle-orm";
import { getAdminSession } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, FileText, Pencil, Eye } from "lucide-react";
import { AdminTemplatesActions } from "./templates-actions";

export const dynamic = "force-dynamic";

export default async function AdminTemplatesPage() {
  const admin = await getAdminSession();
  if (!admin || admin.role !== "super_admin") redirect("/admin");

  const rows = await db
    .select({
      id: prescriptionTemplates.id,
      title: prescriptionTemplates.title,
      description: prescriptionTemplates.description,
      language: prescriptionTemplates.language,
      slug: prescriptionTemplates.slug,
      isOfficial: prescriptionTemplates.isOfficial,
      doctorId: prescriptionTemplates.doctorId,
      applyCount: prescriptionTemplates.applyCount,
      cloneCount: prescriptionTemplates.cloneCount,
      version: prescriptionTemplates.version,
      updatedAt: prescriptionTemplates.updatedAt,
    })
    .from(prescriptionTemplates)
    .where(isNull(prescriptionTemplates.deletedAt))
    .orderBy(desc(prescriptionTemplates.isOfficial), desc(prescriptionTemplates.updatedAt));

  const official = rows.filter((r) => r.isOfficial);
  const personal = rows.filter((r) => !r.isOfficial);

  const [{ totalApply }] = await db
    .select({ totalApply: sql<number>`coalesce(sum(apply_count),0)::int` })
    .from(prescriptionTemplates)
    .where(and(isNull(prescriptionTemplates.deletedAt), eq(prescriptionTemplates.isOfficial, true)));

  const [{ totalClone }] = await db
    .select({ totalClone: sql<number>`coalesce(sum(clone_count),0)::int` })
    .from(prescriptionTemplates)
    .where(and(isNull(prescriptionTemplates.deletedAt), eq(prescriptionTemplates.isOfficial, true)));

  return (
    <div className="p-4 sm:p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Modèles d&apos;ordonnances</h1>
          <p className="text-slate-500 mt-1 text-sm">
            {official.length} officiel{official.length !== 1 ? "s" : ""} · {personal.length} personnel{personal.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/admin/templates/nouveau"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouveau modèle officiel
        </Link>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Modèles officiels" value={official.length} color="teal" />
        <StatCard label="Modèles personnels" value={personal.length} color="blue" />
        <StatCard label="Applications (officiels)" value={Number(totalApply)} color="green" />
        <StatCard label="Clones (officiels)" value={Number(totalClone)} color="purple" />
      </div>

      {/* Official templates table */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Modèles officiels Doktori
        </h2>
        {official.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Aucun modèle officiel. Créez le premier.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Titre</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Slug</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Lang.</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Apply</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Clone</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {official.map((t, i) => (
                  <tr
                    key={t.id}
                    className={`${i < official.length - 1 ? "border-b border-slate-100" : ""} hover:bg-slate-50 transition-colors`}
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-900">{t.title}</span>
                      {t.description && (
                        <p className="text-xs text-slate-400 truncate max-w-xs">{t.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">
                        {t.slug ?? "—"}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
                          t.language === "ar"
                            ? "bg-orange-50 text-orange-600"
                            : "bg-blue-50 text-blue-600"
                        }`}
                      >
                        {t.language.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{t.applyCount}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{t.cloneCount}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/templates/${t.id}/edit`}
                          className="inline-flex items-center gap-1 h-7 px-2 text-xs font-medium rounded-md border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                          Éditer
                        </Link>
                        <AdminTemplatesActions templateId={t.id} templateTitle={t.title} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Personal templates — read-only audit view */}
      <section>
        <h2 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Modèles personnels (lecture seule — audit)
        </h2>
        {personal.length === 0 ? (
          <p className="text-sm text-slate-400 italic">Aucun modèle personnel créé par des médecins.</p>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Titre</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Médecin ID</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Lang.</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Apply</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Cloné de</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Modifié</th>
                </tr>
              </thead>
              <tbody>
                {personal.slice(0, 100).map((t, i) => (
                  <tr
                    key={t.id}
                    className={`${i < Math.min(personal.length, 100) - 1 ? "border-b border-slate-100" : ""}`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-700">{t.title}</td>
                    <td className="px-4 py-3">
                      <code className="text-xs text-slate-400">{t.doctorId?.slice(0, 8)}…</code>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-500">{t.language.toUpperCase()}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">{t.applyCount}</td>
                    <td className="px-4 py-3 text-right text-slate-400">
                      {t.cloneCount > 0 ? `v${t.version}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400 text-xs">
                      {new Date(t.updatedAt).toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {personal.length > 100 && (
              <p className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100">
                {personal.length - 100} modèles supplémentaires non affichés.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    teal: "bg-teal-50 text-teal-700 border-teal-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  };
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color] ?? colorMap.blue}`}>
      <p className="text-2xl font-bold">{value.toLocaleString("fr-FR")}</p>
      <p className="text-xs mt-1 opacity-80">{label}</p>
    </div>
  );
}
