import { getAdminSession } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TemplateEditor } from "@/app/(medecin)/modeles/components/template-editor";
import { db, prescriptionTemplates } from "@doktori/db";
import { and, eq, isNull } from "drizzle-orm";

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminEditTemplatePage({ params }: PageProps) {
  const admin = await getAdminSession();
  if (!admin || admin.role !== "super_admin") redirect("/admin");

  const { id } = await params;

  const [template] = await db
    .select()
    .from(prescriptionTemplates)
    .where(and(eq(prescriptionTemplates.id, id), isNull(prescriptionTemplates.deletedAt)))
    .limit(1);

  if (!template) redirect("/admin/templates");

  const isReadOnly = !template.isOfficial;

  return (
    <div className="p-4 sm:p-8 max-w-[1400px] mx-auto">
      <Link
        href="/admin/templates"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux modèles
      </Link>

      {isReadOnly && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Lecture seule :</strong> Ce modèle appartient à un médecin. Consultez-le pour audit uniquement.
        </div>
      )}

      <TemplateEditor
        mode={isReadOnly ? "edit" : "admin"}
        initialData={{
          id: template.id,
          title: template.title,
          description: template.description,
          language: template.language,
          bodyMarkdown: template.bodyMarkdown,
          slug: template.slug,
        }}
      />
    </div>
  );
}
