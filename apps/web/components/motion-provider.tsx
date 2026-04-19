"use client";

import { MotionConfig } from "framer-motion";

/**
 * Wraps the app with framer-motion MotionConfig to respect
 * the user's prefers-reduced-motion OS setting.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      {children}
    </MotionConfig>
  );
}
