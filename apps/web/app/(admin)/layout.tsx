import { getAdminSession } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { AdminSidebarNav } from "./admin-sidebar-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin-login");

  return (
    <div className="min-h-screen flex bg-slate-50">
      <AdminSidebarNav
        adminName={admin.name}
        adminEmail={admin.email}
        adminRole={admin.role}
      />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
