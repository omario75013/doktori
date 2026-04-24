# App icons

Tauri expects these files (paths match `tauri.conf.json > bundle.icon`):

- `32x32.png`
- `128x128.png`
- `128x128@2x.png`
- `icon.icns` (macOS)
- `icon.ico` (Windows)

## Generate from a single source image

Once the Tauri CLI is installed, run from `apps/desktop/`:

```bash
pnpm tauri icon /path/to/source.png
```

It needs a 1024x1024 PNG and will produce all required variants.
