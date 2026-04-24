import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { SidebarNav } from "./sidebar-nav";
import { PageTransition } from "@/components/page-transition";
import { AppTopBar } from "@/components/app-topbar";
import { DoctorBellWidget } from "@/components/doctor-bell-widget";
import { IncomingCallListener } from "@/components/call-ui";

export default async function MedecinLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/connexion");
  if (!session?.user?.role || session.user.role !== "doctor") {
    redirect("/connexion");
  }

  const [doctorRow] = (await db.execute(
    sql`SELECT verification_status FROM doctors WHERE id = ${session.user.id} LIMIT 1`
  )) as unknown as Array<{ verification_status: string | null }>;

  const verificationStatus = doctorRow?.verification_status ?? "pending";

  return (
    <div className="min-h-screen flex">
      <SidebarNav userName={session.user?.name} verificationStatus={verificationStatus} />
      <div className="flex-1 flex flex-col min-w-0">
        <AppTopBar role="doctor" />
        <main className="flex-1 bg-gray-50 dark:bg-gray-950 p-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <DoctorBellWidget />
      <IncomingCallListener />
    </div>
  );
}
