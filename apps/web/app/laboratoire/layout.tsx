import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LaboratoireSidebarNav } from "./sidebar-nav";
import { SessionProvider } from "next-auth/react";

export default async function LaboratoireLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "lab") {
    redirect("/laboratoire-login");
  }

  const labName = session.user.name ?? "Laboratoire";

  return (
    <SessionProvider>
      <div className="min-h-screen flex" style={{ background: "#F0FDF4" }}>
        <LaboratoireSidebarNav labName={labName} />
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 overflow-y-auto p-6 md:p-8">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
