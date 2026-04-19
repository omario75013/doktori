"use client";

import { useTransition } from "react";

export function LanguageSwitcher({ currentLocale }: { currentLocale: string }) {
  const [isPending, startTransition] = useTransition();

  function changeLocale(newLocale: string) {
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;
    startTransition(() => {
      window.location.reload();
    });
  }

  return (
    <div className="inline-flex items-center gap-1 border rounded-lg p-1 text-sm" role="group" aria-label="Changer de langue">
      <button
        onClick={() => changeLocale("fr")}
        disabled={isPending || currentLocale === "fr"}
        aria-label="Passer en français"
        aria-pressed={currentLocale === "fr"}
        className={`min-h-[36px] min-w-[36px] px-3 py-1.5 rounded font-semibold transition-colors ${currentLocale === "fr" ? "bg-[#0891B2] text-white" : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"}`}
      >
        FR
      </button>
      <button
        onClick={() => changeLocale("ar")}
        disabled={isPending || currentLocale === "ar"}
        aria-label="التبديل إلى العربية"
        aria-pressed={currentLocale === "ar"}
        className={`min-h-[36px] min-w-[36px] px-3 py-1.5 rounded font-semibold transition-colors ${currentLocale === "ar" ? "bg-[#0891B2] text-white" : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"}`}
      >
        AR
      </button>
    </div>
  );
}
