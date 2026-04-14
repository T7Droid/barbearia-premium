import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { TenantContext } from "@/lib/services/tenant-context";
import { AuthService } from "@/lib/services/auth.service";

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const tenant = await TenantContext.getTenant(request);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
  }

  // Verificar se o usuário é um barbeiro
  const auth = await AuthService.verifySession(request, tenant.id);
  if (!auth.authenticated || auth.user?.role !== "barber") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  try {
    // Buscar o barbeiro vinculado ao usuário logado
    const { data: barber, error } = await supabaseAdmin
      .from("barbers")
      .select("*")
      .eq("user_id", auth.user.id)
      .eq("tenant_id", tenant.id)
      .single();

    if (error || !barber) {
      return NextResponse.json({ error: "Barbeiro não encontrado" }, { status: 404 });
    }

    return NextResponse.json(barber);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
