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

  // Verificar se o usuário é um barbeiro ou administrador
  console.log(`[API /api/barber/me] Checking session for tenant: ${tenant.id}`);
  const auth = await AuthService.verifySession(request, tenant.id);
  
  if (!auth.authenticated) {
    console.log(`[API /api/barber/me] Authentication failed`);
    return NextResponse.json({ error: "Sessão inválida ou expirada" }, { status: 401 });
  }

  console.log(`[API /api/barber/me] Authenticated: ${auth.user.email}, Role: ${auth.user.role}`);

  if (auth.user?.role !== "barber" && auth.user?.role !== "admin") {
    console.log(`[API /api/barber/me] Role check failed: ${auth.user?.role}`);
    return NextResponse.json({ error: `ER-BAR-ME: Acesso não autorizado. Seu papel atual é: ${auth.user?.role}` }, { status: 403 });
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
