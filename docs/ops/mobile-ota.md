# Mobile OTA Updates

After code changes that don't require native module changes:

## Push an OTA update (no App Store review needed)
```bash
cd apps/mobile
eas update --branch production --message "description of changes"
```

## How it works
- App checks for updates on every launch
- If available, downloads in background
- User sees "Mise à jour disponible" alert
- On restart, new JS bundle is loaded

## When OTA is NOT possible (requires new build)
- New native dependency added
- app.json changes (permissions, plugins)
- Expo SDK upgrade
- Any change in ios/ or android/ directories

## Channels
- `preview` — internal testing
- `production` — live users
