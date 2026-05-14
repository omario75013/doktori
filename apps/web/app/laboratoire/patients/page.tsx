import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db, patientDocuments, patients } from "@doktori/db";
import { eq, count } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { Users } from "lucide-react";

export default async function LaboratoirePatientsPage() {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "lab") {
    redirect("/laboratoire-login");
  }
  const labId = session.user.id;
  const t = await getTranslations("laboratoire.patients");

  // Distinct patients with document count
  const rows = await db
    .select({
      patientId: patientDocuments.patientId,
      name: patients.name,
      phone: patients.phone,
      docCount: count(patientDocuments.id),
    })
    .from(patientDocuments)
    .innerJoin(patients, eq(patientDocuments.patientId, patients.id))
    .where(eq(patientDocuments.uploadedByLabId, labId))
    .groupBy(patientDocuments.patientId, patients.name, patients.phone);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
          <Users className="h-6 w-6" style={{ color: "#16A34A" }} strokeWidth={2.5} />
          {t("title")}
        </h1>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-border shadow-sm overflow-hidden">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Users className="h-10 w-10 mb-3 text-gray-200" strokeWidth={1.5} />
            <p className="font-medium text-sm">{t("empty")}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((row) => {
              const initials = row.name
                .split(" ")
                .slice(0, 2)
                .map((s: string) => s[0])
                .join("")
                .toUpperCase();

              return (
                <div
                  key={row.patientId}
                  className="flex items-center gap-4 px-5 py-4"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
                    style={{ background: "#16A34A" }}
                  >
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{row.name}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">{row.phone}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xl font-black text-foreground tabular-nums">{row.docCount}</div>
                    <div className="text-xs text-muted-foreground">doc{Number(row.docCount) > 1 ? "s" : ""}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
