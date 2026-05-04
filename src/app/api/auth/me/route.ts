import { NextResponse, NextRequest } from "next/server";
import { AuthService } from "@/lib/services/auth.service";
import { TenantContext } from "@/lib/services/tenant-context";

export async function GET(request: NextRequest) {
  try {
    const tenant = await TenantContext.getTenant(request);
    if (!tenant) {
      return NextResponse.json({ authenticated: false, error: "Tenant não identificado" });
    }

    const result = await AuthService.verifySession(request, tenant.id) as any;

    if (result.authenticated) {
      const { TenantService } = require("@/lib/services/tenant.service");
      result.isSubscriptionActive = await TenantService.isSubscriptionActive(tenant.id);
    }

    const response = NextResponse.json(result);

    response.headers.set("Cache-Control", "no-store, max-age=0");

    return response;
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
