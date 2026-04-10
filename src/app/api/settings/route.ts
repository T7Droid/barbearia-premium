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

  if (error) {
    return NextResponse.json({ error: "Falha ao carregar configurações" }, { status: 500 });
  }

  // CamelCase conversion for consistency with the rest of the app
  const settings = {
    isPointsEnabled: data.is_points_enabled,
    cancellationWindowDays: data.cancellation_window_days,
    isPrepaymentRequired: data.is_prepayment_required,
    businessStartTime: data.business_start_time,
    businessEndTime: data.business_end_time,
    slotInterval: data.slot_interval,
    weeklyHours: data.weekly_hours,
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
    if (typeof input.cancellationWindowDays === "number") updateData.cancellation_window_days = input.cancellation_window_days;
    if (typeof input.isPrepaymentRequired === "boolean") updateData.is_prepayment_required = input.isPrepaymentRequired;
    if (input.businessStartTime) updateData.business_start_time = input.businessStartTime;
    if (input.businessEndTime) updateData.business_end_time = input.businessEndTime;
    if (typeof input.slotInterval === "number") updateData.slot_interval = input.slotInterval;
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
