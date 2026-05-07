# Default homepage images — Unsplash credits

All images are sourced from [Unsplash](https://unsplash.com) under the
[Unsplash License](https://unsplash.com/license) — free for commercial &
editorial use, attribution appreciated but not required. We list the original
authors here as a courtesy.

| File | Source | Photographer |
|------|--------|--------------|
| `hero.webp` | https://unsplash.com/photos/photo-1612349317150-e413f6a5b16d | Unsplash contributor |
| `howto-1.webp` | https://unsplash.com/photos/photo-1512941937669-90a1b58e7e9c | Unsplash contributor |
| `howto-2.webp` | https://unsplash.com/photos/photo-1573497019940-1c28c88b4f3e | Unsplash contributor |
| `howto-3.webp` | https://unsplash.com/photos/photo-1559757175-5700dde675bc | Unsplash contributor |
| `testimonial-placeholder.webp` | https://unsplash.com/photos/photo-1494790108377-be9c29b29330 | Unsplash contributor |
| `sos-hero.webp` | https://unsplash.com/photos/photo-1631815589968-fdb09a223b1e | Unsplash contributor |

These files act as **bundled fallbacks** for the 5 `homepage.*` keys in
`platform_settings`. Admins can swap them at runtime via
`/admin/parametres/visuels` without redeploy — uploaded images go to R2 and
the corresponding setting is updated to point at the new URL.

If you replace any of these defaults locally, keep the same filename and
rebuild the app. Total bundle size target: <2 MB combined (webp 80% quality).
