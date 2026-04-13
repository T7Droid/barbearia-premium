import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Ignorar arquivos estáticos, webhooks e rotas OAuth do Mercado Pago
  if (
    pathname.includes(".") || 
    pathname.startsWith("/_next") || 
    pathname === "/" ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/auth/mercadopago")
  ) {
    return NextResponse.next();
  }

  // 2. Tentar extrair o slug de forma robusta
  let slug = "";
  const pathParts = pathname.split("/").filter(Boolean);

  // Tentar primeiro do header explícito (sempre confiável se enviado)
  const tenantSlugHeader = request.headers.get("x-tenant-slug");
  const referer = request.headers.get("referer");
  
  if (tenantSlugHeader) {
    slug = tenantSlugHeader;
  } else if (pathname.startsWith("/api/")) {
    // Para APIs, fallbacks via Referer
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        const refererParts = refererUrl.pathname.split("/").filter(Boolean);
        // O slug é a primeira parte antes de qualquer rota técnica (ex: /default/...)
        if (refererParts.length > 0 && 
            !["api", "admin", "dashboard", "meu-perfil", "login", "cadastro"].includes(refererParts[0])) {
          slug = refererParts[0];
        } else {
           console.log(`[Proxy] API call for ${pathname} but Referer '${referer}' has no valid slug parts.`);
        }
      } catch (e) {}
    } else {
       console.log(`[Proxy] API call for ${pathname} WITHOUT Referer and WITHOUT x-tenant-slug header.`);
    }
  } else {
    // Para páginas, o slug é a primeira parte do path
    const firstPart = pathParts[0];
    const reserved = ["api", "admin", "dashboard", "meu-perfil", "favicon.ico", "images", "login", "cadastro"];
    if (!reserved.includes(firstPart)) {
      slug = firstPart;
    }
  }

  // Se não houver slug, não fazemos nada (deixa o Next resolver a rota ou dar 404)
  if (!slug) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-slug", slug);

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar se o tenant existe
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id, name")
      .eq("slug", slug)
      .single();

    if (tenantError || !tenant) {
      console.log(`[Proxy] Tenant '${slug}' not found for Path: ${pathname}. DB Error:`, tenantError?.message);
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    console.log(`[Proxy] OK: Found ${tenant.name} for Path: ${pathname}`);
    requestHeaders.set("x-tenant-id", tenant.id);

    // Lógica de proteção de rotas (Admin, Perfil) dento do tenant
    const isTenantAdminPath = !pathname.startsWith("/api") && pathname.startsWith(`/${slug}/admin`) && !pathname.endsWith("/admin/login");
    const isTenantProfilePath = !pathname.startsWith("/api") && pathname.startsWith(`/${slug}/meu-perfil`);
    const isTenantAuthPath = !pathname.startsWith("/api") && 
      (pathname === `/${slug}/login` || pathname === `/${slug}/cadastro`);
    
    const token = request.cookies.get("session_token")?.value;

    if (token && (isTenantAdminPath || isTenantProfilePath || isTenantAuthPath)) {
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        // Primeiro buscamos o perfil sem o filtro restrito de tenant
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, tenant_id")
          .eq("id", user.id)
          .single();
        
        let role = "client";
        const adminEmails = ["admin@barber.com", "thyagoneves.sa@gmail.com"];
        if (adminEmails.includes(user.email || "") || profile?.role === "admin") {
          role = "admin";
        } else if (profile && tenant.id && profile.tenant_id === tenant.id) {
          role = profile.role || "client";
        }

        if (isTenantAuthPath) {
          const from = request.nextUrl.searchParams.get("from");
          const target = from || (role === "admin" ? `/${slug}/admin` : `/${slug}/meu-perfil`);
          console.log(`[Proxy] Redirecting authenticated user from ${pathname} to ${target}`);
          return NextResponse.redirect(new URL(target, request.url));
        }

        if (isTenantAdminPath && role !== "admin") {
          console.log(`[Proxy] ACCESS DENIED: User role ${role} tried to access ${pathname}. Redirecting to login.`);
          return NextResponse.redirect(new URL(`/${slug}/admin/login`, request.url));
        }
      } else if (isTenantAdminPath || isTenantProfilePath) {
        console.log(`[Proxy] SESSION EXPIRED or INVALID for token. Redirecting ${pathname} to login.`);
        const loginUrl = new URL(isTenantAdminPath ? `/${slug}/admin/login` : `/${slug}/login`, request.url);
        loginUrl.searchParams.set("from", pathname);
        return NextResponse.redirect(loginUrl);
      }
    } else if (!token && (isTenantAdminPath || isTenantProfilePath)) {
      console.log(`[Proxy] NO TOKEN for protected path ${pathname}. Redirecting to login.`);
      const loginUrl = new URL(isTenantAdminPath ? `/${slug}/admin/login` : `/${slug}/login`, request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Para evitar loops de rewrite e 404s estranhos no App Router,
    // usamos NEXT se os headers já estiverem prontos e o path já for correto.
    // O REWRITE é útil se estivermos alterando o path substancialmente.
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

  } catch (e) {
    console.error("[Proxy] Critical error:", e);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
