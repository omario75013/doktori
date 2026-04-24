import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { SecretaireSidebarNav } from "./sidebar-nav";
import { SecretaireSessionProvider } from "./session-provider";
import { AppTopBar } from "@/components/app-topbar";
import { SecretaryHeartbeat } from "@/components/secretary-heartbeat";
import { SecretaryBellListener } from "@/components/secretary-bell-listener";
import { IncomingCallListener } from "@/components/call-ui";

export default async function SecretaireLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.role !== "secretary") {
    redirect("/secretaire-login");
  }

  const doctorId = session.user.doctorId;
  if (!doctorId) {
    redirect("/secretaire-login");
  }

  const [doctor] = await db
    .select({ name: doctors.name })
    .from(doctors)
    .where(eq(doctors.id, doctorId))
    .limit(1);

  const doctorName = doctor?.name ?? "Médecin";
  const secretaireName = session.user.name ?? "Secrétaire";

  return (
    <SecretaireSessionProvider>
      <SecretaryHeartbeat />
      <SecretaryBellListener />
      <IncomingCallListener />
      <div className="min-h-screen flex" style={{ background: "#F0FDFA" }}>
        <SecretaireSidebarNav secretaireName={secretaireName} doctorName={doctorName} />
        <div className="flex-1 flex flex-col min-w-0">
          <AppTopBar role="secretary" title={`Cabinet Dr. ${doctorName}`} />
          <main className="flex-1 overflow-y-auto p-6 md:p-8">{children}</main>
        </div>
      </div>
    </SecretaireSessionProvider>
  );
}
