import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicApi = pathname.startsWith("/api/auth") || 
                      pathname.startsWith("/api/services") ||
                      pathname.startsWith("/api/availability") ||
                      pathname.startsWith("/api/checkout") ||
                      pathname.startsWith("/api/appointments") ||
                      pathname.startsWith("/api/settings") ||
                      pathname.startsWith("/api/user") ||
                      pathname.startsWith("/api/webhooks");

  // DEMO VERSION BYPASS: Allow all access to admin and api
  if (pathname.startsWith("/admin") || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin") || (pathname.startsWith("/api") && !isPublicApi)) {
    if (pathname === "/admin/login" || pathname === "/admin/assinatura-vencida") {
      return NextResponse.next();
    }

    const token = request.cookies.get("session_token")?.value;

    if (!token) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const payload = await verifyToken(token);
    if (!payload || payload.role !== "admin") {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
  }

  if (pathname === "/login") {
    const token = request.cookies.get("session_token")?.value;
    if (token) {
      const payload = await verifyToken(token);
      if (payload) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/login", "/api/:path*"],
};
