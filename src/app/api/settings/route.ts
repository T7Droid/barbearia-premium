import { NextResponse, NextRequest } from "next/server";
import { supabase, supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { AuthService } from "@/lib/services/auth.service";
import { TenantContext } from "@/lib/services/tenant-context";

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
    tenantSlug: tenant.slug
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
    if (input.weeklyHours) updateData.weekly_hours = input.weeklyHours;

    updateData.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabaseAdmin!
      .from("settings")
      .update(updateData)
      .eq("tenant_id", tenant.id)
      .select()
      .single();

    if (error) throw error;

    // --- SINCRONIZAÇÃO EM CASCATA ---
    if (input.weeklyHours) {
      console.log(`[API /api/settings] Cascading hours update for tenant ${tenant.id}`);
      const { data: barbers } = await supabaseAdmin!
        .from("barbers")
        .select("id, weekly_hours")
        .eq("tenant_id", tenant.id);

      if (barbers && barbers.length > 0) {
        const shopHours = input.weeklyHours;
        const barberUpdates = barbers.map(barber => {
          const bHours = barber.weekly_hours || {};
          const newBHours = { ...bHours };

          Object.keys(shopHours).forEach(day => {
            const sDay = shopHours[day] || { active: false, start: "00:00", end: "23:59" };
            const bDay = newBHours[day] || { active: false, start: "09:00", end: "18:00" };

            // 1. Se shop fecha o dia, barber desativa
            if (!sDay.active) {
              bDay.active = false;
            } else if (bDay.active) {
              // 2. Clipping: Ajustar se barbeiro ficou com horário fora do permitido
              if (bDay.start < sDay.start) bDay.start = sDay.start;
              if (bDay.end > sDay.end) bDay.end = sDay.end;

              // 3. Verificação de sanidade pós-clipping
              if (bDay.start >= bDay.end) bDay.active = false;
            }

            newBHours[day] = bDay;
          });

          return {
            id: barber.id,
            weekly_hours: newBHours,
            updated_at: new Date().toISOString()
          };
        });

        // Atualização em lote via upsert (Supabase usa o merge se ID existir)
        const { error: cascadeError } = await supabaseAdmin!
          .from("barbers")
          .upsert(barberUpdates);

        if (cascadeError) {
          console.error("[API /api/settings] Error in cascading update:", cascadeError);
        } else {
          console.log(`[API /api/settings] Successfully synchronized ${barbers.length} barbers.`);
        }
      }
    }
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
