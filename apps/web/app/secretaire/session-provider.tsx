"use client";

import { SessionProvider } from "next-auth/react";

export function SecretaireSessionProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
