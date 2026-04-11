import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function MedecinLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/connexion");

  const links = [
    { href: "/dashboard", label: "Tableau de bord" },
    { href: "/agenda", label: "Agenda" },
    { href: "/rendez-vous", label: "Rendez-vous" },
    { href: "/cnam", label: "Bordereaux CNAM" },
    { href: "/profil", label: "Mon profil" },
  ];

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-gray-900 text-white p-4 flex flex-col">
        <h2 className="text-lg font-bold mb-6">Doktori</h2>
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
        <p className="text-xs text-gray-500 mt-auto">{session.user?.name}</p>
      </aside>
      <main className="flex-1 bg-gray-50 p-6">{children}</main>
    </div>
  );
}
