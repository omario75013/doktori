"use client";

import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  try {
    localStorage.setItem("theme", theme);
  } catch {
    /* localStorage disabled — ignore */
  }
}

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setMounted(true);
    setTheme(readStoredTheme());
  }, []);

  if (!mounted) {
    return <div className="h-10 w-10 rounded-lg" aria-hidden />;
  }

  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      onClick={() => {
        applyTheme(next);
        setTheme(next);
      }}
      aria-label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-primary dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5" strokeWidth={2} />
      ) : (
        <Moon className="h-5 w-5" strokeWidth={2} />
      )}
    </button>
  );
}
