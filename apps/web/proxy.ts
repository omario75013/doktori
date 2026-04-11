import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // /admin-login is public — the login form itself
  if (pathname === "/admin-login") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    const session = await auth();
    if (!session) {
      return NextResponse.redirect(new URL("/admin-login", req.url));
    }
    const role = (session.user as { role?: string } | undefined)?.role;
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/admin-login", req.url));
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
    "/admin-login",
    "/dashboard/:path*",
    "/agenda/:path*",
    "/rendez-vous/:path*",
    "/profil/:path*",
  ],
};
