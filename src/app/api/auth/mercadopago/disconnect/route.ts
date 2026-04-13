import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { TenantContext } from "@/lib/services/tenant-context";
import { AuthService } from "@/lib/services/auth.service";

export async function POST(request: NextRequest) {
  try {
    const tenant = await TenantContext.getTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
    }

    const auth = await AuthService.verifySession(request, tenant.id);
    if (!auth.authenticated || auth.user?.role !== "admin") {
      return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
    }

    // Limpar as credenciais do Mercado Pago para este tenant
    const { error } = await supabaseAdmin!
      .from("tenants")
      .update({
        mp_connected: false,
        mp_access_token: null,
        mp_public_key: null,
        mp_refresh_token: null,
        mp_user_id: null,
      })
      .eq("id", tenant.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("MP Disconnect Error:", error);
    return NextResponse.json({ error: "Erro ao desconectar conta" }, { status: 500 });
  }
}
