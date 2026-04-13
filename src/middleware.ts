import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Ignorar arquivos estáticos e webhooks
  if (
    pathname.includes(".") || 
    pathname.startsWith("/_next") || 
    pathname === "/" ||
    pathname.startsWith("/api/webhooks")
  ) {
    return NextResponse.next();
  }

  // 2. Tentar extrair o slug
  let slug = "";
  const pathParts = pathname.split("/").filter(Boolean);

  if (pathname.startsWith("/api/")) {
    // Para APIs, tentamos pegar do header referer ou do próprio header x-tenant-slug
    const referer = request.headers.get("referer");
    const tenantSlugHeader = request.headers.get("x-tenant-slug");
    
    if (tenantSlugHeader) {
      slug = tenantSlugHeader;
    } else if (referer) {
      try {
        const refererUrl = new URL(referer);
        const refererParts = refererUrl.pathname.split("/").filter(Boolean);
        // O slug é a primeira parte do path no referer (ex: /default/...)
        if (refererParts.length > 0 && refererParts[0] !== "api") {
          slug = refererParts[0];
        }
      } catch (e) {
        // Ignorar erro de parsing de URL
      }
    }
  } else {
    // Para páginas normais, o slug é a primeira parte do path
    slug = pathParts[0];
  }

  // 3. Se não identificarmos o slug, apenas continuamos (pode ser uma rota global)
  if (!slug || slug === "api" || slug === "admin" || slug === "dashboard") {
    return NextResponse.next();
  }

  // 4. Injetar o slug nos headers para que as APIs possam ler
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-slug", slug);

  //Áreas protegidas (Admin, Perfil, etc) dentro do tenant
  const restOfPath = "/" + pathParts.slice(1).join("/");
  const isAdminPath = !pathname.startsWith("/api") && restOfPath.startsWith("/admin");
  const isProfilePath = !pathname.startsWith("/api") && restOfPath.startsWith("/meu-perfil");
  const isAuthPath = !pathname.startsWith("/api") && (restOfPath === "/login" || restOfPath === "/cadastro");

  const token = request.cookies.get("session_token")?.value;

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
      // Se for uma rota de página e o tenant não existir, deixamos o Next dar 404
      return NextResponse.next({
        request: { headers: requestHeaders },
      });
    }

    // Injetar o ID do tenant também para facilitar no servidor
    requestHeaders.set("x-tenant-id", tenant.id);

    // Lógica de Autenticação e Proteção
    if (token && (isAdminPath || isProfilePath || isAuthPath)) {
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .eq("tenant_id", tenant.id)
          .single();
        
        const effectiveRole = profile?.role || "client";

        if (isAuthPath) {
          const target = effectiveRole === "admin" ? `/${slug}/admin` : `/${slug}/meu-perfil`;
          return NextResponse.redirect(new URL(target, request.url));
        }

        if (isAdminPath && effectiveRole !== "admin") {
          return NextResponse.redirect(new URL(`/${slug}/login`, request.url));
        }
      } else if (isAdminPath || isProfilePath) {
        return NextResponse.redirect(new URL(`/${slug}/login`, request.url));
      }
    } else if (!token && (isAdminPath || isProfilePath)) {
      const loginUrl = new URL(`/${slug}/login`, request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

  } catch (error) {
    console.error("Middleware Error:", error);
  }

  // Retornar o próximo com os novos headers injetados
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  // Agora incluímos tudo exceto assets estáticos
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
