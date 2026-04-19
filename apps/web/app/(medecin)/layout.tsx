import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, doctors } from "@doktori/db";
import { eq, sql } from "drizzle-orm";
import { SidebarNav } from "./sidebar-nav";
import { PageTransition } from "@/components/page-transition";

export default async function MedecinLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/connexion");
  if (!session?.user?.role || session.user.role !== "doctor") {
    redirect("/connexion");
  }

  // Fetch verification status for the sidebar dot indicator
  const [doctorRow] = await db.execute(
    sql`SELECT verification_status FROM doctors WHERE id = ${session.user.id} LIMIT 1`
  ) as unknown as Array<{ verification_status: string | null }>;

  const verificationStatus = doctorRow?.verification_status ?? "pending";

  return (
    <div className="min-h-screen flex">
      <SidebarNav userName={session.user?.name} verificationStatus={verificationStatus} />
      <main className="flex-1 bg-gray-50 p-6 md:ml-0">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
