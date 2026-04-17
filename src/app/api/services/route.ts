import { NextResponse, NextRequest } from "next/server";
import { supabase, supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { TenantContext } from "@/lib/services/tenant-context";

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const tenant = await TenantContext.getTenant(request);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("services")
    .select("*, service_units(unit_id)")
    .eq("tenant_id", tenant.id)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Mapear para camelCase e incluir units para o frontend
  const mapped = (data || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    price: s.price,
    durationMinutes: s.duration_minutes,
    imageUrl: s.image_url,
    units: (s.service_units || []).map((su: any) => ({ id: su.unit_id }))
  }));

  return NextResponse.json(mapped);
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Supabase Admin not configured" }, { status: 500 });
  }

  const tenant = await TenantContext.getTenant(request);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
  }

  // Verificar se o usuário é admin deste tenant (Segurança Crítica)
  const auth = await AuthService.verifySession(request, tenant.id);
  if (!auth.authenticated || auth.user?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado. Apenas administradores podem criar serviços." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, description, price, durationMinutes, imageUrl, unitIds } = body;

    const { data: service, error } = await supabaseAdmin
      .from("services")
      .insert({
        name,
        description,
        price,
        duration_minutes: durationMinutes,
        image_url: imageUrl,
        tenant_id: tenant.id
      })
      .select()
      .single();

    if (error) throw error;

    // Associar Unidades (M2M)
    if (Array.isArray(unitIds) && unitIds.length > 0) {
      const associations = unitIds.map(uId => ({
        service_id: service.id,
        unit_id: uId
      }));
      await supabaseAdmin.from("service_units").insert(associations);
    }

    return NextResponse.json(service, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ 
      error: "Erro ao criar serviço", 
      details: error.message 
    }, { status: 400 });
  }
}
