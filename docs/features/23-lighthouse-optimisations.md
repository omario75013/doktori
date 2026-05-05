# Feature 23 — Lighthouse optimisations (font-display swap, lazy load)

## Description

Optimisations performance ciblées Lighthouse (LCP, CLS, TBT) :
- Polices Google (Geist Sans / Geist Mono) avec `display: 'swap'` + `fallback` (system-ui, etc.) pour éviter le FOIT (Flash of Invisible Text) et le CLS.
- `Geist_Mono` avec `preload: false` (pas above-the-fold).
- Composants below-the-fold lazy-loaded via `next/dynamic` : Chatbot, InstallPrompt, KeyboardShortcuts, CookieBanner, ServiceWorkerRegister, SupportButton.

Objectif : LCP < 2.5s, CLS < 0.1, score Lighthouse > 90 sur la homepage et les pages SEO ville/spécialité.

## User-facing UI

Aucune UI dédiée — optimisations transparentes au layout root.

Effets visibles :
- Le texte de la page apparaît immédiatement avec la fallback font (system-ui), puis swap vers Geist sans saut visuel grâce à un fallback métriquement proche.
- Le Chatbot, le bouton support et la cookie banner se hydratent après le first paint.

## API endpoints

Aucun.

## DB tables

Aucune.

## Configuration

Fichier principal : `apps/web/app/layout.tsx`.

```ts
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
});
```

Pas de feature flag, pas de var d'env.

Mesure : `pnpm lighthouse` ou Lighthouse CI dans pipeline (à câbler).

## Troubleshooting

- "Score LCP toujours > 4s" : vérifier les images hero non-optimisées (utiliser `next/image` avec `priority`), vérifier que `Geist_Sans` est bien `preload: true`, et que le HTML root n'a pas de gros bloc bloquant.
- "CLS visible au chargement" : la fallback font doit avoir une `size-adjust` proche de la web font. Geist a un size-adjust automatique via next/font, mais si le user override avec une autre font, vérifier.
- "Chatbot invisible" : `next/dynamic` peut échouer silencieusement si le module a des side effects en SSR — vérifier la console browser. Le composant doit s'hydrater côté client.

## Source commit(s)

- Pas de commit dédié `#23` — les optimisations sont distribuées sur plusieurs commits qui ont touché `apps/web/app/layout.tsx` :
  - `4b5d152` — `fix(ux): move SupportButton to root layout` (lazy-load via `next/dynamic`).
  - `5298191` — `feat: patient interface overhaul + onboarding + doctor signup + real-time permissions` (premier round de dynamic imports).
  - `782da43` — `feat(rgpd): A5 cookie consent banner + privacy preferences page` (cookie banner lazy-loaded).
  - Configuration `display: 'swap'` + `fallback` ajoutée plus tôt et conservée.
