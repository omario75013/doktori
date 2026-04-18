import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const links = [
  { href: "/clinique/dashboard", label: "Dashboard" },
  { href: "/clinique/agenda", label: "Agenda équipe" },
  { href: "/clinique/medecins", label: "Médecins" },
  { href: "/clinique/parametres", label: "Paramètres" },
];

export default async function CliniqueLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "clinic") {
    redirect("/clinique-login");
  }

  const clinicName = session.user.name ?? "Clinique";

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-gray-900 text-white p-4 flex flex-col">
        <h2 className="text-lg font-bold mb-1">Doktori</h2>
        <p className="text-xs text-gray-400 mb-6">Espace Clinique</p>
        <nav className="space-y-1 flex-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block px-3 py-2 rounded hover:bg-gray-800 text-sm"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="text-xs text-gray-500 mt-auto truncate" title={clinicName}>
          {clinicName}
        </p>
      </aside>
      <main className="flex-1 bg-gray-50 p-6">{children}</main>
    </div>
  );
}
