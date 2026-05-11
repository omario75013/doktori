"use client";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  // Key off pathname so the inner subtree remounts on every navigation
  // (including browser back). Without this, Next.js's router cache can hand
  // back a stale component instance whose useEffects don't re-fire, leaving
  // pages stuck on a loading spinner until manual refresh.
  // initial={false} skips the fade-in entry animation entirely so the wrapper
  // never gets stuck at opacity:0 after a back-nav.
  const pathname = usePathname();
  return (
    <motion.div key={pathname} initial={false} animate={{ opacity: 1, y: 0 }}>
      {children}
    </motion.div>
  );
}
