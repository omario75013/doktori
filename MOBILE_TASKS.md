# Doktori Mobile — AFK Task Script
**Working directory:** `C:\Users\user2024\Desktop\doktori\apps\mobile-staff`
**Run with:** Open a new Claude Code session in that directory and say:
> "Read `C:\Users\user2024\Desktop\doktori\MOBILE_TASKS.md` and execute every phase in order. Do not ask questions — make decisions based on existing patterns in the codebase."

---

## Context (read before starting)

The app `apps/mobile-staff` is an Expo managed app (SDK 54, expo-router 6, React Native 0.81).
It currently serves **doctor** and **secretary** roles only.

**Goal:** Transform it into a **unified app** — patients book via the same app, staff access via "Espace Pro".

### Current auth flow (keep, extend)
```
index.tsx
  → has staff token + role → /(doctor)/home or /(secretary)/planning
  → has role, no token     → /(auth)/login?role=...
  → nothing                → /(auth)/role  (role picker — staff only right now)
```

### Target auth flow after this work
```
index.tsx
  → has patient token      → /(patient)/home
  → has staff token + role → /(doctor)/home or /(secretary)/planning
  → nothing                → /(auth)/patient-login   ← NEW default
```

### Shared packages
- `@doktori/mobile-core` — `api()`, `colors`, `spacing`, `radii`, auth helpers. All API calls go through `api()`.
- All colors use `colors.teal`, `colors.bg`, `colors.foreground` etc. (see `packages/mobile-core/src/theme.ts`)
- Bearer JWT auth — token stored in `expo-secure-store` via `setStoredToken` / `getStoredToken`

### Backend base URL
- Dev: `http://localhost:3000` (set in `app.json` extra.apiBaseUrl)
- Prod: `https://doktori.tn`

### Key API routes already working
```
POST /api/auth/staff-login          { email, password, role } → { token, user }
POST /api/auth/patient-login        { phone|email, password } → { token, user }  ← may need creation
GET  /api/doctor/me
GET  /api/doctor/patients
GET  /api/doctor/appointments
POST /api/appointments              book appointment (patient side)
GET  /api/doctors/by-slug/[slug]/availability?typeId=&practiceId=
GET  /api/search?q=&specialty=&city=&mode=
GET  /api/appointment-types         motifs/types for a doctor
POST /api/push-tokens               register device push token
```

---

## Phase 1 — Unified Entry Point & Patient Login

### 1.1 Update `app/index.tsx`
Replace the current index with tri-path logic:
```typescript
// Pseudo-logic
const patientToken = await SecureStore.getItemAsync("doktori.patient.token")
const staffToken   = await getStoredToken()  // existing staff token key
const storedRole   = await SecureStore.getItemAsync("doktori.staff.role")

if (patientToken)              → Redirect to "/(patient)/home"
if (staffToken && storedRole)  → Redirect to role === "doctor" ? "/(doctor)/home" : "/(secretary)/planning"
if (storedRole)                → Redirect to "/(auth)/login?role=" + storedRole
else                           → Redirect to "/(auth)/patient-login"
```
Use separate SecureStore keys:
- Patient token key: `"doktori.patient.token"`
- Staff token key: `"doktori.token"` (already used by `getStoredToken()`)
- Staff role key: `"doktori.staff.role"` (already used)

### 1.2 Create `app/(auth)/patient-login.tsx`
Screen with:
- Title: **"Doktori"**, subtitle: **"Trouvez votre médecin, prenez RDV"**
- Tab toggle: `Téléphone` | `Email`
- Phone input (prefix +216 locked) OR email input
- Password input
- Primary CTA: **"Se connecter"** → POST `/api/auth/patient-login` → store token in `"doktori.patient.token"` → `router.replace("/(patient)/home")`
- Secondary link: **"Créer un compte"** → `router.push("/(auth)/patient-signup")`
- Bottom separator + button: **"Espace Pro →"** → `router.push("/(auth)/role")` (existing role picker)

Style: match web patient login aesthetic. Dark teal header area, white card below.

### 1.3 Create `app/(auth)/patient-signup.tsx`
Fields: Prénom + Nom, Téléphone (+216), Email (optional), Mot de passe, Date de naissance (date picker using plain TextInput DD/MM/YYYY — no native date picker dependency).
CTA: **"Créer mon compte"** → POST `/api/auth/patient-register` → store token → `router.replace("/(patient)/home")`

If `/api/auth/patient-register` doesn't exist on the backend yet, create it:
- File: `apps/web/app/api/auth/patient-register/route.ts`
- Body: `{ firstName, lastName, phone, email?, password, dateOfBirth? }`
- Hash password with bcrypt, insert into `patients` table, return `{ token, user }` same shape as patient-login

---

## Phase 2 — Patient App (tabs under `app/(patient)/`)

Create `app/(patient)/_layout.tsx` — a Tabs layout with 4 tabs:
```
Home (home-outline)  |  Rendez-vous (calendar-outline)  |  Messages (chatbubbles-outline)  |  Profil (person-outline)
```
Tab bar tint: `colors.teal`. Hidden routes: `doctor/[slug]`, `booking/[slug]`, `chat/[id]`.

### 2.1 `app/(patient)/home.tsx` — Patient Home
- Greeting: "Bonjour, {firstName}" or "Bonjour" if not loaded
- Search bar (tap → navigates to inline search on same screen, or opens search modal)
- Quick filters row: specialty chips (Généraliste, Cardiologue, Pédiatre, Dermatologue, Dentiste)
- "Prochain RDV" card — next upcoming appointment with countdown + "Rejoindre" if teleconsult within 15 min
- "Médecins récents" horizontal scroll (from last 3 appointments, stored locally)
- Pull-to-refresh

API: `GET /api/appointments` (patient auth) for next appointment.

### 2.2 `app/(patient)/home.tsx` — Integrated search
When user taps search bar or a specialty chip:
- Show FlatList of results from `GET /api/search?q=&specialty=&city=&mode=`
- Each result card: doctor photo (placeholder initials), name, specialty, city, rating stars, "Disponible aujourd'hui" badge if slots today
- Tap card → `router.push("/(patient)/doctor/[slug]")`

### 2.3 `app/(patient)/doctor/[slug].tsx` — Doctor Profile
- Header: doctor photo (initials fallback), name, specialty, cabinet address
- "À propos" section (bio)
- Motifs list from `GET /api/appointment-types?doctorSlug=[slug]` or similar
- Availability calendar: week strip (Mon–Sun), tap day → show available slots as pills
  - Slots from `GET /api/doctors/by-slug/[slug]/availability?typeId=&practiceId=&date=`
- CTA per slot: **"Prendre RDV"** → `router.push("/(patient)/booking/[slug]?slot=...&typeId=...")`

### 2.4 `app/(patient)/booking/[slug].tsx` — Booking Flow (multi-step)
3-step wizard:
1. **Motif** — pick appointment type (if not already chosen), optional reason text area
2. **Récapitulatif** — show doctor name, date/time, motif, cabinet address
3. **Confirmation** — if patient NOT logged in: show inline login/signup form. If logged in: confirm button.

On confirm:
```
POST /api/appointments { doctorId, startsAt, endsAt, typeId, reason, practiceId }
```
On success → `router.replace("/(patient)/appointments/" + appointmentId)` or just go to `/(patient)/rendez-vous`.

**Unauthenticated booking:** preserve booking params in state through the login step. After login success, auto-submit the appointment.

### 2.5 `app/(patient)/rendez-vous.tsx` — My Appointments
Two tabs: **À venir** | **Passés**
Each row: doctor name, specialty, date, time, status badge (pill: confirmed=teal, pending=amber, cancelled=red).
Tap → appointment detail sheet (bottom sheet):
- Full details
- "Annuler" button (if >2h away) → PATCH `/api/appointments/[id]/status` `{ status: "cancelled" }`
- "Rejoindre" button (if teleconsult + within 15 min) → future video call screen
Pull-to-refresh.

API: `GET /api/appointments` with patient Bearer token.

### 2.6 `app/(patient)/messages.tsx` — Patient Messages
List of conversations with doctors from `GET /api/conversations` (patient auth).
Tap → `router.push("/(patient)/chat/[id]")`.

### 2.7 `app/(patient)/chat/[id].tsx` — Patient Chat Thread
Same UI pattern as `(doctor)/chat/[id].tsx`.
- Load: `GET /api/doctor/conversations/[id]/messages` (patient Bearer token works on same endpoint)
- Send: `POST /api/doctor/messages { patientId, content }`
- Custom header with back (→ messages tab) + doctor name
- 4-second polling for new messages

### 2.8 `app/(patient)/profil.tsx` — Patient Profile
- Avatar circle with initials
- Sections: Mes informations (name, phone, email, DOB — editable via PATCH `/api/patients/[id]`)
- Assurance / CNAM (read-only for now)
- Notifications toggle (push prefs)
- **"Se déconnecter"** → clear `"doktori.patient.token"` from SecureStore → `router.replace("/(auth)/patient-login")`

---

## Phase 3 — Complete Secretary App

The secretary app lives under `app/(secretary)/`. Currently it has stub screens. Complete each one to match the desktop `apps/web/app/secretaire/` pages.

### 3.1 `app/(secretary)/planning.tsx` — Full Planning Screen
Current: probably a stub. Replace with:
- Header: today's date, doctor selector (if secretary manages multiple doctors — use `GET /api/doctor/me` for each)
- Horizontal date strip (scrollable, 14 days, today highlighted)
- Vertical timeline for selected day: appointments as cards
  - Card: time slot, patient name, motif, status badge
  - Tap card → appointment detail bottom sheet with:
    - Patient name + phone (tap to call)
    - Status change buttons: Confirmer / Annuler / Marquer présent
    - "Appeler le patient" → `tel:` deep link
- FAB "+" → new appointment modal (same as doctor calendrier)
- Pull-to-refresh

API: `GET /api/appointments/doctor` with secretary Bearer token (the staff auth middleware handles secretary too).

### 3.2 `app/(secretary)/bookings.tsx` — Incoming Booking Requests
List of pending appointments needing confirmation.
Filter tabs: **En attente** | **Confirmés** | **Annulés**
Each row: patient name, requested date/time, motif, doctor name.
Actions (swipe right or tap): Confirmer (green) | Refuser (red) | Proposer autre créneau (blue).

API:
- `GET /api/appointments/doctor?status=pending`
- `PATCH /api/appointments/[id]/status { status: "confirmed"|"cancelled" }`

### 3.3 `app/(secretary)/patients.tsx` — Patient Management
**Already partially done on doctor side** — copy the same pattern:
- Search bar + list
- "+ Nouveau patient" → creation modal (name, phone, email, DOB)
- Tap patient → detail view with edit
- Patient detail: basic info + upcoming appointments + notes

API: `GET /api/doctor/patients`, `POST /api/doctor/patients`, `PATCH /api/patients/[id]`

### 3.4 `app/(secretary)/messages.tsx` — Secretary Messages
Two tabs: **Équipe** | **Patients**
- Équipe: team conversations from `/api/staff/conversations`
- Patients: patient conversations (all patients of the managed doctor)

Same `ConversationRow` pattern → navigate to a secretary chat screen.
Create `app/(secretary)/chat/[id].tsx` — identical to doctor chat but with secretary auth context.

### 3.5 `app/(secretary)/_layout.tsx` — Secretary Tabs
Ensure tabs are: Planning | Réservations | Patients | Messagerie | Paramètres
Make sure all tabs are registered and hidden sub-routes (chat) are `href: null`.

### 3.6 `app/(secretary)/settings.tsx` — Secretary Settings
- Profile: name, email (read-only)
- Notifications: push toggle
- **"Changer de rôle"** → clear stored role → `router.replace("/(auth)/role")`
- **"Se déconnecter"** → clear token + role → `router.replace("/(auth)/patient-login")`

---

## Phase 4 — Backend gaps (create if missing)

Check each route exists before creating:

### 4.1 `POST /api/auth/patient-login`
File: `apps/web/app/api/auth/patient-login/route.ts`
- Body: `{ identifier: string, password: string }` (identifier = phone or email)
- Query `patients` table by phone OR email
- bcrypt compare password
- Sign JWT with `NEXTAUTH_SECRET`, payload `{ id, role: "patient" }`
- Return `{ token, user: { id, name, phone, email, role: "patient" } }`

### 4.2 `POST /api/auth/patient-register`
File: `apps/web/app/api/auth/patient-register/route.ts`
- Body: `{ firstName, lastName, phone, email?, password, dateOfBirth? }`
- Check duplicate phone/email
- Hash password (bcrypt, 10 rounds)
- Insert into `patients` table
- Return same shape as patient-login

### 4.3 Patient-auth middleware
File: `apps/web/lib/patient-auth.ts` may already exist. Ensure it exports:
```typescript
export async function requirePatientAuth(req: NextRequest): Promise<Patient | null>
```
Used by patient-facing API routes.

### 4.4 `GET /api/appointments` (patient-side)
Check if this already handles patient Bearer JWT. If it only handles cookie auth or doctor auth, add a patient Bearer fallback using the patient-auth middleware.

---

## Phase 5 — Push notifications for patients

Update `apps/mobile-staff/app/_layout.tsx` `registerPushToken()`:
- Currently posts to `/api/push-tokens` with staff Bearer token
- After this work, patients also need push registration
- The push-tokens endpoint already accepts any Bearer token (patient, doctor, secretary)
- No change needed — the token registration in `_layout.tsx` fires after login regardless of role

Update `handleNotificationNavigation()` to also handle patient-side deep links:
```typescript
// Patient appointment reminders
if (d.type === "appointment" && d.appointmentId) {
  router.push({ pathname: "/(patient)/rendez-vous" as never });
}
// Patient message notification  
if (d.type === "patient_message" && d.conversationId) {
  router.push({ pathname: "/(patient)/chat/[id]" as never, params: { id: d.conversationId } });
}
```

---

## Phase 6 — Tests

### 6.1 TypeScript (already passing)
Run: `npx tsc --noEmit` — must stay clean throughout all changes.

### 6.2 Unit tests with Jest
Create `jest.config.js` in `apps/mobile-staff/`:
```javascript
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)'
  ],
};
```

Add `"jest-expo"` to devDependencies in `apps/mobile-staff/package.json`.

Tests to write (create `__tests__/` folder):

**`__tests__/auth.test.ts`**
- `loginStaff` stores token on success
- `logout` clears token
- `restoreSession` returns unauthenticated when no token

**`__tests__/i18n.test.ts`**
- `t("key")` returns key when not found
- `t("key")` returns translation after `loadMessages`
- Variable interpolation works

**`__tests__/api.test.ts`**
- `api()` throws when baseUrl not set
- `api()` adds Authorization header when token present
- `api()` throws `ApiError` on non-ok response

### 6.3 E2E tests with Maestro
Install Maestro CLI (doesn't need native build — works with Expo Go):
```
curl -Ls "https://get.maestro.mobile.dev" | bash
```

Create `e2e/` folder with flows:

**`e2e/patient-login.yaml`**
```yaml
appId: host.exp.exponent
---
- launchApp
- assertVisible: "Doktori"
- tapOn: "Téléphone"
- inputText:
    id: phone-input
    text: "22123456"
- tapOn: "Mot de passe"
- inputText:
    id: password-input
    text: "Test1234!"
- tapOn: "Se connecter"
- assertVisible: "Bonjour"
```

**`e2e/espace-pro.yaml`**
```yaml
appId: host.exp.exponent
---
- launchApp
- assertVisible: "Doktori"
- tapOn: "Espace Pro"
- assertVisible: "Médecin"
- assertVisible: "Secrétaire"
- tapOn: "Médecin"
- assertVisible: "Email"
```

**`e2e/doctor-agenda.yaml`**
```yaml
appId: host.exp.exponent
---
- launchApp
- tapOn: "Espace Pro"
- tapOn: "Médecin"
- inputText:
    id: email-input
    text: "karim.benali@doktori.tn"
- inputText:
    id: password-input
    text: "Demo2026!"
- tapOn: "Se connecter"
- assertVisible: "Accueil"
- tapOn: "Calendrier"
- assertVisible:
    text: "Aujourd'hui"
```

Run E2E: `maestro test e2e/patient-login.yaml`

---

## Phase 7 — Review & Bug Fixes

After all phases, perform this review checklist. Fix every item found:

### 7.1 CRUD completeness check
For each entity, verify all operations work:
- **Appointment:** create ✓, read ✓, update status ✓, cancel ✓
- **Patient:** create ✓, read ✓, update ✓, (no delete on mobile)
- **Message:** create (send) ✓, read ✓
- **Call:** create ✓, answer/decline ✓, end ✓

### 7.2 Auth edge cases
- [ ] Token expiry: if `api()` returns 401, clear stored token and redirect to login
- [ ] Patient token used on staff route → should get 401, not crash
- [ ] Staff token used on patient route → should get 401, not crash

Add 401 auto-logout in `packages/mobile-core/src/api.ts`:
```typescript
if (!res.ok) {
  if (res.status === 401) {
    await clearStoredToken();
    // Emit a global event that _layout.tsx listens to, to redirect to login
  }
  ...
}
```

### 7.3 Empty states
Every list screen must have a proper empty state (icon + text + optional CTA):
- Patient home: no upcoming RDV → "Prenez votre premier rendez-vous"
- Patient messages: no conversations → "Aucune conversation"  
- Secretary planning: no appointments today → "Journée libre"
- Secretary bookings: no pending → "Aucune demande en attente"

### 7.4 Error states
Every screen that fetches data must handle the error case — show a "Réessayer" button that calls `load()`.

### 7.5 Navigation consistency
- Every sub-screen back button must go to the logical parent (not home)
- After logout (any role), must land on `/(auth)/patient-login`
- Deep links from push notifications must work for all 3 roles

### 7.6 TypeScript clean
`npx tsc --noEmit` must pass with 0 errors after all changes.

---

## Execution Order

Run phases strictly in this order. Mark each phase done (verify TypeScript still clean) before starting the next:

1. Phase 1 (entry + patient login/signup)
2. Phase 4 (backend gaps — needed by Phase 2)
3. Phase 2 (patient app tabs + booking flow)
4. Phase 3 (secretary app completion)
5. Phase 5 (push notification routing)
6. Phase 6 (tests)
7. Phase 7 (review + fixes)

---

## Conventions to follow (from this session)

- **No raw `fetch`** — always use `api()` from `@doktori/mobile-core`
- **No `JSON.stringify(body)`** — `api()` stringifies automatically
- **Custom headers** instead of `Stack.Screen headerRight` — build header rows directly in JSX
- **Back buttons** use `router.navigate("/(group)/screen")` not `router.back()` to ensure correct tab highlight
- **Active tab when in sub-screen** — pass `moreActive`-style boolean from `useSegments()` to custom tab buttons
- **ScrollView inside modals** — never put `flex: 1` on a ScrollView inside a container with only `maxHeight`; use `flexShrink: 1` on the container instead
- **Patient token key:** `"doktori.patient.token"` (separate from staff `"doktori.token"`)
- **Role key:** `"doktori.staff.role"`
- All screens use `SafeAreaView edges={["top"]}` from `react-native-safe-area-context`
- Colors: always `colors.teal`, `colors.bg`, `colors.foreground` etc. — no hardcoded hex in new code
- `radii.full` for pill shapes, `radii.lg` for cards
