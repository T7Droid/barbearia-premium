import { NextResponse, NextRequest } from "next/server";
import { supabase, supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { AuthService } from "@/lib/services/auth.service";

export async function GET() {
  if (!isSupabaseConfigured || !supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("id", 1)
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
    mpPublicKey: process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || "",
  };

  return NextResponse.json(settings);
}

export async function POST(request: NextRequest) {
  const result = await AuthService.verifySession(request);
  if (!result.authenticated || result.user?.role !== "admin") {
    return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
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

    const { data: updated, error } = await supabaseAdmin
      .from("settings")
      .update(updateData)
      .eq("id", 1)
      .select()
      .single();

    if (error) throw error;

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
