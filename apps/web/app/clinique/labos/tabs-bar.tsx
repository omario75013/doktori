"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { FlaskConical, ScanLine } from "lucide-react";
import { useTranslations } from "next-intl";

export function TabsBar({
  activeTab,
  inHouseCount,
}: {
  activeTab: string;
  inHouseCount: number;
}) {
  const t = useTranslations("clinique.labos.tabs");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function navigate(tab: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    // Reset status/doctor filters when switching tabs
    params.delete("status");
    params.delete("doctorId");
    params.delete("urgency");
    params.delete("from");
    params.delete("to");
    router.push(`${pathname}?${params.toString()}`);
  }

  const tabs = [
    { key: "sent", icon: FlaskConical, label: t("sent") },
    { key: "received", icon: ScanLine, label: t("received"), count: inHouseCount },
  ];

  return (
    <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-2xl p-1.5">
      {tabs.map(({ key, icon: Icon, label, count }) => {
        const active = activeTab === key;
        return (
          <button
            key={key}
            onClick={() => navigate(key)}
            className={[
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all",
              active
                ? "bg-white dark:bg-gray-900 text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            <Icon className="h-4 w-4" strokeWidth={2.5} />
            {label}
            {count !== undefined && count > 0 && !active && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-black px-1">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
