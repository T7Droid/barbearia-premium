import { NextResponse, NextRequest } from "next/server";
import { supabase, supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { TenantContext } from "@/lib/services/tenant-context";
import { AuthService } from "@/lib/services/auth.service";
import { TenantService } from "@/lib/services/tenant.service";

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

  // Buscar e-mails separadamente para evitar erros de Join
  const userIds = (data || []).map((b: any) => b.user_id).filter(Boolean);
  let profilesMap: Record<string, string> = {};
  
  if (userIds.length > 0) {
    const { data: profilesData } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .in("id", userIds);
    
    if (profilesData) {
      profilesMap = profilesData.reduce((acc: any, p: any) => ({ ...acc, [p.id]: p.email }), {});
    }
  }

  // Mapear para camelCase e incluir associações
  let mapped = (data || []).map((b: any) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    imageUrl: b.image_url,
    active: b.active,
    userId: b.user_id,
    email: b.user_id ? profilesMap[b.user_id] : null,
    weeklyHours: b.weekly_hours,
    commissionPercentage: b.commission_percentage !== null && b.commission_percentage !== undefined ? b.commission_percentage : 50,
    units: (b.barber_units || []).map((bu: any) => ({ id: bu.unit_id })),
    services: (b.barber_services || []).map((bs: any) => ({ id: bs.service_id }))
  }));

  // Filtrar por unidade se o parâmetro unitId for fornecido
  const unitId = request.nextUrl.searchParams.get("unitId");
  if (unitId) {
    mapped = mapped.filter((b: any) => b.units.some((u: any) => String(u.id) === String(unitId)));
  }

  // Filtro adicional para garantir que o barbeiro tem tudo necessário
  if (bookableOnly) {
    mapped = mapped.filter((b: any) => b.units.length > 0 && b.services.length > 0);
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

    const { count: currentBarbers } = await supabaseAdmin
      .from("barbers")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("active", true);

    if (currentBarbers !== null && currentBarbers >= fullTenant.plans.max_barbers) {
      return NextResponse.json({ 
        error: `Limite atingido: Seu plano (${fullTenant.plans.name}) permite no máximo ${fullTenant.plans.max_barbers} barbeiros ativos.` 
      }, { status: 403 });
    }
    // --------------------------------------------

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
          email: loginData.email
        });

        // Criar vínculo de acesso na nova tabela
        await supabaseAdmin.from("tenant_memberships").upsert({
          user_id: userId,
          tenant_id: tenant.id,
          role: "barber"
        }, { onConflict: 'user_id,tenant_id' });
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
