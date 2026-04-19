import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CliniqueSidebarNav } from "./sidebar-nav";
import { CliniqueSessionProvider } from "./session-provider";

export default async function CliniqueLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "clinic") {
    redirect("/clinique-login");
  }

  const clinicName = session.user.name ?? "Clinique";

  return (
    <CliniqueSessionProvider>
      <div className="min-h-screen flex" style={{ background: "#F0FDFA" }}>
        <CliniqueSidebarNav clinicName={clinicName} />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">{children}</main>
      </div>
    </CliniqueSessionProvider>
  );
}
