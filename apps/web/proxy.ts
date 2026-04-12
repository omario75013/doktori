import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const DOCTOR_ROUTES = [
  "/dashboard",
  "/agenda",
  "/rendez-vous",
  "/patients",
  "/profil",
  "/secretaires",
  "/motifs",
  "/cabinets",
  "/conventions",
  "/wallet",
  "/abonnement",
  "/stats",
  "/teleconsult-medecin",
];

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

  const isDoctor = DOCTOR_ROUTES.some((r) => pathname.startsWith(r));
  if (isDoctor) {
    const session = await auth();
    if (!session) {
      return NextResponse.redirect(new URL("/connexion", req.url));
    }
    const role = (session.user as { role?: string } | undefined)?.role;
    if (role !== "doctor") {
      return NextResponse.redirect(new URL("/connexion", req.url));
    }
    return NextResponse.next();
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
    "/patients/:path*",
    "/profil/:path*",
    "/secretaires/:path*",
    "/motifs/:path*",
    "/cabinets/:path*",
    "/conventions/:path*",
    "/wallet/:path*",
    "/abonnement/:path*",
    "/stats/:path*",
    "/teleconsult-medecin/:path*",
  ],
};
