"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — only render after mount
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="h-10 w-10 rounded-lg" aria-hidden />
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#5E7574] transition-colors hover:bg-[#F0FDFA] hover:text-[#0891B2] dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5" strokeWidth={2} />
      ) : (
        <Moon className="h-5 w-5" strokeWidth={2} />
      )}
    </button>
  );
}
