/**
 * Fire a native OS notification when the web app is running inside the
 * Tauri desktop wrapper. Silently no-ops in a regular browser.
 *
 * The Tauri runtime injects `window.__TAURI_INTERNALS__.invoke` into every
 * allowed webview (see src-tauri/capabilities/default.json "remote.urls").
 * We call the notification plugin commands directly — no JS package import
 * is needed, which works even when the webview loads a remote HTTP origin.
 */

type NotifyOptions = {
  title: string;
  body?: string;
  icon?: string;
};

type TauriWindow = Window & {
  __TAURI_INTERNALS__?: {
    invoke: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
    metadata?: unknown;
  };
};

export function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as TauriWindow).__TAURI_INTERNALS__);
}

async function tauriInvoke<T = unknown>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T> {
  const w = window as TauriWindow;
  if (!w.__TAURI_INTERNALS__) throw new Error("Tauri not available");
  return w.__TAURI_INTERNALS__.invoke<T>(cmd, args);
}

let permissionPromise: Promise<boolean> | null = null;

async function ensureTauriPermission(): Promise<boolean> {
  if (permissionPromise) return permissionPromise;
  permissionPromise = (async () => {
    try {
      const granted = await tauriInvoke<boolean>("plugin:notification|is_permission_granted");
      if (granted) return true;
      const perm = await tauriInvoke<string>("plugin:notification|request_permission");
      return perm === "granted";
    } catch {
      return false;
    }
  })();
  return permissionPromise;
}

async function sendTauriNotification(opts: NotifyOptions): Promise<void> {
  try {
    await tauriInvoke("plugin:notification|notify", {
      options: {
        title: opts.title,
        body: opts.body,
        icon: opts.icon,
      },
    });
  } catch (e) {
    // Swallow: the sandbox may refuse if the capability isn't set properly.
    console.warn("[os-notify] tauri notify failed:", e);
  }
}

async function sendBrowserNotification(opts: NotifyOptions): Promise<void> {
  try {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
    if (Notification.permission === "granted") {
      new Notification(opts.title, { body: opts.body, icon: opts.icon });
    }
  } catch {
    /* silent */
  }
}

export async function osNotify(opts: NotifyOptions): Promise<void> {
  if (isTauri()) {
    const ok = await ensureTauriPermission();
    if (ok) await sendTauriNotification(opts);
    return;
  }
  await sendBrowserNotification(opts);
}
