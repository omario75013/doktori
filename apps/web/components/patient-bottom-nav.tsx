"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, FolderHeart, FileText } from "lucide-react";

const LINKS = [
  { href: "/mon-espace", label: "Espace", icon: Home },
  { href: "/mes-rdv", label: "Rendez-vous", icon: CalendarDays },
  { href: "/dossier-medical", label: "Dossier", icon: FolderHeart },
  { href: "/mes-documents", label: "Documents", icon: FileText },
];

export function PatientBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
      <ul className="grid grid-cols-4">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors ${
                  active ? "text-primary" : "text-gray-500 hover:text-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "" : "opacity-80"}`} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
