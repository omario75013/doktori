import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * /ar redirect handler
 *
 * The site uses cookie-based locale switching (NEXT_LOCALE cookie), not URL
 * prefixes. The /ar URL was erroneously referenced in the hreflang metadata,
 * causing 404s. This handler sets the Arabic locale cookie and redirects to
 * the home page so the user lands on the Arabic version of the site.
 */
export function GET(req: NextRequest) {
  const response = NextResponse.redirect(new URL("/", req.url));
  response.cookies.set("NEXT_LOCALE", "ar", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}
