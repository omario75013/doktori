import { getAdminSession } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TemplateEditor } from "@/app/(medecin)/modeles/components/template-editor";

export default async function AdminNouveauTemplatePage() {
  const admin = await getAdminSession();
  if (!admin || admin.role !== "super_admin") redirect("/admin");

  return (
    <div className="p-4 sm:p-8 max-w-[1400px] mx-auto">
      <Link
        href="/admin/templates"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux modèles
      </Link>
      <TemplateEditor mode="admin" />
    </div>
  );
}
