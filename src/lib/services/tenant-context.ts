import { NextRequest, NextResponse } from "next/server";
import { TenantService } from "./tenant.service";

export class TenantContext {
  static async getTenant(request: NextRequest) {
    // 1. Tentar pegar do header (injetado pelo middleware ou enviado pelo client)
    const tenantId = request.headers.get("x-tenant-id");
    const tenantSlug = request.headers.get("x-tenant-slug");

    if (tenantId) {
      if (tenantSlug) return await TenantService.getTenantBySlug(tenantSlug);
      return await TenantService.getTenantById(tenantId);
    }

    // 2. Fallback: Se não houver headers diretos, tentamos inferir pelo Referer (útil para chamadas de API do browser)
    let slug = tenantSlug;
    if (!slug) {
      const referer = request.headers.get("referer");
      if (referer) {
        try {
          const refererUrl = new URL(referer);
          const parts = refererUrl.pathname.split("/").filter(Boolean);
          if (parts.length > 0 && parts[0] !== "api") {
            slug = parts[0];
          }
        } catch (e) {
          // Ignorar erro de parsing
        }
      }
    }

    if (!slug) return null;

    // Buscar no banco se só tivermos o slug
    return await TenantService.getTenantBySlug(slug);
  }
}
