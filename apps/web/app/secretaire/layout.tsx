import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { SecretaireSidebarNav } from "./sidebar-nav";
import { SecretaireSessionProvider } from "./session-provider";

export default async function SecretaireLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.role !== "secretary") {
    redirect("/secretaire-login");
  }

  const doctorId = session.user.doctorId;
  if (!doctorId) {
    redirect("/secretaire-login");
  }

  // Fetch the doctor's name for the sidebar
  const [doctor] = await db
    .select({ name: doctors.name })
    .from(doctors)
    .where(eq(doctors.id, doctorId))
    .limit(1);

  const doctorName = doctor?.name ?? "Médecin";
  const secretaireName = session.user.name ?? "Secrétaire";

  return (
    <SecretaireSessionProvider>
      <div className="min-h-screen flex" style={{ background: "#F0FDFA" }}>
        <SecretaireSidebarNav secretaireName={secretaireName} doctorName={doctorName} />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">{children}</main>
      </div>
    </SecretaireSessionProvider>
  );
}
