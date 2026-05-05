"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Search, ArrowRight } from "lucide-react";

export function HeroSearchForm() {
  const router = useRouter();
  const t = useTranslations("landing");
  const [query, setQuery] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    router.push(`/recherche?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSearch} className="mx-auto mt-8 max-w-xl lg:mx-0">
      <div className="group flex h-16 items-center rounded-2xl border-2 border-border dark:border-gray-700 bg-white dark:bg-gray-800 p-1.5 shadow-lg shadow-primary/5 transition-all focus-within:border-primary focus-within:shadow-xl focus-within:shadow-primary/10">
        <div className="flex h-full w-12 shrink-0 items-center justify-center text-muted-foreground">
          <Search className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("heroSearchPlaceholder")}
          className="h-full flex-1 border-0 bg-transparent px-2 text-base text-foreground dark:text-white placeholder:text-muted-foreground/60 outline-none"
        />
        <button
          type="submit"
          className="group/btn inline-flex h-full items-center gap-2 rounded-xl bg-primary px-4 sm:px-6 text-sm font-bold text-white shadow-sm transition-all hover:bg-doktori-teal-dark active:scale-[0.98]"
        >
          <span>{t("searchButton")}</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" strokeWidth={3} />
        </button>
      </div>
    </form>
  );
}
