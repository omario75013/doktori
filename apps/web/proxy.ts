import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin")) {
    const session = await auth();
    if (!session) return NextResponse.redirect(new URL("/connexion", req.url));
    if (!isSuperAdmin(session.user?.email)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/agenda") ||
    pathname.startsWith("/rendez-vous") ||
    pathname.startsWith("/profil")
  ) {
    const session = await auth();
    if (!session) return NextResponse.redirect(new URL("/connexion", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/agenda/:path*",
    "/rendez-vous/:path*",
    "/profil/:path*",
  ],
};
