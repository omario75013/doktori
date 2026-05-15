import { NextResponse } from "next/server";

/**
 * Deprecated: invitation logic has been consolidated into POST /api/clinique/doctors.
 * This route now proxies to that endpoint so existing clients continue to work.
 */
export async function POST(req: Request) {
  // Re-issue as a POST to the canonical endpoint
  const body = await req.text();
  const url = new URL(req.url);
  const canonical = `${url.origin}/api/clinique/doctors`;

  const upstream = await fetch(canonical, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: req.headers.get("cookie") ?? "" },
    body,
  });

  const data: unknown = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}
