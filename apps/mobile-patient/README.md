# Doktori — Mobile Patient App

Expo (React Native) app for patients — the mobile counterpart of the web `/rdv` flow.

## Setup

```bash
# From repo root
pnpm install

# Install native deps (first time only)
cd apps/mobile-patient
npx expo install
```

## Run

```bash
# Dev server (scan QR with Expo Go on iOS/Android)
pnpm --filter @doktori/mobile-patient start

# Or build a native binary
pnpm --filter @doktori/mobile-patient ios
pnpm --filter @doktori/mobile-patient android
```

## Backend URL

The app reads `apiBaseUrl` from `app.json` → `expo.extra`. For local dev point it at your running web backend:

- Android emulator: `http://10.0.2.2:3000`
- iOS simulator: `http://localhost:3000`
- Physical device: `http://<your-LAN-ip>:3000` (make sure the web dev server listens on `0.0.0.0`)

You can override at runtime via `EXPO_PUBLIC_API_BASE_URL` env var.

## Structure

```
app/
├── _layout.tsx          # Root — theme, i18n, safe area, gesture handler
├── index.tsx            # Splash → auth-routing
├── (auth)/
│   ├── login.tsx
│   └── inscription.tsx
└── (tabs)/              # Bottom tab bar
    ├── home.tsx
    ├── search.tsx
    ├── agenda.tsx
    ├── messages.tsx
    └── profil.tsx
```

All API calls go through `@doktori/mobile-core` — no raw `fetch` in screens.
Theme tokens live in `@doktori/mobile-core/theme` and mirror `apps/web/app/globals.css`.

## Outstanding

- `/api/auth/patient-login` endpoint on the backend (patient JWT issuance) — mobile login currently calls it and will 404 until shipped.
- Native push (expo-notifications) registration wired into `/api/push-tokens`.
- Biometric unlock (expo-local-authentication).
- WebRTC call UI (uses `react-native-webrtc` against existing `/api/calls/*` signaling).
