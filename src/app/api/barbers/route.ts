import { NextResponse, NextRequest } from "next/server";
import { supabase, supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { TenantContext } from "@/lib/services/tenant-context";
import { AuthService } from "@/lib/services/auth.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const tenant = await TenantContext.getTenant(request);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
  }

  const activeOnly = request.nextUrl.searchParams.get("active") === "true";
  const bookableOnly = request.nextUrl.searchParams.get("bookable") === "true";
  
  let query = supabaseAdmin
    .from("barbers")
    .select("*, barber_units(unit_id), barber_services(service_id)")
    .eq("tenant_id", tenant.id);

  if (bookableOnly) {
    query = query.eq("active", true).not("weekly_hours", "is", null);
  } else if (activeOnly) {
    query = query.eq("active", true);
  }

  const { data, error } = await query.order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Mapear para camelCase e incluir associações
  let mapped = (data || []).map((b: any) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    imageUrl: b.image_url,
    active: b.active,
    user_id: b.user_id,
    weekly_hours: b.weekly_hours,
    commissionPercentage: b.commission_percentage !== null && b.commission_percentage !== undefined ? b.commission_percentage : 50,
    units: (b.barber_units || []).map((bu: any) => ({ id: bu.unit_id })),
    services: (b.barber_services || []).map((bs: any) => ({ id: bs.service_id }))
  }));

  // Filtro adicional para garantir que o barbeiro tem tudo necessário
  if (bookableOnly) {
    mapped = mapped.filter(b => b.units.length > 0 && b.services.length > 0);
  }

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

  // Verificar se o usuário é admin deste tenant
  const auth = await AuthService.verifySession(request, tenant.id);
  if (!auth.authenticated || auth.user?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, description, imageUrl, active, unitIds, serviceIds, loginData, commissionPercentage } = body;

    let userId = null;

    // 1. Criar login para o barbeiro se solicitado
    if (loginData?.email && loginData?.password) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: loginData.email,
        password: loginData.password,
        email_confirm: true,
        user_metadata: { role: "barber", full_name: name }
      });

      if (authError) {
        // Se o erro for que o usuário já existe, tentamos apenas atualizar o perfil depois
        if (authError.message.includes("already registered")) {
           const { data: existingUser } = await supabaseAdmin.from("profiles").select("id").eq("email", loginData.email).single();
           if (existingUser) userId = existingUser.id;
        } else {
           throw authError;
        }
      } else {
        userId = authData.user.id;
        
        // Criar ou atualizar perfil para garantir o tenant e o cargo
        await supabaseAdmin.from("profiles").upsert({
          id: userId,
          full_name: name,
          email: loginData.email,
          role: "barber",
          tenant_id: tenant.id
        });
      }
    }

    // 2. Buscar horários padrão do tenant para aplicar ao novo barbeiro
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

    // 3. Criar o barbeiro
    const { data: barber, error } = await supabaseAdmin
      .from("barbers")
      .insert({
        name,
        description,
        image_url: imageUrl,
        active: active !== undefined ? active : true,
        tenant_id: tenant.id,
        user_id: userId,
        weekly_hours: initialWeeklyHours,
        commission_percentage: commissionPercentage || 50
      })
      .select()
      .single();

    if (error) throw error;

    // 3. Associar Unidades (M2M)
    if (Array.isArray(unitIds) && unitIds.length > 0) {
      const associations = unitIds.map(uId => ({
        barber_id: barber.id,
        unit_id: uId
      }));
      await supabaseAdmin.from("barber_units").insert(associations);
    }

    // 4. Associar Serviços (M2M)
    if (Array.isArray(serviceIds) && serviceIds.length > 0) {
      const svcAssociations = serviceIds.map(sId => ({
        barber_id: barber.id,
        service_id: Number(sId)
      }));
      await supabaseAdmin.from("barber_services").insert(svcAssociations);
    }

    return NextResponse.json(barber);
  } catch (error: any) {
    console.error("Error creating barber:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
