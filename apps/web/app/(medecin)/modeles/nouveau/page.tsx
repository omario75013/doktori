import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TemplateEditor } from "../components/template-editor";
import { isEnabled } from "@/lib/feature-flags";

export default async function NouveauModelePage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "doctor") {
    redirect("/connexion");
  }

  if (!(await isEnabled("prescription_templates_enabled"))) {
    redirect("/dashboard");
  }

  return <TemplateEditor mode="create" />;
}
