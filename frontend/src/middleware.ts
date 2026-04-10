import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_ROUTES = ["/dashboard", "/onboarding"];
const AUTH_ROUTES = ["/auth/login", "/auth/register", "/auth/forgot-password", "/auth/reset-password"];

const ROLE_ROUTES: Record<string, string> = {
  "/dashboard/doctor":  "DOCTOR",
  "/dashboard/patient": "PATIENT",
  "/dashboard/admin":   "ADMIN",
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let token: string | null = null;
  let role: string | null = null;

  const authStorage = request.cookies.get("auth-storage")?.value;
  if (authStorage) {
    try {
      const parsed = JSON.parse(decodeURIComponent(authStorage));
      token = parsed?.state?.token ?? null;
      role  = parsed?.state?.user?.role ?? null;
    } catch {}
  }

  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  const isAuthRoute  = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  // Not logged in → redirect to login
  if (isProtected && !token) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Logged in but wrong role for this dashboard → redirect to their own dashboard
  if (token && role) {
    for (const [route, requiredRole] of Object.entries(ROLE_ROUTES)) {
      if (pathname.startsWith(route) && role !== requiredRole) {
        const redirectMap: Record<string, string> = {
          DOCTOR:  "/dashboard/doctor",
          PATIENT: "/dashboard/patient",
          ADMIN:   "/dashboard/admin",
        };
        return NextResponse.redirect(new URL(redirectMap[role] ?? "/", request.url));
      }
    }
  }

  // Already logged in → skip auth pages, go to their dashboard
  if (isAuthRoute && token && role) {
    const redirectMap: Record<string, string> = {
      DOCTOR:  "/dashboard/doctor",
      PATIENT: "/dashboard/patient",
      ADMIN:   "/dashboard/admin",
    };
    return NextResponse.redirect(new URL(redirectMap[role] ?? "/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/auth/:path*"],
};
