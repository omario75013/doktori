import { Platform } from "react-native";

export const colors = {
  primary: "#0891B2",
  primaryDark: "#0E7490",
  primaryLight: "#22D3EE",
  primaryFaint: "#ECFEFF",
  green: "#22C55E",
  greenDark: "#16A34A",
  greenFaint: "#F0FDF4",
  red: "#DC2626",
  redFaint: "#FEF2F2",
  orange: "#F59E0B",
  purple: "#7C3AED",
  purpleFaint: "#EDE9FE",
  ink: "#134E4A",
  inkLight: "#1E6B64",
  mist: "#F0FDFA",
  cream: "#FAFDFC",
  border: "#E6F4F1",
  slate900: "#0F172A",
  slate700: "#334155",
  slate500: "#64748B",
  slate400: "#94A3B8",
  slate200: "#E2E8F0",
  slate100: "#F1F5F9",
  white: "#FFFFFF",
  bg: "#F8FAFB",
};

export const fonts = {
  heading: "Figtree",
  headingBold: "Figtree-Bold",
  headingBlack: "Figtree-Black",
  body: "NotoSans",
  bodyMedium: "NotoSans-Medium",
  bodyBold: "NotoSans-Bold",
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, full: 9999 };

export const shadow = {
  sm: Platform.select({
    ios: { shadowColor: "#0E7490", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
    android: { elevation: 2 },
  }),
  md: Platform.select({
    ios: { shadowColor: "#0E7490", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
    android: { elevation: 4 },
  }),
  lg: Platform.select({
    ios: { shadowColor: "#0E7490", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24 },
    android: { elevation: 8 },
  }),
} as const;
