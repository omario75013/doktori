import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SidebarNav } from "./sidebar-nav";

export default async function MedecinLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/connexion");
  if (!session?.user?.role || session.user.role !== "doctor") {
    redirect("/connexion");
  }

  return (
    <div className="min-h-screen flex">
      <SidebarNav userName={session.user?.name} />
      <main className="flex-1 bg-gray-50 p-6 md:ml-0">{children}</main>
    </div>
  );
}
