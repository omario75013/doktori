import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db, prescriptionTemplates } from "@doktori/db";
import { and, eq, isNull } from "drizzle-orm";
import { TemplateEditor } from "../../components/template-editor";
import { isEnabled } from "@/lib/feature-flags";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditModelePage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "doctor") {
    redirect("/connexion");
  }

  if (!(await isEnabled("prescription_templates_enabled"))) {
    redirect("/medecin");
  }

  const { id } = await params;

  const [template] = await db
    .select()
    .from(prescriptionTemplates)
    .where(and(eq(prescriptionTemplates.id, id), isNull(prescriptionTemplates.deletedAt)))
    .limit(1);

  if (!template) {
    notFound();
  }

  // Official templates cannot be edited — redirect to list
  if (template.isOfficial) {
    redirect("/modeles");
  }

  // Must own the template
  if (template.doctorId !== session.user.id) {
    redirect("/modeles");
  }

  return (
    <TemplateEditor
      mode="edit"
      initialData={{
        id: template.id,
        title: template.title,
        description: template.description,
        language: template.language,
        bodyMarkdown: template.bodyMarkdown,
      }}
    />
  );
}
