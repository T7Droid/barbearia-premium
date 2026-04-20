import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const body = await req.json();
  const { tenant, unit, services, barber, account } = body;

  let createdUserId: string | null = null;
  let createdTenantId: string | null = null;

  try {
    // 1. Criar Usuário no Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: { full_name: account.fullName }
    });

    if (authError || !authData.user) {
      throw new Error(`Erro ao criar usuário: ${authError?.message}`);
    }
    createdUserId = authData.user.id;

    // Gerar Slug único (Mesma lógica da lib/utils para consistência)
    const slug = tenant.name
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/\s+/g, "-")           // Espaços para -
      .replace(/[^\w-]+/g, "")        // Remove tudo que não é letra, número ou hífen
      .replace(/--+/g, "-");          // Evita hífens duplos

    // 2. Criar Tenant
    const { data: tenantData, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .insert([
        { 
          name: tenant.name, 
          slug: slug, 
          owner_id: createdUserId 
        }
      ])
      .select()
      .single();

    if (tenantError || !tenantData) {
      throw new Error(`Erro ao criar barbearia: ${tenantError?.message}`);
    }
    createdTenantId = tenantData.id;

    // 3. Criar Settings padrão
    const { error: settingsError } = await supabaseAdmin
      .from("settings")
      .insert([
        {
          tenant_id: createdTenantId,
          is_points_enabled: false,
          cancellation_window_days: 2,
          is_prepayment_required: false,
          slot_interval: 30,
          points_per_appointment: 2,
          initial_points: 10,
          weekly_hours: {
            monday: { active: false, start: "09:00", end: "18:00" },
            tuesday: { active: false, start: "09:00", end: "18:00" },
            wednesday: { active: false, start: "09:00", end: "18:00" },
            thursday: { active: false, start: "09:00", end: "18:00" },
            friday: { active: false, start: "09:00", end: "18:00" },
            saturday: { active: false, start: "09:00", end: "18:00" },
            sunday: { active: false, start: "09:00", end: "18:00" },
          }
        }
      ]);

    if (settingsError) {
      throw new Error(`Erro ao criar configurações: ${settingsError.message}`);
    }

    // 4. Criar Unidade
    const { data: unitData, error: unitError } = await supabaseAdmin
      .from("units")
      .insert([
        {
          tenant_id: createdTenantId,
          name: unit.name,
          address: unit.address,
          number: unit.number,
          city: unit.city,
          state: unit.state
        }
      ])
      .select()
      .single();

    if (unitError || !unitData) {
      throw new Error(`Erro ao criar unidade: ${unitError?.message}`);
    }

    // 5. Criar Serviços
    const servicesToInsert = services.map((s: any) => ({
      tenant_id: createdTenantId,
      name: s.name,
      price: s.price,
      duration_minutes: s.duration_minutes
    }));

    const { data: createdServices, error: servicesError } = await supabaseAdmin
      .from("services")
      .insert(servicesToInsert)
      .select();

    if (servicesError || !createdServices) {
      throw new Error(`Erro ao criar serviços: ${servicesError?.message}`);
    }

    // 6. Criar Barbeiro
    const { data: barberData, error: barberError } = await supabaseAdmin
      .from("barbers")
      .insert([
        {
          tenant_id: createdTenantId,
          name: barber.name,
          active: true,
          user_id: createdUserId // O dono também é o primeiro barbeiro no DB
        }
      ])
      .select()
      .single();

    if (barberError || !barberData) {
      throw new Error(`Erro ao criar barbeiro: ${barberError?.message}`);
    }

    // 7. Vínculos (Barber -> Unit & Barber -> Services)
    const barberUnits = [{ barber_id: barberData.id, unit_id: unitData.id }];
    const barberServices = createdServices.map(s => ({ 
      barber_id: barberData.id, 
      service_id: s.id 
    }));

    await Promise.all([
      supabaseAdmin.from("barber_units").insert(barberUnits),
      supabaseAdmin.from("barber_services").insert(barberServices),
      supabaseAdmin.from("service_units").insert(createdServices.map(s => ({
        service_id: s.id,
        unit_id: unitData.id
      })))
    ]);

    // 8. Criar ou Atualizar Perfil Admin
    // Usamos upsert com onConflict explícito para garantir que o gatilho do Supabase não cause erro
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: createdUserId,
          full_name: account.fullName,
          email: account.email,
          phone: account.phone,
          role: "admin",
          tenant_id: createdTenantId,
          accepted_terms: true,
          accepted_privacy: true
        },
        { onConflict: 'id' }
      );

    if (profileError) {
      throw new Error(`Erro ao criar perfil: ${profileError.message}`);
    }

    return NextResponse.json({ success: true, slug });

  } catch (error: any) {
    console.error("Onboarding Error:", error);

    // Rollback Manual Robusto (Lidando com Chave Estrangeira)
    if (createdTenantId) {
      // Deletar vínculos primeiro
      await supabaseAdmin.from("barber_units").delete().eq("barber_id", (await supabaseAdmin.from("barbers").select("id").eq("tenant_id", createdTenantId)).data?.[0]?.id);
      await supabaseAdmin.from("barber_services").delete().eq("barber_id", (await supabaseAdmin.from("barbers").select("id").eq("tenant_id", createdTenantId)).data?.[0]?.id);
      await supabaseAdmin.from("service_units").delete().eq("unit_id", (await supabaseAdmin.from("units").select("id").eq("tenant_id", createdTenantId)).data?.[0]?.id);
      
      // Deletar entidades
      await supabaseAdmin.from("barbers").delete().eq("tenant_id", createdTenantId);
      await supabaseAdmin.from("services").delete().eq("tenant_id", createdTenantId);
      await supabaseAdmin.from("units").delete().eq("tenant_id", createdTenantId);
      await supabaseAdmin.from("settings").delete().eq("tenant_id", createdTenantId);
      await supabaseAdmin.from("profiles").delete().eq("tenant_id", createdTenantId);
      
      // Finalmente deletar o Tenant
      await supabaseAdmin.from("tenants").delete().eq("id", createdTenantId);
    }
    if (createdUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdUserId);
    }

    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
