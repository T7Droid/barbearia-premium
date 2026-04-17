import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { TenantContext } from "@/lib/services/tenant-context";
import { AuthService } from "@/lib/services/auth.service";

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const tenant = await TenantContext.getTenant(request);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
  }

  // Verificar se o usuário é um administrador
  const auth = await AuthService.verifySession(request, tenant.id);
  if (!auth.authenticated || auth.user?.role !== "admin") {
    return NextResponse.json({ error: "Apenas administradores podem ativar seu próprio perfil profissional." }, { status: 403 });
  }

  try {
    const { description, imageUrl } = await request.json();

    // 1. Verificar se já existe um perfil de barbeiro para este usuário
    const { data: existing } = await supabaseAdmin
      .from("barbers")
      .select("id")
      .eq("user_id", auth.user.id)
      .eq("tenant_id", tenant.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Você já possui um perfil profissional ativo." }, { status: 400 });
    }

    // 2. Buscar horários padrão do tenant
    const { data: settings } = await supabaseAdmin
      .from("settings")
      .select("weekly_hours")
      .eq("tenant_id", tenant.id)
      .single();

    const systemDefaultHours = {
      monday: { active: true, start: "09:00", end: "18:00" },
      tuesday: { active: true, start: "09:00", end: "18:00" },
      wednesday: { active: true, start: "09:00", end: "18:00" },
      thursday: { active: true, start: "09:00", end: "18:00" },
      friday: { active: true, start: "09:00", end: "18:00" },
      saturday: { active: true, start: "09:00", end: "12:00" },
      sunday: { active: false }
    };

    const initialWeeklyHours = settings?.weekly_hours || systemDefaultHours;

    // 3. Criar o registro de barbeiro
    const { data: barber, error: barberError } = await supabaseAdmin
      .from("barbers")
      .insert({
        name: auth.user.name,
        description: description || "Administrador e Profissional da " + tenant.name,
        image_url: imageUrl || "",
        active: true,
        tenant_id: tenant.id,
        user_id: auth.user.id,
        weekly_hours: initialWeeklyHours
      })
      .select()
      .single();

    if (barberError) throw barberError;

    // 4. Associar à primeira unidade encontrada do tenant
    const { data: units } = await supabaseAdmin
      .from("units")
      .select("id")
      .eq("tenant_id", tenant.id)
      .limit(1);

    if (units && units.length > 0) {
      await supabaseAdmin.from("barber_units").insert({
        barber_id: barber.id,
        unit_id: units[0].id
      });
    }

    // 5. Associar a todos os serviços ativos (opcional, mas bom para o admin começar)
    const { data: services } = await supabaseAdmin
      .from("services")
      .select("id")
      .eq("tenant_id", tenant.id)
      .limit(10);
      
    if (services && services.length > 0) {
      const svcAssociations = services.map(s => ({
        barber_id: barber.id,
        service_id: s.id
      }));
      await supabaseAdmin.from("barber_services").insert(svcAssociations);
    }

    // 6. Atualizar o profile para garantir que a role é consistente (pode já ser admin)
    // Se for admin, mantemos admin pois o admin tem superpoderes.

    return NextResponse.json({ success: true, barber });
  } catch (error: any) {
    console.error("Setup Barber Error:", error);
    return NextResponse.json({ error: "Erro ao ativar perfil de barbeiro" }, { status: 500 });
  }
}
