import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Função simples para verificar admin, evitando importações pesadas no middleware
function isAdminEmail(email?: string): boolean {
  if (!email) return false;
  // Fallback para os emails conhecidos se o env não estiver disponível no edge
  const adminEmails = (process.env.ADMIN_EMAILS || "thyagosilvestre@gmail.com,thyago_silvestre@hotmail.com").split(",");
  return adminEmails.includes(email.toLowerCase().trim());
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Ignorar arquivos estáticos, webhooks e rotas OAuth
  if (
    pathname.includes(".") ||
    pathname.startsWith("/_next") ||
    pathname === "/" ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/api/onboarding") ||
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
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        const refererParts = refererUrl.pathname.split("/").filter(Boolean);
        if (refererParts.length > 0 &&
          !["api", "admin", "dashboard", "meu-perfil", "login", "cadastro"].includes(refererParts[0])) {
          slug = refererParts[0];
        }
      } catch (e) {}
    }
  }

  // Fallback: se ainda não temos slug, tentar do path
  if (!slug && pathParts.length > 0) {
    const firstPart = pathParts[0];
    if (!["api", "admin", "dashboard", "meu-perfil", "login", "cadastro", "onboarding"].includes(firstPart)) {
      slug = firstPart;
    }
  }

  if (!slug) return NextResponse.next();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-slug", slug);

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    // No Middleware usamos a Service Role para bypass de RLS se necessário, ou Anon Key
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar se o tenant existe
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id, name")
      .eq("slug", slug)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    const isAdminApi = pathname.startsWith("/api/admin") || pathname.startsWith("/api/stats/summary");
    const isBarberApi = pathname.startsWith("/api/barber/");
    const isTenantAdminPath = (!pathname.startsWith("/api") && pathname.startsWith(`/${slug}/admin`) && !pathname.endsWith("/admin/login")) || isAdminApi;
    const isTenantBarberPath = (!pathname.startsWith("/api") && pathname.startsWith(`/${slug}/barber`)) || isBarberApi;
    const isTenantProfilePath = (!pathname.startsWith("/api") && pathname.startsWith(`/${slug}/meu-perfil`)) || pathname.startsWith("/api/user/profile");
    const isTenantAuthPath = !pathname.startsWith("/api") && (pathname === `/${slug}/login` || pathname === `/${slug}/cadastro`);

    const token = request.cookies.get("session_token")?.value;

    if (token && (isTenantAdminPath || isTenantBarberPath || isTenantProfilePath || isTenantAuthPath)) {
      const { data: { user } } = await supabase.auth.getUser(token);

      if (user) {
        // Buscar o cargo na tabela de vínculos
        const { data: membership } = await supabase
          .from("tenant_memberships")
          .select("role")
          .eq("user_id", user.id)
          .eq("tenant_id", tenant.id)
          .single();

        let role = "client";
        if (isAdminEmail(user.email)) {
          role = "admin";
        } else if (membership) {
          role = membership.role || "client";
        }

        if (isTenantAuthPath) {
          const from = request.nextUrl.searchParams.get("from");
          const target = from || (role === "admin" ? `/${slug}/admin` : `/${slug}/meu-perfil`);
          return NextResponse.redirect(new URL(target, request.url));
        }

        if (isTenantAdminPath && role !== "admin") {
          if (pathname.startsWith("/api")) {
            return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
          }
          return NextResponse.redirect(new URL(`/${slug}/admin/login`, request.url));
        }

        if (isTenantBarberPath && role !== "barber" && role !== "admin") {
          if (pathname.startsWith("/api")) {
            return NextResponse.json({ error: "Acesso restrito a barbeiros ou administradores" }, { status: 403 });
          }
          return NextResponse.redirect(new URL(`/${slug}/meu-perfil`, request.url));
        }
      } else if (isTenantAdminPath || isTenantBarberPath || isTenantProfilePath) {
        if (pathname.startsWith("/api")) {
          return NextResponse.json({ error: "Sessão expirada ou inválida" }, { status: 401 });
        }
        const loginUrl = new URL(isTenantAdminPath ? `/${slug}/admin/login` : `/${slug}/login`, request.url);
        loginUrl.searchParams.set("from", pathname);
        return NextResponse.redirect(loginUrl);
      }
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error("[Proxy Error]", error);
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }
}
