import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { EmailService } from "@/lib/services/email.service";

export async function POST(req: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const body = await req.json();
  const { tenant, unit, services, barber, account, planId } = body;

  let createdUserId: string | null = null;
  let createdBarberUserId: string | null = null;
  let createdTenantId: string | null = null;

  try {
    // 0. Buscar o Plano e Validar Limites (Backend Enforcement)
    const { data: planData, error: planError } = await supabaseAdmin
      .from("plans")
      .select("*")
      .eq("slug", planId || "basico")
      .single();

    if (planError || !planData) {
      throw new Error("Plano selecionado inválido ou não encontrado.");
    }

    if (1 > planData.max_units) {
      throw new Error(`Seu plano permite no máximo ${planData.max_units} unidade(s).`);
    }
    if (1 > planData.max_barbers) {
      throw new Error(`Seu plano permite no máximo ${planData.max_barbers} barbeiro(s).`);
    }

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

    const slug = tenant.name
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "-");

    const { data: tenantData, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .insert([
        { 
          name: tenant.name, 
          slug: slug, 
          owner_id: createdUserId,
          plan_id: planData.id 
        }
      ])
      .select()
      .single();

    if (tenantError || !tenantData) {
      throw new Error(`Erro ao criar barbearia: ${tenantError?.message}`);
    }
    createdTenantId = tenantData.id;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error: subError } = await supabaseAdmin
      .from("subscriptions")
      .insert([
        {
          tenant_id: createdTenantId,
          plan_id: planData.id,
          status: "trialing",
          expires_at: expiresAt.toISOString()
        }
      ]);

    if (subError) {
      throw new Error(`Erro ao criar assinatura: ${subError.message}`);
    }

    const { error: settingsError } = await supabaseAdmin
      .from("settings")
      .insert([
        {
          tenant_id: createdTenantId,
          is_points_enabled: false,
          cancellation_window_days: 2,
          is_prepayment_required: false,
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

    const servicesToInsert = services.map((s: any) => ({
      tenant_id: createdTenantId,
      name: s.name,
      price: s.price,
      duration_minutes: s.duration_minutes,
      description: s.description,
      image_url: s.imageUrl
    }));

    const { data: createdServices, error: servicesError } = await supabaseAdmin
      .from("services")
      .insert(servicesToInsert)
      .select();

    if (servicesError || !createdServices) {
      throw new Error(`Erro ao criar serviços: ${servicesError?.message}`);
    }

    let barberUserId = createdUserId;

    const isBasicPlan = planId === "basico";
    const isBarberDifferent = !isBasicPlan && barber.email.toLowerCase() !== account.email.toLowerCase();

    if (isBarberDifferent) {
      const tempPassword = Math.random().toString(36).slice(-10) + "B1!";
      const { data: bAuthData, error: bAuthError } = await supabaseAdmin.auth.admin.createUser({
        email: barber.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: barber.name }
      });

      if (bAuthError || !bAuthData.user) {
        throw new Error(`Erro ao criar conta do barbeiro: ${bAuthError?.message}`);
      }
      barberUserId = bAuthData.user.id;
      createdBarberUserId = bAuthData.user.id;

      const { error: bProfileError } = await supabaseAdmin.from("profiles").upsert({
        id: barberUserId,
        full_name: barber.name,
        email: barber.email,
        accepted_terms: true,
        accepted_privacy: true,
        notifications_enabled: false,
        push_notifications_enabled: false
      }, { onConflict: 'id' });

      if (bProfileError) {
        throw new Error(`Erro ao criar perfil do barbeiro: ${bProfileError.message}`);
      }
    }

    const { data: barberData, error: barberError } = await supabaseAdmin
      .from("barbers")
      .insert([
        {
          tenant_id: createdTenantId,
          name: barber.name,
          description: barber.description,
          active: true,
          user_id: barberUserId,
          weekly_hours: {
            monday: { active: false, start: "09:00", end: "18:00" },
            tuesday: { active: false, start: "09:00", end: "18:00" },
            wednesday: { active: false, start: "09:00", end: "18:00" },
            thursday: { active: false, start: "09:00", end: "18:00" },
            friday: { active: false, start: "09:00", end: "18:00" },
            saturday: { active: false, start: "09:00", end: "18:00" },
            sunday: { active: false, start: "09:00", end: "18:00" }
          }
        }
      ])
      .select()
      .single();

    if (barberError || !barberData) {
      throw new Error(`Erro ao criar barbeiro: ${barberError?.message}`);
    }

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

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: createdUserId,
          full_name: account.fullName,
          email: account.email,
          phone: account.phone,
          accepted_terms: account.acceptedTerms,
          accepted_privacy: account.acceptedPrivacy,
          notifications_enabled: false,
          push_notifications_enabled: false
        },
        { onConflict: 'id' }
      );

    if (profileError) {
      throw new Error(`Erro ao criar perfil: ${profileError.message}`);
    }

    const memberships = [
      { user_id: createdUserId, tenant_id: createdTenantId, role: "admin" }
    ];
    if (isBarberDifferent && barberUserId) {
      memberships.push({
        user_id: barberUserId,
        tenant_id: createdTenantId,
        role: "barber"
      });
    }

    const { error: membershipError } = await supabaseAdmin
      .from("tenant_memberships")
      .insert(memberships);

    if (membershipError) {
      throw new Error(`Erro ao criar vínculos de acesso: ${membershipError.message}`);
    }

    await EmailService.sendAdminNotification(
      `Nova Barbearia: ${tenant.name}`,
      `
        <p><strong>Nome:</strong> ${tenant.name}</p>
        <p><strong>Slug:</strong> ${slug}</p>
        <p><strong>Admin:</strong> ${account.fullName} (${account.email})</p>
        <p><strong>Plano Selecionado:</strong> ${planId || 'basico'}</p>
        <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
      `
    );

    return NextResponse.json({ success: true, slug });

  } catch (error: any) {
    console.error("Onboarding Error:", error);

    if (createdTenantId) {
      await supabaseAdmin.from("barber_units").delete().eq("barber_id", (await supabaseAdmin.from("barbers").select("id").eq("tenant_id", createdTenantId)).data?.[0]?.id);
      await supabaseAdmin.from("barber_services").delete().eq("barber_id", (await supabaseAdmin.from("barbers").select("id").eq("tenant_id", createdTenantId)).data?.[0]?.id);
      await supabaseAdmin.from("service_units").delete().eq("unit_id", (await supabaseAdmin.from("units").select("id").eq("tenant_id", createdTenantId)).data?.[0]?.id);

      await supabaseAdmin.from("subscriptions").delete().eq("tenant_id", createdTenantId);
      await supabaseAdmin.from("barbers").delete().eq("tenant_id", createdTenantId);
      await supabaseAdmin.from("services").delete().eq("tenant_id", createdTenantId);
      await supabaseAdmin.from("units").delete().eq("tenant_id", createdTenantId);
      await supabaseAdmin.from("settings").delete().eq("tenant_id", createdTenantId);
      await supabaseAdmin.from("tenant_memberships").delete().eq("tenant_id", createdTenantId);
      
      await supabaseAdmin.from("tenants").delete().eq("id", createdTenantId);
    }
    if (createdUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdUserId);
    }
    if (createdBarberUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdBarberUserId);
    }

    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
