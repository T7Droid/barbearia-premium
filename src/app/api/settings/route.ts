import { NextResponse, NextRequest } from "next/server";
import { supabase, supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { AuthService } from "@/lib/services/auth.service";
import { TenantContext } from "@/lib/services/tenant-context";
import { TenantService } from "@/lib/services/tenant.service";

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured || !supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const tenant = await TenantContext.getTenant(request);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin!
    .from("settings")
    .select("*")
    .eq("tenant_id", tenant.id)
    .single();

  // Buscar informações de conexão do tenant
  const { data: tenantData } = await supabaseAdmin!
    .from("tenants")
    .select("mp_connected, mp_public_key, mp_connection_error")
    .eq("id", tenant.id)
    .single();

  // Se houver erro ou não houver dados, usamos valores padrão seguros
  const defaultData = {
    is_points_enabled: true,
    points_per_appointment: 5,
    initial_points: 20,
    cancellation_window_days: 2,
    is_prepayment_required: false,
    business_start_time: "09:00",
    business_end_time: "18:00",
    slot_interval: 45,
    weekly_hours: null
  };

  const finalData = data || defaultData;

  // --- NOVA LÓGICA DE PLANO E ASSINATURA ---
  const [fullTenant, isSubActive] = await Promise.all([
    TenantService.getTenantById(tenant.id),
    TenantService.isSubscriptionActive(tenant.id)
  ]);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count: appointmentsCount } = await supabaseAdmin!
    .from("appointments")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenant.id)
    .gte("created_at", startOfMonth.toISOString());
  // ------------------------------------------

  const settings = {
    isPointsEnabled: finalData.is_points_enabled,
    pointsPerAppointment: finalData.points_per_appointment,
    initialPoints: finalData.initial_points || 0,
    cancellationWindowDays: finalData.cancellation_window_days,
    isPrepaymentRequired: finalData.is_prepayment_required,
    businessStartTime: finalData.business_start_time,
    businessEndTime: finalData.business_end_time,
    slotInterval: finalData.slot_interval,
    weeklyHours: finalData.weekly_hours,
    mpPublicKey: tenantData?.mp_public_key || process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || "",
    mpConnected: tenantData?.mp_connected || false,
    mpConnectionError: tenantData?.mp_connection_error || null,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    plan: fullTenant?.plans || null,
    isSubscriptionActive: isSubActive,
    appointmentsCount: appointmentsCount || 0
  };

  return NextResponse.json(settings);
}

export async function POST(request: NextRequest) {
  const tenant = await TenantContext.getTenant(request);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
  }

  const result = await AuthService.verifySession(request, tenant.id);
  if (!result.authenticated || result.user?.role !== "admin") {
    return NextResponse.json({ error: "Acesso restrito a administradores desta barbearia" }, { status: 403 });
  }

  try {
    const input = await request.json();

    const updateData: any = {};
    if (typeof input.isPointsEnabled === "boolean") updateData.is_points_enabled = input.isPointsEnabled;

    // Convert numbers to ensure persistence
    if (input.pointsPerAppointment !== undefined) updateData.points_per_appointment = parseInt(input.pointsPerAppointment);
    if (input.initialPoints !== undefined) updateData.initial_points = parseInt(input.initialPoints);
    if (input.cancellationWindowDays !== undefined) updateData.cancellation_window_days = parseInt(input.cancellationWindowDays);

    if (typeof input.isPrepaymentRequired === "boolean") updateData.is_prepayment_required = input.isPrepaymentRequired;
    if (input.businessStartTime) updateData.business_start_time = input.businessStartTime;
    if (input.businessEndTime) updateData.business_end_time = input.businessEndTime;

    if (input.slotInterval !== undefined) updateData.slot_interval = parseInt(input.slotInterval);

    updateData.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabaseAdmin!
      .from("settings")
      .update(updateData)
      .eq("tenant_id", tenant.id)
      .select()
      .single();

    if (error) throw error;

    // --- FIM SINCRONIZAÇÃO EM CASCATA ---


    return NextResponse.json({
      isPointsEnabled: updated.is_points_enabled,
      pointsPerAppointment: updated.points_per_appointment,
      initialPoints: updated.initial_points,
      cancellationWindowDays: updated.cancellation_window_days,
      isPrepaymentRequired: updated.is_prepayment_required,
      businessStartTime: updated.business_start_time,
      businessEndTime: updated.business_end_time,
      slotInterval: updated.slot_interval,
      weeklyHours: updated.weekly_hours,
    });
  } catch (error) {
    return NextResponse.json({ error: "Falha ao salvar configurações" }, { status: 500 });
  }
}
