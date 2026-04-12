# Doktori Mobile App — Design Spec

## Goal

Ship Doktori on iOS and Android App Stores with a polished patient experience: search doctors, book appointments, manage bookings, emergency SOS — all authenticated via phone OTP, bilingual (FR/AR with RTL), and branded consistently with the web platform.

## Context

- **Web MVP** is live at `157.90.152.204:3005` — 65 seeded doctors, 881 reviews, patient booking flow working
- **Mobile skeleton** exists at `apps/mobile/` — Expo 54, Expo Router 6, 3 tab screens (search, SOS, mes-rdv placeholder), doctor detail + booking screens
- **What works:** Search hits `/api/search`, SOS flow is fully built, booking flow submits appointments
- **Known bugs:** Doctor detail fetches `/api/doctors/${slug}` but correct path is `/api/doctors/by-slug/${slug}` — will 404 on prod. Must be fixed in API client.
- **What's missing:** Authentication (no login/OTP), mes-rdv is a placeholder, no design system (Expo defaults everywhere), no i18n, push notifications coded but not wired, all icons are Expo defaults
- **Backend is ready:** All patient-facing API routes exist and are tested on prod

## Non-Goals (v1.0)

- In-app payment/billing
- Teleconsultation (video)
- Medical records viewer
- Writing reviews (read-only display in doctor detail is in scope)
- Home visit booking
- Offline mode / caching
- Social login (Apple/Google)
- Dark mode (infrastructure only, no styled themes)

---

## 1. Branding & App Identity

### Logo

The web logo is CSS-rendered: teal `#0891B2` rounded square with white Lucide Stethoscope icon + green `#22C55E` pulsing dot (online indicator) + "Doktori.tn" text.

**Action:** Create a master 1024x1024 PNG app icon replicating this visual:
- Teal `#0891B2` background with 20% corner radius
- White stethoscope silhouette (centered, ~60% of icon area)
- Small green `#22C55E` dot in top-right quadrant

**Generated assets:**
- `apps/mobile/assets/images/icon.png` — 1024x1024 (iOS App Store + home screen)
- `apps/mobile/assets/images/adaptive-icon.png` — foreground layer (stethoscope + dot on transparent), background color `#0891B2` set in `app.json`
- `apps/mobile/assets/images/splash-icon.png` — same icon, used during app launch
- `apps/web/public/` — full favicon set via realfavicongenerator.net: `favicon.ico`, `apple-touch-icon.png` (180x180), `favicon-32x32.png`, `favicon-16x16.png`, `site.webmanifest`, OG image (1200x630)

**Tool chain:** Create SVG in code → render to 1024x1024 PNG via `sharp` (Node script) → use as source for all sizes. Expo handles iOS/Android sizing from the 1024 source. Web favicons generated via realfavicongenerator.net.

### App Store Listing

- **Name:** Doktori
- **Subtitle FR:** Trouvez un médecin, prenez RDV
- **Subtitle AR:** ابحث عن طبيب، احجز موعد
- **Category:** Medical / Health & Fitness
- **Bundle ID:** `tn.doktori.app`

### Expo Config (`app.json`)

Update:
- `name`: "Doktori"
- `slug`: "doktori"
- `icon`: point to new icon
- `splash.backgroundColor`: `#0891B2`
- `android.adaptiveIcon.backgroundColor`: `#0891B2`
- `ios.bundleIdentifier`: `tn.doktori.app`
- `android.package`: `tn.doktori.app`

---

## 1b. New Dependencies

These must be added to `apps/mobile/package.json`:

| Package | Purpose |
|---------|---------|
| `expo-secure-store` | JWT token storage (auth gate) |
| `expo-haptics` | Haptic feedback on SOS button |
| `expo-calendar` | Add appointment to calendar |
| `expo-localization` | Detect device locale |
| `i18n-js` | Lightweight translation runtime |
| `@react-native-async-storage/async-storage` | Locale preference persistence |
| `lucide-react-native` | Icon library matching web |

## 1c. Cleanup

Delete stale Expo template files:
- `apps/mobile/app/(tabs)/two.tsx`
- `apps/mobile/app/modal.tsx`
- `apps/mobile/app/+html.tsx`
- `apps/mobile/components/EditScreenInfo.tsx`

## 1d. Minimum OS Versions

- iOS: 15.1+ (Expo 54 default)
- Android: SDK 24 / Android 7.0+ (Expo 54 default)

## 1e. Privacy & Legal

Both App Store and Google Play require a privacy policy URL for medical apps. Create a simple privacy policy page at `doktori.tn/legal/confidentialite` (already exists on web). Reference Tunisia's Law No. 2004-63 on personal data protection.

---

## 2. Architecture & Navigation

### Stack

Expo 54 + Expo Router 6 (file-based routing) + React Native 0.81 + React 19. Shared workspace packages: `@doktori/shared` (constants, types), `@doktori/validation` (Zod schemas).

### Route Structure

```
app/
├── _layout.tsx                 ← Root Stack, auth gate
├── (auth)/
│   ├── _layout.tsx             ← Stack without tabs
│   ├── login.tsx               ← Phone number input
│   └── otp.tsx                 ← OTP 6-digit verification
├── (tabs)/
│   ├── _layout.tsx             ← Tab navigator (4 tabs)
│   ├── index.tsx               ← Search/discover (EXISTS, enhance)
│   ├── sos.tsx                 ← SOS emergency (EXISTS, fix auth)
│   ├── mes-rdv.tsx             ← My appointments (REWRITE)
│   └── profil.tsx              ← Profile + settings (NEW)
├── medecin/
│   └── [slug].tsx              ← Doctor detail (EXISTS, enhance)
├── rdv/
│   ├── [slug].tsx              ← Booking flow (EXISTS, wire auth)
│   └── [id]/
│       └── confirmation.tsx    ← Booking confirmation (NEW)
└── +not-found.tsx              ← 404
```

### Auth Gate

`app/_layout.tsx` checks for a JWT in `expo-secure-store`:
- Token present + valid → render `(tabs)` group
- No token or expired → render `(auth)` group
- Token validation: decode JWT locally (check `exp`), no network call on launch

---

## 3. Authentication Flow

### Login Screen (`(auth)/login.tsx`)

- Input: phone number with `+216` prefix (Tunisian numbers)
- Validation: 8 digits after prefix (via `@doktori/validation`)
- Submit: `POST /api/auth/otp/request` with `{ phone }`
- Dev mode: if `EXPO_PUBLIC_DEV_MODE=true`, the backend must be modified to return the OTP code in the response (currently only logs it server-side). Alternatively, check server logs for the code during development.
- UI: Doktori logo, teal accent, "Bienvenue sur Doktori" heading

### OTP Screen (`(auth)/otp.tsx`)

- 6-digit code input (auto-focus, auto-advance between digits)
- Submit: `POST /api/auth/otp/verify` with `{ phone, code }`
- Response: `{ token, patient: { id, phone } }` (note: no `name` field — patients are created with `name: ""`)
- After first login, if `patient.name` is empty, show a "complete your profile" modal (name input)
- Store token in `SecureStore.setItemAsync("jwt", token)`
- Store patient data in `SecureStore.setItemAsync("patient", JSON.stringify(patient))`
- Resend timer: 60 seconds countdown before allowing resend
- Navigate to `(tabs)` on success

### Token Management

- `lib/auth.ts` exports:
  - `getToken(): Promise<string | null>` — reads from SecureStore
  - `getPatient(): Promise<Patient | null>` — reads cached patient
  - `logout(): Promise<void>` — clears SecureStore, navigates to login
  - `isTokenValid(token: string): boolean` — checks JWT expiry locally

---

## 4. Screens Specification

### 4.1 Search Tab (`(tabs)/index.tsx`) — ENHANCE

**Currently:** Works with search API, shows doctor cards with inline styles.

**Changes:**
- Port to design system colors (teal accents, Figtree headings)
- Add horizontal filter chips: specialty (from `SPECIALTIES`), city (from `CITIES`)
- Extract `DoctorCard` component (reusable in search + mes-rdv)
- Add pull-to-refresh
- Empty state: illustration + "Aucun résultat" message

### 4.2 SOS Tab (`(tabs)/sos.tsx`) — FIX

**Currently:** Fully implemented multi-step flow, red theme, polls every 3s.

**Changes:**
- Add JWT auth header to `/api/sos/request` call
- Port inline styles to design system
- Add haptic feedback on SOS button press
- Reduce polling interval to 5s (3s is aggressive on battery)
- Handle auth expired during polling gracefully

### 4.3 My Appointments Tab (`(tabs)/mes-rdv.tsx`) — REWRITE

**Currently:** Placeholder redirecting to web.

**Implementation:**
- Fetch from `GET /api/appointments/patient` with JWT
- Show list grouped by date (upcoming first, past below)
- Each card: doctor name, specialty, date/time, status badge
- Pull-to-refresh
- Cancel action on upcoming appointments (with confirmation dialog)
- Empty state: "Aucun rendez-vous" + CTA to search
- Navigate to doctor detail on card tap

### 4.4 Profile Tab (`(tabs)/profil.tsx`) — NEW

- Patient info display: name, phone (from stored patient data)
- Language switcher: FR / AR toggle (stored in AsyncStorage, triggers `I18nManager.forceRTL()` for Arabic)
- Push notification toggle (enable/disable via system settings deep link)
- Version info
- Logout button (clears SecureStore, navigates to auth)

### 4.5 Doctor Detail (`medecin/[slug].tsx`) — ENHANCE

**Currently:** Shows name, specialty, city, fee, bio, CTA button.

**Changes:**
- Add education timeline (`doctor.educations` JSONB array)
- Add experience list (`doctor.experiences` JSONB array)
- Add languages + expertise badges
- Add insurance badges (from `doctor.insurances` relation)
- Add reviews section: latest 5 reviews with rating stars, pull from `/api/reviews?doctorId=X`
- Share button (native share sheet with doctor profile URL)
- Sticky bottom CTA bar: "Prendre RDV" button

### 4.6 Booking Flow (`rdv/[slug].tsx`) — WIRE AUTH

**Currently:** Full flow works but sends no auth.

**Changes:**
- Add JWT to appointment creation `POST /api/appointments`
- Validate patient info with `@doktori/validation` Zod schemas
- On success → navigate to `rdv/[id]/confirmation`

### 4.7 Booking Confirmation (`rdv/[id]/confirmation.tsx`) — NEW

- Success checkmark animation
- Appointment summary: doctor, date, time, address
- "Ajouter au calendrier" button (expo-calendar integration)
- "Voir mes rendez-vous" link → navigate to mes-rdv tab
- Deep link: shareable URL for the appointment

---

## 5. Design System

### Theme Constants (`lib/theme.ts`)

```typescript
export const colors = {
  primary: "#0891B2",       // Medical teal
  primaryDark: "#0E7490",
  primaryLight: "#22D3EE",
  green: "#22C55E",
  greenDark: "#16A34A",
  red: "#DC2626",           // SOS / danger
  ink: "#134E4A",           // Dark text
  mist: "#F0FDFA",          // Light backgrounds
  cream: "#FAFDFC",
  border: "#E6F4F1",
  slate500: "#64748B",      // Secondary text
  white: "#FFFFFF",
};

export const fonts = {
  heading: "Figtree",       // Loaded via expo-font
  body: "NotoSans",
};

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32,
};

export const radius = {
  sm: 8, md: 12, lg: 16, xl: 24, full: 9999,
};
```

### Reusable Components (`components/`)

| Component | Purpose |
|-----------|---------|
| `Button` | Primary (teal filled), secondary (outlined), danger (red) variants, loading state |
| `DoctorCard` | Pressable card: avatar, name, specialty, city, fee, rating. Used in search + mes-rdv |
| `StatusBadge` | Colored pill: pending (amber), confirmed (blue), completed (green), cancelled (red) |
| `Input` | Themed text input with label, error state, phone variant with +216 prefix |
| `OtpInput` | 6-digit code boxes with auto-advance |
| `EmptyState` | Icon + title + description + optional CTA |
| `LoadingSpinner` | Centered teal spinner |

### Fonts

Load via `expo-font` in root layout:
- Figtree-Regular, Figtree-Bold, Figtree-Black (headings)
- NotoSans-Regular, NotoSans-Medium, NotoSans-Bold (body)

### Color Migration

The current skeleton uses blue `#2563eb` throughout (header tint, tab active color, notification channel). All instances must be replaced with the teal palette (`#0891B2` primary). Search codebase for `#2563eb` and replace.

### Tab Bar

Custom styled tab bar:
- Background: white with top border `#E6F4F1`
- Active tint: `#0891B2` (teal)
- Inactive tint: `#64748B` (slate)
- Icons: lucide-react-native equivalents or @expo/vector-icons
- Labels: always visible, Noto Sans medium

---

## 6. Internationalization (FR + AR)

### Library

`expo-localization` (device locale detection) + `i18n-js` (lightweight translation runtime).

### Translation Source

Author mobile-specific translations from scratch in `apps/mobile/i18n/fr.json` and `ar.json`. The web app's i18n files use `next-intl` format which differs from `i18n-js`. Define ~60 keys covering: nav, search, booking, appointments, profile, sos, auth, errors.

### RTL Support

- Detect `ar` locale → `I18nManager.forceRTL(true)` + restart prompt
- Store preference in AsyncStorage (`@doktori/locale`)
- Profile tab has manual FR/AR toggle

### Affected Screens

All screens use `t("key")` instead of hardcoded French strings. ~60 translation keys for the mobile MVP.

---

## 7. Push Notifications

### Existing Code

`lib/push.ts` has `registerForPushNotifications()` and `registerTokenWithServer()` — both implemented but not called.

### Integration Points

1. **After OTP login success:** Call `registerForPushNotifications()` → if granted, call `registerTokenWithServer(expoPushToken, jwt, API_URL)` (note: existing function takes 3 args in this order — refactor to use centralized `API_URL` from `lib/api.ts`)
2. **Notification handlers** in root layout: 
   - Foreground: show in-app banner
   - Background: badge count
   - Tap: deep link to relevant screen (appointment detail, SOS status)

### Android Notification Icon

Create a monochrome white-on-transparent PNG (96x96) of the stethoscope silhouette for Android notification small icon. Configure in `app.json` under `android.adaptiveIcon` or notification config.

### Trigger Scenarios (Backend)

These already exist or are trivial backend additions:
- Appointment confirmed → push to patient
- Appointment reminder (1h before) → push to patient
- SOS doctor accepted → push to patient
- Review request (24h after completed visit) → push to patient

---

## 8. API Client (`lib/api.ts`)

### Current State

Generic `apiFetch<T>()` with base URL from env. No auth, no error types.

### Improvements

```typescript
// Attach JWT to every request
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options?.headers as Record<string, string>) ?? {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    await logout(); // Token expired, force re-auth
    throw new ApiError(401, "Session expirée");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? "Erreur serveur");
  }

  return res.json();
}
```

### Bug Fix Required

The existing `lib/api.ts` calls `/api/doctors/${slug}` (line 24) but the correct backend path is `/api/doctors/by-slug/${slug}`. This must be fixed as part of API client hardening — the current doctor detail screen 404s on prod.

### Endpoints to Call

| Endpoint | Method | Screen |
|----------|--------|--------|
| `/api/auth/otp/request` | POST | Login |
| `/api/auth/otp/verify` | POST | OTP |
| `/api/search` | GET | Search |
| `/api/doctors/by-slug/[slug]` | GET | Doctor detail |
| `/api/doctors/by-slug/[slug]/availability` | GET | Booking |
| `/api/appointments` | POST | Booking |
| `/api/appointments/patient` | GET | Mes RDV |
| `/api/appointments/[id]/cancel` | POST | Mes RDV |
| `/api/reviews?doctorId=X` | GET | Doctor detail |
| `/api/sos/request` | POST | SOS |
| `/api/sos/session/[id]` | GET | SOS |
| `/api/push/register` | POST | After login |

---

## 9. Environment & Build

### Environment Variables

```
EXPO_PUBLIC_API_URL=http://157.90.152.204:3005  # prod
EXPO_PUBLIC_DEV_MODE=false                       # true in dev: shows OTP in alert
```

### EAS Build

- Configure `eas.json` with `development`, `preview`, `production` profiles
- iOS: requires Apple Developer account ($99/year)
- Android: requires Google Play Developer account ($25 one-time)

### Testing

- **Dev:** Expo Go on physical device pointed at prod API
- **Preview:** EAS Build → internal distribution (TestFlight + Play internal track)
- **Prod:** EAS Submit → App Store + Google Play

---

## 10. Implementation Priority

| Order | Task | Effort |
|-------|------|--------|
| 1 | Design system (theme + 7 components) | Medium |
| 2 | App icon generation + branding | Low |
| 3 | Auth flow (login + OTP + token management) | Medium |
| 4 | API client hardening (JWT, errors, retry) | Low |
| 5 | Enhance search tab (filters, design system) | Low |
| 6 | Implement mes-rdv tab | Medium |
| 7 | Enhance doctor detail (reviews, education, insurance) | Medium |
| 8 | Wire booking flow auth + confirmation screen | Low |
| 9 | Fix SOS auth + polish | Low |
| 10 | Profile tab (settings, language, logout) | Low |
| 11 | i18n (FR + AR with RTL) | Medium |
| 12 | Push notifications wiring | Low |
| 13 | Expo config + EAS setup | Low |
| 14 | Content verification against prod | Low |

Estimated total: ~5 days solo with Claude Code.
