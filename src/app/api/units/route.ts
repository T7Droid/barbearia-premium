import { NextResponse, NextRequest } from "next/server";
import { supabase, supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { TenantContext } from "@/lib/services/tenant-context";
import { AuthService } from "@/lib/services/auth.service";
import { TenantService } from "@/lib/services/tenant.service";

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured || !supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const tenant = await TenantContext.getTenant(request);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
  }

  const { data: units, error } = await supabase
    .from("units")
    .select("*")
    .eq("tenant_id", tenant.id)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(units);
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Supabase Admin not configured" }, { status: 500 });
  }

  const tenant = await TenantContext.getTenant(request);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
  }

  const auth = await AuthService.verifySession(request, tenant.id);
  if (!auth.authenticated || auth.user?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { 
      name, 
      address, 
      number, 
      city, 
      state, 
      postal_code, 
      google_maps_link,
      weekly_hours
    } = body;

    // --- NOVA VALIDAÇÃO DE PLANO E ASSINATURA ---
    const [fullTenant, isSubActive] = await Promise.all([
      TenantService.getTenantById(tenant.id),
      TenantService.isSubscriptionActive(tenant.id)
    ]);

    if (!isSubActive) {
      return NextResponse.json({ 
        error: "Assinatura expirada ou inativa. Por favor, regularize seu pagamento para continuar." 
      }, { status: 403 });
    }

    if (!fullTenant || !fullTenant.plans) {
      return NextResponse.json({ error: "Plano não identificado." }, { status: 400 });
    }

    const { count: currentUnits } = await supabaseAdmin
      .from("units")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenant.id);

    if (currentUnits !== null && currentUnits >= fullTenant.plans.max_units) {
      return NextResponse.json({ 
        error: `Limite atingido: Seu plano (${fullTenant.plans.name}) permite no máximo ${fullTenant.plans.max_units} unidade(s).` 
      }, { status: 403 });
    }
    // --------------------------------------------

    const { data, error } = await supabaseAdmin
      .from("units")
      .insert({
        tenant_id: tenant.id,
        name,
        address,
        number,
        city,
        state,
        postal_code,
        google_maps_link,
        weekly_hours
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
