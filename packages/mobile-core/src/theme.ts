/**
 * Brand tokens ported from apps/web/app/globals.css:55-70.
 * Keep in sync manually; the web app is the source of truth.
 */
export const colors = {
  // Core brand
  teal: "#0891B2",
  tealDark: "#0E7490",
  tealLight: "#22D3EE",
  green: "#22C55E",
  greenDark: "#16A34A",
  amber: "#F59E0B",
  amberDark: "#B45309",
  // Semantic (light mode defaults)
  bg: "#FFFFFF",
  bgSecondary: "#F0FDFA",
  foreground: "#0F172A",
  foregroundSecondary: "#64748B",
  border: "#E2E8F0",
  danger: "#DC2626",
  dangerBg: "#FEE2E2",
} as const;

export const darkColors = {
  ...colors,
  bg: "#0F172A",
  bgSecondary: "#1E293B",
  foreground: "#F8FAFC",
  foregroundSecondary: "#CBD5E1",
  border: "#334155",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  full: 9999,
} as const;

export const typography = {
  heading: "Figtree_700Bold",
  headingExtra: "Figtree_900Black",
  body: "NotoSans_400Regular",
  bodyBold: "NotoSans_700Bold",
  mono: "GeistMono_400Regular",
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 22,
    "2xl": 28,
    "3xl": 34,
  },
} as const;

export type Theme = {
  colors: typeof colors;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  dark: boolean;
};

export function buildTheme(dark: boolean): Theme {
  return {
    colors: (dark ? darkColors : colors) as typeof colors,
    spacing,
    radii,
    typography,
    dark,
  };
}
