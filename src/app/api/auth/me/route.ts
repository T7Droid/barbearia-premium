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

export async function PUT(request: NextRequest) {
  try {
    const tenant = await TenantContext.getTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
    }

    const updates = await request.json();
    const result = await AuthService.updateProfile(request, updates);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
