/**
 * Tiny fetch wrapper with auth injection + consistent error shape.
 *
 * Used everywhere in the mobile apps. No raw `fetch` in screens.
 * Tokens come from the auth module (`getStoredToken`) — passing one in
 * explicitly is only needed for the login request itself.
 */

import { getStoredToken } from "./auth-storage";

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function setOnUnauthorized(handler: UnauthorizedHandler): void {
  onUnauthorized = handler;
}

let baseUrl: string =
  (globalThis as unknown as { __DOKTORI_API_BASE__?: string }).__DOKTORI_API_BASE__ ??
  // Expo inlines EXPO_PUBLIC_* at build time
  (typeof process !== "undefined" ? process.env?.EXPO_PUBLIC_API_BASE_URL : undefined) ??
  "";

export function setApiBaseUrl(url: string) {
  baseUrl = url.replace(/\/+$/, "");
  (globalThis as unknown as { __DOKTORI_API_BASE__?: string }).__DOKTORI_API_BASE__ = baseUrl;
}

export function getApiBaseUrl(): string {
  return baseUrl;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

type ApiInit = Omit<RequestInit, "body"> & {
  body?: unknown;
  token?: string | null;
  skipAuth?: boolean;
  /**
   * When true, a 401 response will NOT trigger onUnauthorized (no auto-logout/redirect).
   * Use on screens that handle auth errors themselves (e.g., staff screens that show
   * an inline error rather than redirecting to login).
   */
  noRedirect?: boolean;
};

export async function api<T = unknown>(path: string, init: ApiInit = {}): Promise<T> {
  const { body, token, skipAuth, noRedirect, headers: extraHeaders, ...rest } = init;

  if (!baseUrl) {
    throw new Error(
      "API base URL missing. Call setApiBaseUrl() during app bootstrap or set EXPO_PUBLIC_API_BASE_URL."
    );
  }

  const resolvedToken = token ?? (skipAuth ? null : await getStoredToken());
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(extraHeaders as Record<string, string> | undefined),
  };
  if (resolvedToken) headers.Authorization = `Bearer ${resolvedToken}`;

  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    payload = JSON.stringify(body);
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${baseUrl}${path}`, { ...rest, headers, body: payload });
  const text = await res.text();
  const parsed: unknown = text ? safeJson(text) : null;

  if (!res.ok) {
    const message =
      (typeof parsed === "object" && parsed !== null && "error" in parsed
        ? String((parsed as { error: unknown }).error)
        : res.statusText) || `HTTP ${res.status}`;
    if (res.status === 401 && !skipAuth && !noRedirect) {
      onUnauthorized?.();
    }
    throw new ApiError(res.status, message, parsed);
  }

  return parsed as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
