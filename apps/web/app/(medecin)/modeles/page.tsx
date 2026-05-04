import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, prescriptionTemplates } from "@doktori/db";
import { and, or, eq, isNull, desc } from "drizzle-orm";
import { TemplateList } from "./components/template-list";
import { LegalDisclaimer } from "./components/legal-disclaimer";
import { isEnabled } from "@/lib/feature-flags";

export default async function ModelesPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "doctor") {
    redirect("/connexion");
  }

  if (!(await isEnabled("prescription_templates_enabled"))) {
    redirect("/dashboard");
  }

  const doctorId = session.user.id;

  const templates = await db
    .select()
    .from(prescriptionTemplates)
    .where(
      and(
        isNull(prescriptionTemplates.deletedAt),
        or(
          eq(prescriptionTemplates.doctorId, doctorId),
          eq(prescriptionTemplates.isOfficial, true)
        )
      )
    )
    .orderBy(desc(prescriptionTemplates.isOfficial), desc(prescriptionTemplates.updatedAt));

  return (
    <div className="space-y-4">
      <LegalDisclaimer />
      <TemplateList
        templates={templates.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          language: t.language,
          isOfficial: t.isOfficial,
          doctorId: t.doctorId,
          applyCount: t.applyCount,
          cloneCount: t.cloneCount,
          updatedAt: t.updatedAt.toISOString(),
        }))}
        doctorId={doctorId}
      />
    </div>
  );
}
