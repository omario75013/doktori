import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TemplateEditor } from "../components/template-editor";

export default async function NouveauModelePage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "doctor") {
    redirect("/connexion");
  }

  return <TemplateEditor mode="create" />;
}
