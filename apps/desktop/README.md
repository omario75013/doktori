# Doktori Desktop (Tauri 2)

Desktop wrapper for the Doktori web app. Targets doctors and secretaries.

On first launch the app shows a role picker (Médecin / Secrétaire). The chosen
role is persisted via the Tauri **store** plugin (`.doktori-desktop.json`)
and used to route the embedded webview to either `/connexion` or
`/secretaire-login` on the remote server.

The embedded web app detects that it runs inside Tauri
(`window.__TAURI_INTERNALS__`) and dispatches OS notifications for:
- Doctor **bells** (Secrétaire)
- Incoming **voice calls**
- New **messages** (team messagerie)

## Prerequisites

- **Rust** (stable, 1.77+): https://rustup.rs
- **Node.js** 20+ (same as the `web` app — pnpm manages the monorepo)
- Platform build deps per https://v2.tauri.app/start/prerequisites/
  - Windows: Visual Studio Build Tools + WebView2 Runtime
  - macOS: Xcode Command Line Tools
  - Linux: `libwebkit2gtk-4.1-dev`, `libssl-dev`, etc.

## Install

From the repo root:

```bash
pnpm install
# or from this folder
cd apps/desktop && pnpm install
```

## Run (dev)

Point the wrapper at your local Next.js dev server (default):

```bash
cd apps/desktop
pnpm dev
```

The app opens on the role picker. After you pick, the window navigates to
`http://localhost:3000/connexion` (or `/secretaire-login`).

### Pointing at another server

```bash
# Windows PowerShell
$env:DOKTORI_SERVER_URL="https://doktori.tn"; pnpm dev

# macOS / Linux
DOKTORI_SERVER_URL=https://doktori.tn pnpm dev
```

## Change role

The stored role lives in `~/.local/share/tn.doktori.desktop/.doktori-desktop.json`
(path varies per OS). To force the picker again, launch with
`?picker=1` appended to the start URL, or delete the store file.

A future revision will expose a **"Changer de rôle"** menu item in the
window chrome.

## Build (production installer)

```bash
cd apps/desktop
pnpm build
```

Installers land in `src-tauri/target/release/bundle/` (`.msi`/`.exe` on
Windows, `.dmg` on macOS, `.AppImage`/`.deb` on Linux).

## File layout

```
apps/desktop/
├── package.json              # Tauri CLI + plugin wrappers
├── README.md                 # You are here
└── src-tauri/
    ├── Cargo.toml            # Rust dependencies
    ├── build.rs              # Tauri build script
    ├── tauri.conf.json       # App config (window, bundle id, …)
    ├── capabilities/
    │   └── default.json      # Permissions (notifications, store, shell)
    ├── icons/                # App icons — ADD YOUR OWN PNG/ICNS/ICO
    └── src/
        ├── main.rs           # Entry point
        └── lib.rs            # Plugins + `app_env` command

src/
├── index.html                # Role picker UI
├── picker.js                 # Persist role + redirect webview
└── styles.css                # Picker styles
```

## TODO before first build

1. **Add real app icons** in `src-tauri/icons/` matching the names listed in
   `tauri.conf.json`. You can use
   `pnpm tauri icon <path-to-1024x1024.png>` once the CLI is installed.
2. On Windows, install the WebView2 Runtime.
3. Sign the installer for release distribution (Apple Developer certificate
   on macOS, code-signing cert on Windows).
