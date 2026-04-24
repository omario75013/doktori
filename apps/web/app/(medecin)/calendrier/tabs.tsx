"use client";

import Link from "next/link";
import { CalendarDays, CalendarClock } from "lucide-react";

type Tab = "calendrier" | "agenda";

export function CalendrierTabs({ active }: { active: Tab }) {
  return (
    <div className="inline-flex rounded-2xl border border-border bg-white p-1 shadow-sm">
      <TabLink href="/calendrier" active={active === "calendrier"} icon={<CalendarDays className="h-4 w-4" />}>
        Calendrier
      </TabLink>
      <TabLink href="/calendrier?tab=agenda" active={active === "agenda"} icon={<CalendarClock className="h-4 w-4" />}>
        Agenda
      </TabLink>
    </div>
  );
}

function TabLink({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
        active ? "bg-primary text-white shadow-sm" : "text-gray-600 hover:bg-secondary"
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}
