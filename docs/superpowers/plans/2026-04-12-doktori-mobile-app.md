# Doktori Mobile App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Doktori patient mobile app (iOS + Android) from skeleton to App Store submission — auth, 4 tabs, booking, SOS, design system, i18n, push.

**Architecture:** Expo 54 + Expo Router 6 file-based routing. Auth via phone OTP with JWT stored in SecureStore. API client wraps all calls with JWT + error handling. Design system in `lib/theme.ts` + 7 reusable components. i18n via `i18n-js` + `expo-localization` (FR + AR/RTL).

**Tech Stack:** Expo 54, React Native 0.81, React 19, TypeScript 5.9, expo-router 6, expo-secure-store, expo-localization, i18n-js, lucide-react-native, @doktori/shared, @doktori/validation

**Spec:** `docs/superpowers/specs/2026-04-12-doktori-mobile-app-design.md`

---

## File Map

### New Files
- `apps/mobile/lib/theme.ts` — colors, fonts, spacing, radius constants
- `apps/mobile/lib/auth.ts` — getToken, getPatient, logout, isTokenValid
- `apps/mobile/lib/i18n.ts` — i18n-js setup + locale detection
- `apps/mobile/i18n/fr.json` — French translation keys (~60)
- `apps/mobile/i18n/ar.json` — Arabic translation keys (~60)
- `apps/mobile/components/ui/Button.tsx` — Primary/secondary/danger button
- `apps/mobile/components/ui/DoctorCard.tsx` — Reusable doctor card
- `apps/mobile/components/ui/StatusBadge.tsx` — Appointment status pill
- `apps/mobile/components/ui/Input.tsx` — Themed text input with label
- `apps/mobile/components/ui/OtpInput.tsx` — 6-digit OTP code input
- `apps/mobile/components/ui/EmptyState.tsx` — Empty state with icon + text
- `apps/mobile/components/ui/LoadingSpinner.tsx` — Centered teal spinner
- `apps/mobile/app/(auth)/_layout.tsx` — Auth stack layout
- `apps/mobile/app/(auth)/login.tsx` — Phone number login screen
- `apps/mobile/app/(auth)/otp.tsx` — OTP verification screen
- `apps/mobile/app/(tabs)/profil.tsx` — Profile + settings tab
- `apps/mobile/app/rdv/[id]/confirmation.tsx` — Booking confirmation
- `apps/mobile/scripts/generate-icon.mjs` — Node script to generate app icon PNG

### Modified Files
- `apps/mobile/package.json` — add 7 new dependencies
- `apps/mobile/app.json` — update name, slug, bundle IDs, splash colors, icon paths
- `apps/mobile/app/_layout.tsx` — auth gate + font loading + notification handlers
- `apps/mobile/app/(tabs)/_layout.tsx` — 4 tabs, teal theme, lucide icons
- `apps/mobile/app/(tabs)/index.tsx` — design system + filter chips + DoctorCard
- `apps/mobile/app/(tabs)/sos.tsx` — auth header + design system + haptics + 5s polling
- `apps/mobile/app/(tabs)/mes-rdv.tsx` — full rewrite with appointment list
- `apps/mobile/app/medecin/[slug].tsx` — education, reviews, insurance, share, sticky CTA
- `apps/mobile/app/rdv/[slug].tsx` — auth header + validation + navigate to confirmation
- `apps/mobile/lib/api.ts` — JWT auth, error class, fix doctor endpoint, new endpoints
- `apps/mobile/lib/push.ts` — fix lightColor to teal, refactor registerTokenWithServer
- `apps/mobile/constants/Colors.ts` — replace with teal palette (or delete, use theme.ts)

### Deleted Files
- `apps/mobile/app/(tabs)/two.tsx`
- `apps/mobile/app/modal.tsx`
- `apps/mobile/components/EditScreenInfo.tsx`
- `apps/mobile/components/__tests__/StyledText-test.js`

---

## Task 1: Cleanup + Dependencies

**Files:**
- Modify: `apps/mobile/package.json`
- Delete: `apps/mobile/app/(tabs)/two.tsx`, `apps/mobile/app/modal.tsx`, `apps/mobile/components/EditScreenInfo.tsx`, `apps/mobile/components/__tests__/StyledText-test.js`

- [ ] **Step 1: Delete stale template files**

```bash
cd apps/mobile
rm app/\(tabs\)/two.tsx app/modal.tsx app/+html.tsx components/EditScreenInfo.tsx components/StyledText.tsx components/__tests__/StyledText-test.js
```

- [ ] **Step 2: Install new dependencies**

```bash
cd /Users/omario/doktori
pnpm --filter mobile add expo-secure-store expo-haptics expo-calendar expo-localization i18n-js @react-native-async-storage/async-storage lucide-react-native
```

Expected: all 7 packages added to `apps/mobile/package.json` dependencies.

- [ ] **Step 3: Verify app still starts**

```bash
cd apps/mobile && npx expo start --no-dev --clear 2>&1 | head -20
```

Expected: Metro bundler starts without errors. Press Ctrl+C to stop.

- [ ] **Step 4: Commit**

```bash
git add -A apps/mobile/
git commit -m "chore(mobile): cleanup stale files + install new dependencies

Remove Expo template files (two.tsx, modal.tsx, EditScreenInfo).
Add: expo-secure-store, expo-haptics, expo-calendar, expo-localization,
i18n-js, async-storage, lucide-react-native."
```

---

## Task 2: Design System — Theme + Components

**Files:**
- Create: `apps/mobile/lib/theme.ts`
- Create: `apps/mobile/components/ui/Button.tsx`
- Create: `apps/mobile/components/ui/DoctorCard.tsx`
- Create: `apps/mobile/components/ui/StatusBadge.tsx`
- Create: `apps/mobile/components/ui/Input.tsx`
- Create: `apps/mobile/components/ui/OtpInput.tsx`
- Create: `apps/mobile/components/ui/EmptyState.tsx`
- Create: `apps/mobile/components/ui/LoadingSpinner.tsx`
- Delete: `apps/mobile/constants/Colors.ts`

- [ ] **Step 1: Create theme constants**

```typescript
// apps/mobile/lib/theme.ts
export const colors = {
  primary: "#0891B2",
  primaryDark: "#0E7490",
  primaryLight: "#22D3EE",
  green: "#22C55E",
  greenDark: "#16A34A",
  red: "#DC2626",
  ink: "#134E4A",
  mist: "#F0FDFA",
  cream: "#FAFDFC",
  border: "#E6F4F1",
  slate500: "#64748B",
  slate200: "#E2E8F0",
  white: "#FFFFFF",
  bg: "#F9FAFB",
};

export const fonts = {
  heading: "Figtree",
  headingBold: "Figtree-Bold",
  headingBlack: "Figtree-Black",
  body: "NotoSans",
  bodyMedium: "NotoSans-Medium",
  bodyBold: "NotoSans-Bold",
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, full: 9999 };
```

- [ ] **Step 2: Create Button component**

```typescript
// apps/mobile/components/ui/Button.tsx
import { Pressable, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { colors, radius, fonts } from "@/lib/theme";

type Variant = "primary" | "secondary" | "danger";

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

const VARIANTS: Record<Variant, { bg: string; text: string; border?: string }> = {
  primary: { bg: colors.primary, text: colors.white },
  secondary: { bg: colors.white, text: colors.primary, border: colors.primary },
  danger: { bg: colors.red, text: colors.white },
};

export function Button({ title, onPress, variant = "primary", loading, disabled, style }: Props) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        { backgroundColor: v.bg },
        v.border ? { borderWidth: 2, borderColor: v.border } : undefined,
        (disabled || loading) && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <Text style={[styles.text, { color: v.text }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { paddingVertical: 16, paddingHorizontal: 24, borderRadius: radius.md, alignItems: "center" },
  text: { fontSize: 16, fontWeight: "600" },
});
```

- [ ] **Step 3: Create DoctorCard component**

```typescript
// apps/mobile/components/ui/DoctorCard.tsx
import { Pressable, View, Text, StyleSheet } from "react-native";
import { colors, radius, spacing } from "@/lib/theme";
import { SPECIALTIES, CITIES } from "@doktori/shared";

type Props = {
  doctor: {
    id: string;
    name: string;
    slug: string;
    specialty: string;
    city: string;
    consultationFee?: number | null;
    averageRating?: number | null;
    reviewCount?: number;
  };
  onPress: () => void;
};

export function DoctorCard({ doctor, onPress }: Props) {
  const spec = SPECIALTIES.find((s) => s.id === doctor.specialty);
  const city = CITIES.find((c) => c.id === doctor.city);
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{doctor.name?.charAt(0) || "?"}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{doctor.name}</Text>
        <Text style={styles.specialty}>{spec?.label ?? doctor.specialty}</Text>
        <Text style={styles.city}>{city?.label ?? doctor.city}</Text>
      </View>
      {doctor.consultationFee ? (
        <Text style={styles.fee}>{doctor.consultationFee / 1000} DT</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white, padding: spacing.md, borderRadius: radius.md,
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.mist,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 20, fontWeight: "700", color: colors.primary },
  name: { fontSize: 16, fontWeight: "600", color: colors.ink },
  specialty: { fontSize: 14, color: colors.primary, marginTop: 2 },
  city: { fontSize: 13, color: colors.slate500, marginTop: 2 },
  fee: { fontSize: 16, fontWeight: "700", color: colors.ink },
});
```

- [ ] **Step 4: Create StatusBadge component**

```typescript
// apps/mobile/components/ui/StatusBadge.tsx
import { View, Text, StyleSheet } from "react-native";
import { colors, radius } from "@/lib/theme";

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "#FEF3C7", text: "#92400E", label: "En attente" },
  confirmed: { bg: "#DBEAFE", text: "#1E40AF", label: "Confirmé" },
  completed: { bg: "#DCFCE7", text: "#166534", label: "Terminé" },
  cancelled: { bg: "#FEE2E2", text: "#991B1B", label: "Annulé" },
  no_show: { bg: "#F1F5F9", text: "#475569", label: "Absent" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { bg: "#F1F5F9", text: "#475569", label: status };
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.text, { color: s.text }]}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  text: { fontSize: 12, fontWeight: "600" },
});
```

- [ ] **Step 5: Create Input, OtpInput, EmptyState, LoadingSpinner**

```typescript
// apps/mobile/components/ui/Input.tsx
import { View, Text, TextInput, StyleSheet, TextInputProps } from "react-native";
import { colors, radius, spacing } from "@/lib/theme";

type Props = TextInputProps & { label: string; error?: string };

export function Input({ label, error, style, ...props }: Props) {
  return (
    <View style={{ marginTop: spacing.md }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : undefined, style]}
        placeholderTextColor={colors.slate500}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "600", color: colors.ink, marginBottom: 6 },
  input: {
    backgroundColor: colors.bg, padding: 12, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.slate200, fontSize: 15, color: colors.ink,
  },
  inputError: { borderColor: colors.red },
  error: { fontSize: 12, color: colors.red, marginTop: 4 },
});
```

```typescript
// apps/mobile/components/ui/OtpInput.tsx
import { useRef, useState } from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { colors, radius } from "@/lib/theme";

type Props = { length?: number; onComplete: (code: string) => void };

export function OtpInput({ length = 6, onComplete }: Props) {
  const [values, setValues] = useState(Array(length).fill(""));
  const refs = useRef<Array<TextInput | null>>([]);

  function handleChange(text: string, index: number) {
    const next = [...values];
    next[index] = text.slice(-1);
    setValues(next);
    if (text && index < length - 1) refs.current[index + 1]?.focus();
    const code = next.join("");
    if (code.length === length && next.every((v) => v)) onComplete(code);
  }

  function handleKeyPress(key: string, index: number) {
    if (key === "Backspace" && !values[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  return (
    <View style={styles.row}>
      {values.map((v, i) => (
        <TextInput
          key={i}
          ref={(r) => { refs.current[i] = r; }}
          style={[styles.box, v ? styles.boxFilled : undefined]}
          value={v}
          onChangeText={(t) => handleChange(t, i)}
          onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
          keyboardType="number-pad"
          maxLength={1}
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10, justifyContent: "center" },
  box: {
    width: 48, height: 56, borderRadius: radius.sm, borderWidth: 2,
    borderColor: colors.slate200, textAlign: "center", fontSize: 24,
    fontWeight: "700", color: colors.ink,
  },
  boxFilled: { borderColor: colors.primary },
});
```

```typescript
// apps/mobile/components/ui/EmptyState.tsx
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing } from "@/lib/theme";
import { Button } from "./Button";

type Props = { icon: string; title: string; description?: string; ctaTitle?: string; onCta?: () => void };

export function EmptyState({ icon, title, description, ctaTitle, onCta }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.desc}>{description}</Text> : null}
      {ctaTitle && onCta ? <Button title={ctaTitle} onPress={onCta} style={{ marginTop: spacing.md }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: "700", color: colors.ink, textAlign: "center" },
  desc: { fontSize: 14, color: colors.slate500, textAlign: "center", marginTop: 8, lineHeight: 20 },
});
```

```typescript
// apps/mobile/components/ui/LoadingSpinner.tsx
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { colors } from "@/lib/theme";

export function LoadingSpinner() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
});
```

- [ ] **Step 6: Delete old Colors.ts**

```bash
rm apps/mobile/constants/Colors.ts
```

- [ ] **Step 7: Commit**

```bash
git add -A apps/mobile/
git commit -m "feat(mobile): add design system theme + 7 reusable UI components

- lib/theme.ts: colors, fonts, spacing, radius constants (teal #0891B2)
- Button: primary/secondary/danger with loading state
- DoctorCard: avatar, name, specialty, city, fee
- StatusBadge: colored pills for appointment statuses
- Input: themed input with label + error
- OtpInput: 6-digit auto-advance with SMS autofill
- EmptyState + LoadingSpinner
- Delete legacy Colors.ts"
```

---

## Task 3: App Icon + Branding

**Files:**
- Create: `apps/mobile/scripts/generate-icon.mjs`
- Modify: `apps/mobile/app.json`
- Modify: `apps/mobile/assets/images/icon.png` (replace)
- Modify: `apps/mobile/assets/images/adaptive-icon.png` (replace)
- Modify: `apps/mobile/assets/images/splash-icon.png` (replace)

- [ ] **Step 1: Create icon generation script**

This script generates a 1024x1024 PNG with a teal rounded-rect background and a white stethoscope silhouette using `sharp` + inline SVG.

```javascript
// apps/mobile/scripts/generate-icon.mjs
import sharp from "sharp";
import { writeFileSync } from "fs";

const SIZE = 1024;
const R = Math.round(SIZE * 0.2); // 20% corner radius

// Stethoscope SVG path (simplified medical icon)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" rx="${R}" fill="#0891B2"/>
  <g transform="translate(${SIZE * 0.2}, ${SIZE * 0.15}) scale(${SIZE * 0.006})">
    <path d="M12 2a2 2 0 0 0-2 2v6.5a5.5 5.5 0 0 0 5 5.48V18a3 3 0 0 1-6 0v-1.02A4.5 4.5 0 0 1 5.5 13H4a4.5 4.5 0 0 1 0-9h1V2a2 2 0 0 0-2 2M14 4a2 2 0 0 0-2-2v2h2zm5 8.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"
      fill="white" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <circle cx="${SIZE * 0.72}" cy="${SIZE * 0.22}" r="${SIZE * 0.06}" fill="#22C55E"/>
  <circle cx="${SIZE * 0.72}" cy="${SIZE * 0.22}" r="${SIZE * 0.035}" fill="#22C55E" opacity="0.5"/>
</svg>`;

const buf = await sharp(Buffer.from(svg)).resize(SIZE, SIZE).png().toBuffer();
writeFileSync("assets/images/icon.png", buf);
writeFileSync("assets/images/splash-icon.png", buf);

// Adaptive icon: foreground on transparent bg
const fgSvg = svg.replace('fill="#0891B2"', 'fill="transparent"');
const fgBuf = await sharp(Buffer.from(fgSvg)).resize(SIZE, SIZE).png().toBuffer();
writeFileSync("assets/images/adaptive-icon.png", fgBuf);

console.log("Icons generated: icon.png, splash-icon.png, adaptive-icon.png");
```

Run (from `apps/mobile/`):
```bash
cd apps/mobile && node scripts/generate-icon.mjs
```

Note: If the stethoscope SVG path doesn't render well, use a simpler approach: download a free medical stethoscope SVG from Lucide's icon set (the same `Stethoscope` icon used on web) and embed it. The key requirement is: **teal `#0891B2` rounded background, white stethoscope, green `#22C55E` dot top-right.**

- [ ] **Step 2: Update app.json**

Replace the current `app.json` with:

```json
{
  "expo": {
    "name": "Doktori",
    "slug": "doktori",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "doktori",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/images/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#0891B2"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "tn.doktori.app",
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "Doktori utilise votre position pour trouver les médecins les plus proches.",
        "NSCalendarsUsageDescription": "Doktori ajoute vos rendez-vous à votre calendrier."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#0891B2"
      },
      "edgeToEdgeEnabled": true,
      "package": "tn.doktori.app",
      "permissions": ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION", "READ_CALENDAR", "WRITE_CALENDAR"]
    },
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      "expo-localization",
      [
        "expo-notifications",
        {
          "icon": "./assets/images/notification-icon.png",
          "color": "#0891B2"
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

- [ ] **Step 3: Verify icons render**

Open `assets/images/icon.png` visually. It should show: teal rounded square, white stethoscope, green dot.

- [ ] **Step 4: Commit**

```bash
git add -A apps/mobile/
git commit -m "feat(mobile): generate Doktori app icons + update Expo config

- Teal #0891B2 rounded square with white stethoscope + green dot
- Update app.json: name=Doktori, slug=doktori, bundle=tn.doktori.app
- Splash bg teal, add iOS/Android permissions, notification config"
```

---

## Task 4: Auth — Token Management + API Client Hardening

**Files:**
- Create: `apps/mobile/lib/auth.ts`
- Modify: `apps/mobile/lib/api.ts`

- [ ] **Step 1: Create auth module**

```typescript
// apps/mobile/lib/auth.ts
import * as SecureStore from "expo-secure-store";

const JWT_KEY = "jwt";
const PATIENT_KEY = "patient";

export type Patient = { id: string; phone: string; name?: string };

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(JWT_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(JWT_KEY, token);
}

export async function getPatient(): Promise<Patient | null> {
  const raw = await SecureStore.getItemAsync(PATIENT_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function setPatient(patient: Patient): Promise<void> {
  await SecureStore.setItemAsync(PATIENT_KEY, JSON.stringify(patient));
}

export async function logout(): Promise<void> {
  await SecureStore.deleteItemAsync(JWT_KEY);
  await SecureStore.deleteItemAsync(PATIENT_KEY);
}

export function isTokenValid(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}
```

- [ ] **Step 2: Rewrite API client with auth + error handling + fixed endpoints**

```typescript
// apps/mobile/lib/api.ts
import { Platform } from "react-native";
import { getToken, logout } from "./auth";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options?.headers as Record<string, string>) ?? {}),
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    await logout();
    throw new ApiError(401, "Session expirée");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? `Erreur ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  requestOtp: (phone: string) =>
    apiFetch<{ success: boolean }>("/api/auth/otp/request", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),

  verifyOtp: (phone: string, code: string) =>
    apiFetch<{ token: string; patient: { id: string; phone: string } }>("/api/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ phone, code }),
    }),

  // Search
  searchDoctors: (q: string, filters?: { specialty?: string; city?: string }) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (filters?.specialty) params.set("specialty", filters.specialty);
    if (filters?.city) params.set("city", filters.city);
    return apiFetch<any>(`/api/search?${params.toString()}`);
  },

  // Doctors — FIXED: was /api/doctors/${slug}, correct path is /api/doctors/by-slug/${slug}
  getDoctor: (slug: string) => apiFetch<any>(`/api/doctors/by-slug/${slug}`),

  getDoctorAvailability: (slug: string, date: string) =>
    apiFetch<any>(`/api/doctors/by-slug/${slug}/availability?date=${date}`),

  getDoctorReviews: (doctorId: string) =>
    apiFetch<any>(`/api/reviews?doctorId=${doctorId}`),

  // Appointments
  getSlots: (doctorId: string, date: string) =>
    apiFetch<Array<{ startTime: string; endTime: string; available: boolean }>>(
      `/api/appointments?doctorId=${doctorId}&date=${date}`
    ),

  bookAppointment: (data: {
    doctorId: string;
    patientName: string;
    patientPhone: string;
    date: string;
    startTime: string;
    reason?: string;
  }) => apiFetch<any>("/api/appointments", { method: "POST", body: JSON.stringify(data) }),

  getMyAppointments: () => apiFetch<any>("/api/appointments/patient"),

  cancelAppointment: (id: string) =>
    apiFetch<any>(`/api/appointments/${id}/cancel`, { method: "POST" }),

  // SOS
  sosRequest: (data: {
    patientName: string;
    patientPhone: string;
    latitude: number;
    longitude: number;
    symptomCategory?: string;
    description?: string;
  }) => apiFetch<{ sessionId: string }>("/api/sos/request", {
    method: "POST",
    body: JSON.stringify(data),
  }),

  sosSession: (sessionId: string) =>
    apiFetch<{
      id: string;
      status: string;
      doctor_name: string | null;
      doctor_phone: string | null;
      doctor_address: string | null;
      requested_at: string;
      accepted_at: string | null;
      expires_at: string;
    }>(`/api/sos/session/${sessionId}`),

  // Push
  registerPushToken: (token: string) =>
    apiFetch<any>("/api/push/register", {
      method: "POST",
      body: JSON.stringify({ token, platform: Platform.OS }),
    }),
};
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/lib/auth.ts apps/mobile/lib/api.ts
git commit -m "feat(mobile): auth module + hardened API client

- lib/auth.ts: SecureStore JWT/patient, isTokenValid (local decode)
- lib/api.ts: auto-attach JWT, ApiError class, 401 → logout
- Fix: doctor endpoint /api/doctors/by-slug/ (was /api/doctors/)
- Add: requestOtp, verifyOtp, getMyAppointments, cancelAppointment,
  getDoctorReviews, registerPushToken endpoints"
```

---

## Task 5: Auth Screens — Login + OTP + Root Layout Auth Gate

**Files:**
- Create: `apps/mobile/app/(auth)/_layout.tsx`
- Create: `apps/mobile/app/(auth)/login.tsx`
- Create: `apps/mobile/app/(auth)/otp.tsx`
- Modify: `apps/mobile/app/_layout.tsx`

- [ ] **Step 1: Create auth group layout**

```typescript
// apps/mobile/app/(auth)/_layout.tsx
import { Stack } from "expo-router";
import { colors } from "@/lib/theme";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.white },
      }}
    />
  );
}
```

- [ ] **Step 2: Create login screen**

```typescript
// apps/mobile/app/(auth)/login.tsx
import { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing, radius } from "@/lib/theme";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { Stethoscope } from "lucide-react-native";

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const phoneDigits = phone.replace(/\D/g, "");
  const fullPhone = `+216${phoneDigits}`;
  const isValid = phoneDigits.length === 8;

  async function handleSend() {
    if (!isValid) return;
    setLoading(true);
    setError("");
    try {
      await api.requestOtp(fullPhone);
      router.push({ pathname: "/(auth)/otp", params: { phone: fullPhone } });
    } catch (e: any) {
      setError(e.message || "Erreur d'envoi du code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <View style={styles.logo}>
          <Stethoscope size={32} color={colors.white} strokeWidth={2.5} />
        </View>
        <Text style={styles.title}>Bienvenue sur Doktori</Text>
        <Text style={styles.subtitle}>
          Entrez votre numéro de téléphone pour vous connecter
        </Text>

        <View style={styles.phoneRow}>
          <View style={styles.prefix}>
            <Text style={styles.prefixText}>+216</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label=""
              placeholder="XX XXX XXX"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={8}
              error={error || undefined}
            />
          </View>
        </View>

        <Button
          title="Recevoir le code"
          onPress={handleSend}
          loading={loading}
          disabled={!isValid}
          style={{ marginTop: spacing.lg }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { flex: 1, justifyContent: "center", padding: spacing.xl },
  logo: {
    width: 64, height: 64, borderRadius: radius.lg, backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: spacing.lg,
  },
  title: { fontSize: 24, fontWeight: "700", color: colors.ink, textAlign: "center" },
  subtitle: { fontSize: 14, color: colors.slate500, textAlign: "center", marginTop: spacing.sm, marginBottom: spacing.xl },
  phoneRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  prefix: {
    backgroundColor: colors.mist, paddingHorizontal: 14, paddingVertical: 13,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border,
  },
  prefixText: { fontSize: 15, fontWeight: "600", color: colors.ink },
});
```

- [ ] **Step 3: Create OTP verification screen**

```typescript
// apps/mobile/app/(auth)/otp.tsx
import { useState, useEffect } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { colors, spacing } from "@/lib/theme";
import { OtpInput } from "@/components/ui/OtpInput";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { setToken, setPatient } from "@/lib/auth";

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(60);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [resendTimer]);

  async function handleVerify(code: string) {
    setLoading(true);
    setError("");
    try {
      const result = await api.verifyOtp(phone, code);
      await setToken(result.token);
      await setPatient(result.patient);
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message || "Code invalide");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResendTimer(60);
    try {
      await api.requestOtp(phone);
    } catch (e: any) {
      setError(e.message || "Erreur lors du renvoi");
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Vérification</Text>
        <Text style={styles.subtitle}>
          Entrez le code envoyé au {phone}
        </Text>

        <View style={{ marginVertical: spacing.xl }}>
          <OtpInput onComplete={handleVerify} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? <Text style={styles.hint}>Vérification...</Text> : null}

        <View style={styles.resendRow}>
          {resendTimer > 0 ? (
            <Text style={styles.hint}>Renvoyer dans {resendTimer}s</Text>
          ) : (
            <Button title="Renvoyer le code" onPress={handleResend} variant="secondary" />
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { flex: 1, justifyContent: "center", padding: spacing.xl },
  title: { fontSize: 24, fontWeight: "700", color: colors.ink, textAlign: "center" },
  subtitle: { fontSize: 14, color: colors.slate500, textAlign: "center", marginTop: spacing.sm },
  error: { fontSize: 14, color: colors.red, textAlign: "center", marginTop: spacing.sm },
  hint: { fontSize: 14, color: colors.slate500, textAlign: "center" },
  resendRow: { alignItems: "center", marginTop: spacing.lg },
});
```

- [ ] **Step 4: Rewrite root layout with auth gate + font loading**

```typescript
// apps/mobile/app/_layout.tsx
import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { getToken, isTokenValid } from "@/lib/auth";
import { colors } from "@/lib/theme";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "SpaceMono": require("../assets/fonts/SpaceMono-Regular.ttf"),
    // Add Figtree + NotoSans fonts when available in assets/fonts/
  });
  const [isReady, setIsReady] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    async function check() {
      const token = await getToken();
      setIsAuthed(token !== null && isTokenValid(token));
      setIsReady(true);
    }
    check();
  }, []);

  useEffect(() => {
    if (!isReady || !fontsLoaded) return;
    SplashScreen.hideAsync();

    const inAuth = segments[0] === "(auth)";
    if (!isAuthed && !inAuth) {
      router.replace("/(auth)/login");
    } else if (isAuthed && inAuth) {
      router.replace("/(tabs)");
    }
  }, [isReady, fontsLoaded, isAuthed, segments]);

  if (!isReady || !fontsLoaded) return null;

  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: colors.white }, headerTintColor: colors.primary }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="medecin/[slug]" options={{ title: "" }} />
      <Stack.Screen name="rdv/[slug]" options={{ title: "Prendre RDV" }} />
      <Stack.Screen name="rdv/[id]/confirmation" options={{ headerShown: false }} />
    </Stack>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add -A apps/mobile/app/
git commit -m "feat(mobile): auth flow — login + OTP + root layout auth gate

- (auth)/login.tsx: phone input with +216 prefix, sends OTP
- (auth)/otp.tsx: 6-digit auto-advance, 60s resend timer
- _layout.tsx: checks SecureStore JWT, redirects to login or tabs
- Font loading + splash screen handling"
```

---

## Task 6: Tabs Layout — 4 Tabs with Teal Theme

**Files:**
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`

- [ ] **Step 1: Rewrite tabs layout**

```typescript
// apps/mobile/app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { Search, Siren, Calendar, User } from "lucide-react-native";
import { colors } from "@/lib/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.slate500,
        tabBarStyle: { borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.white },
        headerTintColor: colors.ink,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Rechercher",
          tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
          headerTitle: "Doktori",
          headerTitleStyle: { fontWeight: "800", color: colors.ink },
        }}
      />
      <Tabs.Screen
        name="sos"
        options={{
          title: "SOS",
          tabBarIcon: ({ size }) => <Siren size={size} color={colors.red} />,
          tabBarLabelStyle: { color: colors.red, fontWeight: "700" },
          headerTitle: "SOS Docteur",
          headerStyle: { backgroundColor: "#FEF2F2" },
          headerTintColor: colors.red,
        }}
      />
      <Tabs.Screen
        name="mes-rdv"
        options={{
          title: "Mes RDV",
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
          headerTitle: "Mes rendez-vous",
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          headerTitle: "Mon profil",
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/\(tabs\)/_layout.tsx
git commit -m "feat(mobile): 4-tab layout with teal theme + lucide icons

Replace emoji icons with lucide-react-native (Search, Siren, Calendar, User).
Active tint: teal #0891B2. Add 4th tab: Profil."
```

---

## Task 7: Search Tab — Design System + Filter Chips

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`

- [ ] **Step 1: Rewrite search screen with design system**

Replace the entire file. Key changes: use `DoctorCard` component, add horizontal filter chips for specialty + city, use theme colors, add pull-to-refresh.

```typescript
// apps/mobile/app/(tabs)/index.tsx
import { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Search as SearchIcon } from "lucide-react-native";
import { api } from "@/lib/api";
import { SPECIALTIES, CITIES } from "@doktori/shared";
import { colors, spacing, radius } from "@/lib/theme";
import { DoctorCard } from "@/components/ui/DoctorCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState<string | undefined>();
  const [city, setCity] = useState<string | undefined>();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const doSearch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.searchDoctors(query, { specialty, city });
      setResults(data.hits || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [query, specialty, city]);

  useEffect(() => {
    const handler = setTimeout(doSearch, 300);
    return () => clearTimeout(handler);
  }, [doSearch]);

  function onRefresh() {
    setRefreshing(true);
    doSearch().finally(() => setRefreshing(false));
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Trouvez un médecin</Text>
        <View style={styles.searchRow}>
          <SearchIcon size={18} color={colors.slate500} />
          <TextInput
            style={styles.input}
            placeholder="Nom, spécialité, ville..."
            placeholderTextColor={colors.slate500}
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>

      {/* Filter chips */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={SPECIALTIES}
        keyExtractor={(s) => s.id}
        style={styles.chips}
        contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.chip, specialty === item.id && styles.chipActive]}
            onPress={() => setSpecialty(specialty === item.id ? undefined : item.id)}
          >
            <Text style={[styles.chipText, specialty === item.id && styles.chipTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        )}
      />

      {loading && !refreshing ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.md, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState icon="🔍" title="Recherchez un médecin" description="Tapez un nom, une spécialité ou une ville" />
          }
          renderItem={({ item }) => (
            <DoctorCard doctor={item} onPress={() => router.push(`/medecin/${item.slug}`)} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.md, paddingBottom: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 24, fontWeight: "700", color: colors.ink, marginBottom: spacing.md },
  searchRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.bg, paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  input: { flex: 1, fontSize: 16, color: colors.ink },
  chips: { maxHeight: 48, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  chip: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.mist, borderRadius: radius.full },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, color: colors.ink },
  chipTextActive: { color: colors.white, fontWeight: "600" },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/\(tabs\)/index.tsx
git commit -m "feat(mobile): search tab — design system, filter chips, DoctorCard, pull-to-refresh"
```

---

## Task 8: Mes RDV Tab — Full Implementation

**Files:**
- Modify: `apps/mobile/app/(tabs)/mes-rdv.tsx`

- [ ] **Step 1: Rewrite mes-rdv with appointment list**

```typescript
// apps/mobile/app/(tabs)/mes-rdv.tsx
import { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, Pressable, Alert, StyleSheet, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { api, ApiError } from "@/lib/api";
import { colors, spacing, radius } from "@/lib/theme";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type Appointment = {
  id: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorSlug: string;
  startsAt: string;
  status: string;
};

export default function MesRdvScreen() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.getMyAppointments();
      setAppointments(data.appointments ?? data ?? []);
    } catch (e) {
      if (e instanceof ApiError && e.status !== 401) {
        console.error("Failed to load appointments:", e);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function onRefresh() {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }

  async function handleCancel(id: string) {
    Alert.alert("Annuler ce RDV ?", "Cette action est irréversible.", [
      { text: "Non", style: "cancel" },
      {
        text: "Oui, annuler",
        style: "destructive",
        onPress: async () => {
          try {
            await api.cancelAppointment(id);
            load();
          } catch (e: any) {
            Alert.alert("Erreur", e.message);
          }
        },
      },
    ]);
  }

  if (loading) return <LoadingSpinner />;

  const now = new Date();
  const upcoming = appointments.filter((a) => new Date(a.startsAt) >= now && a.status !== "cancelled");
  const past = appointments.filter((a) => new Date(a.startsAt) < now || a.status === "cancelled");

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      data={[...upcoming, ...past]}
      keyExtractor={(a) => a.id}
      ListEmptyComponent={
        <EmptyState
          icon="📅"
          title="Aucun rendez-vous"
          description="Recherchez un médecin pour prendre votre premier RDV"
          ctaTitle="Rechercher"
          onCta={() => router.push("/(tabs)")}
        />
      }
      ListHeaderComponent={
        upcoming.length > 0 ? <Text style={styles.section}>À venir</Text> : null
      }
      renderItem={({ item, index }) => {
        const isFirstPast = index === upcoming.length && past.length > 0;
        const isPast = new Date(item.startsAt) < now || item.status === "cancelled";
        const canCancel = !isPast && item.status === "pending";
        return (
          <>
            {isFirstPast && <Text style={styles.section}>Passés</Text>}
            <Pressable
              style={[styles.card, isPast && { opacity: 0.6 }]}
              onPress={() => router.push(`/medecin/${item.doctorSlug}`)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.doctorName}>{item.doctorName}</Text>
                <Text style={styles.detail}>{item.doctorSpecialty}</Text>
                <Text style={styles.detail}>
                  {new Date(item.startsAt).toLocaleDateString("fr-FR", {
                    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                  })}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 8 }}>
                <StatusBadge status={item.status} />
                {canCancel && (
                  <Pressable onPress={() => handleCancel(item.id)}>
                    <Text style={styles.cancelText}>Annuler</Text>
                  </Pressable>
                )}
              </View>
            </Pressable>
          </>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  section: { fontSize: 14, fontWeight: "700", color: colors.slate500, marginTop: spacing.md, marginBottom: spacing.sm, textTransform: "uppercase" },
  card: {
    backgroundColor: colors.white, padding: spacing.md, borderRadius: radius.md,
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm,
  },
  doctorName: { fontSize: 16, fontWeight: "600", color: colors.ink },
  detail: { fontSize: 13, color: colors.slate500, marginTop: 2 },
  cancelText: { fontSize: 12, color: colors.red, fontWeight: "600" },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/\(tabs\)/mes-rdv.tsx
git commit -m "feat(mobile): mes-rdv tab — appointment list with cancel, grouped by upcoming/past"
```

---

## Task 9: Doctor Detail — Enhanced with Reviews + Education

**Files:**
- Modify: `apps/mobile/app/medecin/[slug].tsx`

- [ ] **Step 1: Rewrite doctor detail**

Replace the entire file with an enhanced version that includes: education/experience lists, reviews section, insurance badges, share button, sticky CTA. Use design system colors. All data comes from the API response which already includes JSONB fields (`educations`, `experiences`, `languages`, `expertise`).

Replace entire file with:

```typescript
// apps/mobile/app/medecin/[slug].tsx
import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Share } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Share2 } from "lucide-react-native";
import { api } from "@/lib/api";
import { SPECIALTIES, CITIES } from "@doktori/shared";
import { colors, spacing, radius } from "@/lib/theme";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function DoctorScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [doctor, setDoctor] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDoctor(slug).then((d) => {
      setDoctor(d);
      setLoading(false);
      if (d?.id) api.getDoctorReviews(d.id).then((r) => setReviews(r.reviews ?? r ?? [])).catch(() => {});
    }).catch(() => setLoading(false));
  }, [slug]);

  if (loading) return <LoadingSpinner />;
  if (!doctor) return <Text style={{ padding: 20, color: colors.ink }}>Médecin introuvable</Text>;

  const spec = SPECIALTIES.find((s) => s.id === doctor.specialty);
  const city = CITIES.find((c) => c.id === doctor.city);

  return (
    <>
      <Stack.Screen options={{ title: doctor.name }} />
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{doctor.name.charAt(0)}</Text>
            </View>
            <Text style={styles.name}>{doctor.name}</Text>
            <Text style={styles.specialty}>{spec?.label ?? doctor.specialty}</Text>
            <Text style={styles.city}>{city?.label ?? doctor.city}</Text>
            {doctor.consultationFee && (
              <Text style={styles.fee}>Consultation : {doctor.consultationFee / 1000} DT</Text>
            )}
            <Pressable style={styles.shareBtn} onPress={() => Share.share({ url: `https://doktori.tn/medecin/${slug}` })}>
              <Share2 size={18} color={colors.primary} />
              <Text style={styles.shareText}>Partager</Text>
            </Pressable>
          </View>

          {/* Bio */}
          {doctor.bio && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>À propos</Text>
              <Text style={styles.bioText}>{doctor.bio}</Text>
            </View>
          )}

          {/* Education */}
          {doctor.educations?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Formation</Text>
              {doctor.educations.map((e: any, i: number) => (
                <View key={i} style={styles.timelineItem}>
                  <View style={styles.dot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{e.degree}</Text>
                    <Text style={styles.itemSub}>{e.institution} {e.year ? `· ${e.year}` : ""}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Experience */}
          {doctor.experiences?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Expérience</Text>
              {doctor.experiences.map((e: any, i: number) => (
                <View key={i} style={styles.timelineItem}>
                  <View style={styles.dot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{e.position}</Text>
                    <Text style={styles.itemSub}>{e.institution} {e.period ? `· ${e.period}` : ""}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Languages + Expertise */}
          {(doctor.languages?.length > 0 || doctor.expertise?.length > 0) && (
            <View style={styles.section}>
              {doctor.languages?.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Langues</Text>
                  <View style={styles.chipRow}>
                    {doctor.languages.map((l: string) => (
                      <View key={l} style={styles.chip}><Text style={styles.chipText}>{l}</Text></View>
                    ))}
                  </View>
                </>
              )}
              {doctor.expertise?.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>Expertise</Text>
                  <View style={styles.chipRow}>
                    {doctor.expertise.map((e: string) => (
                      <View key={e} style={styles.chip}><Text style={styles.chipText}>{e}</Text></View>
                    ))}
                  </View>
                </>
              )}
            </View>
          )}

          {/* Reviews */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Avis patients ({reviews.length})</Text>
            {reviews.length === 0 ? (
              <Text style={styles.emptyText}>Aucun avis pour le moment</Text>
            ) : (
              reviews.slice(0, 5).map((r: any) => (
                <View key={r.id} style={styles.reviewCard}>
                  <View style={{ flexDirection: "row", gap: 2 }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Text key={i} style={{ color: i < r.rating ? "#F59E0B" : "#D1D5DB", fontSize: 16 }}>★</Text>
                    ))}
                  </View>
                  {r.comment && <Text style={styles.reviewText}>{r.comment}</Text>}
                  <Text style={styles.reviewDate}>
                    {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                  </Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {/* Sticky CTA */}
        <View style={styles.stickyCta}>
          <Button title="Prendre rendez-vous" onPress={() => router.push(`/rdv/${doctor.slug}`)} />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.white, padding: spacing.xl, alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.mist, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  avatarText: { fontSize: 32, fontWeight: "700", color: colors.primary },
  name: { fontSize: 22, fontWeight: "700", color: colors.ink },
  specialty: { fontSize: 16, color: colors.primary, marginTop: 4 },
  city: { fontSize: 14, color: colors.slate500, marginTop: 2 },
  fee: { fontSize: 14, color: colors.ink, marginTop: spacing.sm, fontWeight: "600" },
  shareBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.md, paddingVertical: 6 },
  shareText: { fontSize: 14, color: colors.primary, fontWeight: "600" },
  section: { backgroundColor: colors.white, margin: spacing.md, marginBottom: 0, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.ink, marginBottom: spacing.sm },
  bioText: { fontSize: 14, color: colors.ink, lineHeight: 20 },
  timelineItem: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginBottom: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
  itemTitle: { fontSize: 14, fontWeight: "600", color: colors.ink },
  itemSub: { fontSize: 13, color: colors.slate500, marginTop: 2 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.mist, borderRadius: radius.full },
  chipText: { fontSize: 13, color: colors.primary },
  reviewCard: { padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  reviewText: { fontSize: 14, color: colors.ink, marginTop: 4, lineHeight: 20 },
  reviewDate: { fontSize: 12, color: colors.slate500, marginTop: 4 },
  emptyText: { fontSize: 14, color: colors.slate500 },
  stickyCta: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: colors.white, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/medecin/\[slug\].tsx
git commit -m "feat(mobile): doctor detail — education, reviews, insurance, share, sticky CTA"
```

---

## Task 10: Booking Flow — Auth + Confirmation Screen

**Files:**
- Modify: `apps/mobile/app/rdv/[slug].tsx`
- Create: `apps/mobile/app/rdv/[id]/confirmation.tsx`

- [ ] **Step 1: Update booking screen**

In `apps/mobile/app/rdv/[slug].tsx`:
- Import `colors, spacing, radius` from theme and replace all hardcoded colors
- Auto-fill patient name/phone from `getPatient()`
- Navigate to confirmation on success
- Use `Button` component

Key changes from the existing file:
- Line 4: add `import { colors, spacing, radius } from "@/lib/theme";` and `import { getPatient } from "@/lib/auth";` and `import { Button } from "@/components/ui/Button";`
- Line 15-16: add `useEffect` to auto-fill from stored patient: `getPatient().then(p => { if (p?.name) setName(p.name); if (p?.phone) setPhone(p.phone); });`
- Line 31: change `setSuccess(true)` to `router.replace(\`/rdv/${result.id}/confirmation\`)`
- Delete the inline success screen (lines 35-41)
- In StyleSheet: replace every `#2563eb` with `colors.primary`, `#f9fafb` with `colors.bg`, `#e5e7eb` with `colors.border`, `#111827` with `colors.ink`, `#374151`/`#6b7280` with `colors.slate500`, `#f3f4f6` with `colors.mist`
- Replace the CTA Pressable at line 77 with: `<Button title={loading ? "Réservation..." : "Confirmer le RDV"} onPress={handleBook} loading={loading} disabled={!name || !phone} />`

- [ ] **Step 2: Create confirmation screen**

```typescript
// apps/mobile/app/rdv/[id]/confirmation.tsx
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { CircleCheckBig } from "lucide-react-native";
import { colors, spacing, radius } from "@/lib/theme";
import { Button } from "@/components/ui/Button";

export default function ConfirmationScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <CircleCheckBig size={72} color={colors.green} />
      <Text style={styles.title}>Rendez-vous confirmé !</Text>
      <Text style={styles.subtitle}>
        Vous recevrez un SMS de rappel la veille de votre consultation.
      </Text>
      <Button
        title="Voir mes rendez-vous"
        onPress={() => router.replace("/(tabs)/mes-rdv")}
        style={{ marginTop: spacing.xl, width: "100%" }}
      />
      <Button
        title="Retour à l'accueil"
        onPress={() => router.replace("/(tabs)")}
        variant="secondary"
        style={{ marginTop: spacing.sm, width: "100%" }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, backgroundColor: colors.white },
  title: { fontSize: 24, fontWeight: "700", color: colors.ink, marginTop: spacing.lg, textAlign: "center" },
  subtitle: { fontSize: 14, color: colors.slate500, textAlign: "center", marginTop: spacing.sm, lineHeight: 20 },
});
```

- [ ] **Step 3: Commit**

```bash
git add -A apps/mobile/app/rdv/
git commit -m "feat(mobile): booking — auto-fill patient info, confirmation screen with green check"
```

---

## Task 11: SOS — Auth Header + Haptics + Polish

**Files:**
- Modify: `apps/mobile/app/(tabs)/sos.tsx`
- Modify: `apps/mobile/lib/push.ts`

- [ ] **Step 1: Update SOS screen**

In `apps/mobile/app/(tabs)/sos.tsx`, apply these specific changes:

**Line 1:** Add imports:
```typescript
import * as Haptics from "expo-haptics";
import { colors, spacing, radius } from "@/lib/theme";
```

**Line 49:** Change polling interval:
```typescript
// was: pollRef.current = setInterval(poll, 3000);
pollRef.current = setInterval(poll, 5000);
```

**Line 58 (inside submitRequest, before setStep("locating")):** Add haptic:
```typescript
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
```

**StyleSheet color replacements (apply to all styles):**
- `"#dc2626"` → `colors.red` (primary buttons, symptom chips, error text)
- `"#fef2f2"` → remain as-is (it's the SOS-specific light red background — no theme equivalent needed)
- `"#111827"` → `colors.ink`
- `"#6b7280"` → `colors.slate500`
- `"#9ca3af"` → `colors.slate500`
- `"#374151"` → `colors.ink`
- `"#f3f4f6"` → `colors.mist`
- `"#e5e7eb"` → `colors.border`
- `"#ffffff"` → `colors.white`
- `"#22c55e"` → `colors.green`
- `"#f0fdf4"` → keep (success-specific green background)
- `"#15803d"` → `colors.greenDark`
- `"#92400e"` → keep (disclaimer-specific)
- `"#fef3c7"` / `"#fde68a"` → keep (disclaimer-specific amber)

The API calls (`api.sosRequest`, `api.sosSession`) already go through `apiFetch` which now attaches JWT automatically (from Task 4), so no additional auth code is needed in this file.

- [ ] **Step 2: Fix push notification color**

In `apps/mobile/lib/push.ts` line 21, change `lightColor: "#2563eb"` to `lightColor: "#0891B2"`.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(tabs\)/sos.tsx apps/mobile/lib/push.ts
git commit -m "fix(mobile): SOS — theme colors, 5s polling, haptic feedback, fix notification lightColor"
```

---

## Task 12: Profile Tab

**Files:**
- Create: `apps/mobile/app/(tabs)/profil.tsx`

- [ ] **Step 1: Create profile screen**

```typescript
// apps/mobile/app/(tabs)/profil.tsx
import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Linking, Alert } from "react-native";
import { useRouter } from "expo-router";
import { LogOut, Globe, Bell, Info } from "lucide-react-native";
import { colors, spacing, radius } from "@/lib/theme";
import { getPatient, logout, type Patient } from "@/lib/auth";
import { currentLocale, setLocale } from "@/lib/i18n";
import Constants from "expo-constants";

export default function ProfilScreen() {
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);

  useEffect(() => {
    getPatient().then(setPatient);
  }, []);

  async function handleLogout() {
    Alert.alert("Déconnexion", "Voulez-vous vous déconnecter ?", [
      { text: "Non", style: "cancel" },
      {
        text: "Oui",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {patient?.name?.charAt(0) || patient?.phone?.slice(-2) || "?"}
          </Text>
        </View>
        <Text style={styles.name}>{patient?.name || "Patient"}</Text>
        <Text style={styles.phone}>{patient?.phone}</Text>
      </View>

      <View style={styles.menu}>
        <MenuItem
          icon={Globe}
          label="Langue"
          value={currentLocale() === "ar" ? "العربية" : "Français"}
          onPress={() => {
            const next = currentLocale() === "ar" ? "fr" : "ar";
            Alert.alert(
              next === "ar" ? "تغيير اللغة" : "Changer la langue",
              next === "ar" ? "L'application redémarrera en arabe" : "L'application redémarrera en français",
              [
                { text: next === "ar" ? "إلغاء" : "Annuler", style: "cancel" },
                { text: "OK", onPress: () => setLocale(next) },
              ]
            );
          }}
        />
        <MenuItem icon={Bell} label="Notifications" onPress={() => Linking.openSettings()} />
        <MenuItem icon={Info} label="Version" value={Constants.expoConfig?.version ?? "1.0.0"} />
      </View>

      <Pressable style={styles.logoutBtn} onPress={handleLogout}>
        <LogOut size={18} color={colors.red} />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </Pressable>
    </View>
  );
}

function MenuItem({ icon: Icon, label, value, onPress }: {
  icon: any; label: string; value?: string; onPress?: () => void;
}) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <Icon size={20} color={colors.slate500} />
      <Text style={styles.menuLabel}>{label}</Text>
      {value ? <Text style={styles.menuValue}>{value}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.md },
  card: {
    backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.xl,
    alignItems: "center", borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.mist,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.md,
  },
  avatarText: { fontSize: 28, fontWeight: "700", color: colors.primary },
  name: { fontSize: 20, fontWeight: "700", color: colors.ink },
  phone: { fontSize: 14, color: colors.slate500, marginTop: 4 },
  menu: {
    backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  menuLabel: { flex: 1, fontSize: 15, color: colors.ink },
  menuValue: { fontSize: 14, color: colors.slate500 },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.sm, marginTop: spacing.xl, padding: spacing.md,
  },
  logoutText: { fontSize: 15, fontWeight: "600", color: colors.red },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/\(tabs\)/profil.tsx
git commit -m "feat(mobile): profile tab — patient info, settings, logout"
```

---

## Task 13: i18n — French + Arabic with RTL

**Files:**
- Create: `apps/mobile/lib/i18n.ts`
- Create: `apps/mobile/i18n/fr.json`
- Create: `apps/mobile/i18n/ar.json`

- [ ] **Step 1: Create i18n setup**

```typescript
// apps/mobile/lib/i18n.ts
import { I18n } from "i18n-js";
import { getLocales } from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { I18nManager } from "react-native";
import fr from "@/i18n/fr.json";
import ar from "@/i18n/ar.json";

const i18n = new I18n({ fr, ar });
i18n.defaultLocale = "fr";
i18n.enableFallback = true;

export async function initLocale() {
  const saved = await AsyncStorage.getItem("@doktori/locale");
  if (saved) {
    i18n.locale = saved;
  } else {
    const deviceLocale = getLocales()[0]?.languageCode ?? "fr";
    i18n.locale = deviceLocale === "ar" ? "ar" : "fr";
  }
  const isRtl = i18n.locale === "ar";
  if (I18nManager.isRTL !== isRtl) {
    I18nManager.forceRTL(isRtl);
  }
}

export async function setLocale(locale: "fr" | "ar") {
  i18n.locale = locale;
  await AsyncStorage.setItem("@doktori/locale", locale);
  const isRtl = locale === "ar";
  if (I18nManager.isRTL !== isRtl) {
    I18nManager.forceRTL(isRtl);
    // App restart needed for RTL to take effect
  }
}

export function t(key: string, options?: Record<string, any>): string {
  return i18n.t(key, options);
}

export function currentLocale(): string {
  return i18n.locale;
}

export default i18n;
```

- [ ] **Step 2: Create French translation file**

```json
// apps/mobile/i18n/fr.json
{
  "nav": {
    "search": "Rechercher",
    "sos": "SOS",
    "appointments": "Mes RDV",
    "profile": "Profil"
  },
  "search": {
    "title": "Trouvez un médecin",
    "subtitle": "Réservez en 2 clics",
    "placeholder": "Nom, spécialité, ville...",
    "empty": "Recherchez un médecin",
    "emptyDesc": "Tapez un nom, une spécialité ou une ville",
    "noResults": "Aucun résultat"
  },
  "auth": {
    "welcome": "Bienvenue sur Doktori",
    "phonePrompt": "Entrez votre numéro de téléphone pour vous connecter",
    "sendCode": "Recevoir le code",
    "verifyTitle": "Vérification",
    "verifyPrompt": "Entrez le code envoyé au {phone}",
    "resendIn": "Renvoyer dans {seconds}s",
    "resend": "Renvoyer le code",
    "verifying": "Vérification...",
    "invalidCode": "Code invalide"
  },
  "doctor": {
    "bookCta": "Prendre rendez-vous",
    "consultation": "Consultation : {fee} DT",
    "experience": "Expérience",
    "education": "Formation",
    "reviews": "Avis patients",
    "noReviews": "Aucun avis",
    "languages": "Langues",
    "insurance": "Conventions",
    "share": "Partager"
  },
  "booking": {
    "title": "Prendre RDV",
    "pickDate": "Choisissez une date",
    "pickSlot": "Choisissez un créneau",
    "noSlots": "Aucun créneau disponible ce jour",
    "yourInfo": "Vos coordonnées",
    "name": "Nom complet",
    "phone": "Téléphone",
    "reason": "Motif (optionnel)",
    "confirm": "Confirmer le RDV",
    "booking": "Réservation...",
    "confirmed": "Rendez-vous confirmé !",
    "smsReminder": "Vous recevrez un SMS de rappel la veille.",
    "viewAppointments": "Voir mes rendez-vous",
    "backHome": "Retour à l'accueil"
  },
  "appointments": {
    "title": "Mes rendez-vous",
    "upcoming": "À venir",
    "past": "Passés",
    "empty": "Aucun rendez-vous",
    "emptyDesc": "Recherchez un médecin pour prendre votre premier RDV",
    "searchCta": "Rechercher",
    "cancel": "Annuler",
    "cancelConfirm": "Annuler ce RDV ?",
    "cancelWarning": "Cette action est irréversible.",
    "yes": "Oui, annuler",
    "no": "Non"
  },
  "sos": {
    "title": "SOS Docteur",
    "intro": "Trouvez un médecin disponible près de vous en 2 minutes.",
    "cta": "Demander un médecin maintenant",
    "formTitle": "Informations",
    "name": "Votre nom",
    "phone": "Téléphone",
    "symptom": "Type de symptôme",
    "description": "Description (optionnel)",
    "descPlaceholder": "Décrivez vos symptômes...",
    "send": "Envoyer la demande",
    "cancel": "Annuler",
    "locating": "Obtention de votre position...",
    "searching": "Recherche d'un médecin...",
    "searchingDesc": "Nous contactons les médecins disponibles dans votre zone.",
    "cancelRequest": "Annuler la demande",
    "found": "Médecin trouvé !",
    "call": "Appeler maintenant",
    "newRequest": "Nouvelle demande",
    "noDoctor": "Aucun médecin disponible",
    "noDoctorDesc": "Réessayez dans quelques minutes.",
    "retry": "Réessayer",
    "disclaimer": "Pour une urgence vitale, composez le 190 (SAMU). Doktori SOS est destiné aux consultations urgentes non-vitales.",
    "namePhoneRequired": "Nom et téléphone requis",
    "locationDenied": "Permission de géolocalisation refusée"
  },
  "profile": {
    "title": "Mon profil",
    "language": "Langue",
    "notifications": "Notifications",
    "version": "Version",
    "logout": "Se déconnecter",
    "logoutConfirm": "Voulez-vous vous déconnecter ?",
    "yes": "Oui",
    "no": "Non"
  },
  "common": {
    "error": "Erreur",
    "loading": "Chargement...",
    "dt": "DT"
  }
}
```

- [ ] **Step 3: Create Arabic translation file**

Same structure, Arabic values. Key translations:
```json
// apps/mobile/i18n/ar.json — write the Arabic translations matching every key in fr.json
```

Note: use the same key structure as fr.json. For Arabic medical terms, use standard MSA (فصحى). Example: "Trouvez un médecin" → "ابحث عن طبيب", "Prendre rendez-vous" → "احجز موعد".

- [ ] **Step 4: Wire i18n into root layout**

In `apps/mobile/app/_layout.tsx`, add `initLocale()` call in the `check()` function:

```typescript
import { initLocale } from "@/lib/i18n";
// ...inside check():
await initLocale();
```

- [ ] **Step 5: Commit**

```bash
git add -A apps/mobile/lib/i18n.ts apps/mobile/i18n/ apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): i18n — French + Arabic with RTL support

- lib/i18n.ts: i18n-js + expo-localization + AsyncStorage locale
- 60 translation keys covering all screens
- RTL via I18nManager.forceRTL for Arabic
- initLocale() called on app startup"
```

---

## Task 14: Push Notifications Wiring

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`
- Modify: `apps/mobile/lib/push.ts`

- [ ] **Step 1: Refactor push.ts to use centralized API_URL**

In `apps/mobile/lib/push.ts`, change `registerTokenWithServer` to use the `api.registerPushToken()` function from `lib/api.ts` instead of doing its own fetch. Delete the old function and export a simpler one:

```typescript
// At the end of lib/push.ts, replace registerTokenWithServer with:
export async function registerPushTokenIfNeeded() {
  const token = await registerForPushNotifications();
  if (token) {
    const { api } = await import("./api");
    await api.registerPushToken(token).catch((e: any) =>
      console.error("Push token registration failed:", e)
    );
  }
}
```

- [ ] **Step 2: Wire notification handlers in root layout**

In `apps/mobile/app/_layout.tsx`, after successful auth check, add:

```typescript
import * as Notifications from "expo-notifications";
import { registerPushTokenIfNeeded } from "@/lib/push";

// At module level (before component):
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Inside the useEffect that runs after auth is confirmed:
if (isAuthed) {
  registerPushTokenIfNeeded();
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/lib/push.ts apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): wire push notifications — register token after auth, foreground handler"
```

---

## Task 15: EAS Config + Environment

**Files:**
- Create: `apps/mobile/eas.json`
- Create: `apps/mobile/.env`

- [ ] **Step 1: Create EAS config**

```json
// apps/mobile/eas.json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_URL": "http://157.90.152.204:3005",
        "EXPO_PUBLIC_DEV_MODE": "true"
      }
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_URL": "http://157.90.152.204:3005",
        "EXPO_PUBLIC_DEV_MODE": "false"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://doktori.tn",
        "EXPO_PUBLIC_DEV_MODE": "false"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

- [ ] **Step 2: Create local .env**

```bash
# apps/mobile/.env
EXPO_PUBLIC_API_URL=http://157.90.152.204:3005
EXPO_PUBLIC_DEV_MODE=true
```

- [ ] **Step 3: Add .env to .gitignore**

```bash
echo "apps/mobile/.env" >> .gitignore
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/eas.json .gitignore
git commit -m "chore(mobile): EAS build config — dev/preview/production profiles"
```

---

## Task 16: Content Verification Against Prod

This is a manual testing task. No code changes.

- [ ] **Step 1: Start Expo dev server pointed at prod**

```bash
cd apps/mobile
EXPO_PUBLIC_API_URL=http://157.90.152.204:3005 npx expo start
```

- [ ] **Step 2: Test each flow on physical device**

Checklist:
1. App opens → redirected to login screen
2. Enter phone → OTP sent (check server logs for code)
3. Enter OTP → logged in, redirected to search tab
4. Search "dermatologue" → results appear
5. Tap a doctor → detail page loads with education, reviews
6. Tap "Prendre RDV" → booking flow opens, dates/slots load
7. Book an appointment → confirmation screen
8. Switch to "Mes RDV" tab → appointment appears
9. Cancel the appointment → status changes
10. Switch to SOS tab → submit request with location
11. Profile tab → shows phone, can log out
12. Log out → back to login screen

- [ ] **Step 3: Note any API errors or missing data**

If any endpoint returns unexpected shape, document it and fix the API client or the screen.
