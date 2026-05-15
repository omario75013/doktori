import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LaboratoireSidebarNav } from "./sidebar-nav";
import { SessionProvider } from "next-auth/react";
import { db, labs } from "@doktori/db";
import { eq } from "drizzle-orm";

export default async function LaboratoireLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session || (role !== "lab" && role !== "lab_user")) {
    redirect("/laboratoire-login");
  }

  let labName = "Laboratoire";
  let staffBadge: { name: string; labUserRole: "admin" | "technician" } | null = null;

  if (role === "lab") {
    labName = session.user.name ?? "Laboratoire";
  } else if (role === "lab_user") {
    const labId = (session.user as { labId?: string }).labId;
    const labUserRole = (session.user as { labUserRole?: "admin" | "technician" }).labUserRole ?? "technician";
    if (labId) {
      const [lab] = await db
        .select({ name: labs.name })
        .from(labs)
        .where(eq(labs.id, labId))
        .limit(1);
      labName = lab?.name ?? "Laboratoire";
    }
    staffBadge = {
      name: session.user.name ?? "",
      labUserRole,
    };
  }

  return (
    <SessionProvider>
      <div className="min-h-screen flex" style={{ background: "#F0FDF4" }}>
        <LaboratoireSidebarNav labName={labName} staffBadge={staffBadge} />
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 overflow-y-auto p-6 md:p-8">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
