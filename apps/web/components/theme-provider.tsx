"use client";

import type { ReactNode } from "react";

export function ThemeProvider({
  children,
}: {
  children: ReactNode;
  attribute?: string;
  defaultTheme?: string;
  enableSystem?: boolean;
}) {
  return <>{children}</>;
}
