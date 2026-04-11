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
    <div className="inline-flex items-center gap-1 border rounded-lg p-1 text-sm">
      <button
        onClick={() => changeLocale("fr")}
        disabled={isPending || currentLocale === "fr"}
        className={`px-3 py-1 rounded ${currentLocale === "fr" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
      >
        FR
      </button>
      <button
        onClick={() => changeLocale("ar")}
        disabled={isPending || currentLocale === "ar"}
        className={`px-3 py-1 rounded ${currentLocale === "ar" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
      >
        AR
      </button>
    </div>
  );
}
