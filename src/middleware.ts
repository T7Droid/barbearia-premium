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

    // Modern Supabase verification (Prod branch)
    try {
      // Manual verification logic to avoid complex service imports in middleware (Edge)
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        throw new Error("Invalid session");
      }

      // Verify Role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      
      if (!profile || profile.role !== "admin") {
        throw new Error("Forbidden");
      }

      // Skip subscription check for now to fix access
      return NextResponse.next();
    } catch (error: any) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: error.message || "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
  }

  if (pathname === "/login" || pathname === "/admin/login") {
    const token = request.cookies.get("session_token")?.value;
    if (token) {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");
        const { data: { user } } = await supabase.auth.getUser(token);
        
        if (user) {
          const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
          if (profile?.role === "admin") {
            return NextResponse.redirect(new URL("/admin", request.url));
          }
          return NextResponse.redirect(new URL("/meu-perfil", request.url));
        }
      } catch (e) {
        // Ignorar falha na verificação automática para permitir login manual
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/login", "/api/:path*"],
};
