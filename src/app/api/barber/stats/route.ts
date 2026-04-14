import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { TenantContext } from "@/lib/services/tenant-context";
import { AuthService } from "@/lib/services/auth.service";
import { format } from "date-fns";

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const tenant = await TenantContext.getTenant(request);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
  }

  // Verificar se o usuário é um barbeiro
  const auth = await AuthService.verifySession(request, tenant.id);
  if (!auth.authenticated || auth.user?.role !== "barber") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  try {
    // 1. Encontrar o registro do barbeiro vinculado a este usuário
    const { data: barber, error: barberError } = await supabaseAdmin
      .from("barbers")
      .select("id")
      .eq("user_id", auth.user.id)
      .eq("tenant_id", tenant.id)
      .single();

    if (barberError || !barber) {
      return NextResponse.json({ error: "Barbeiro não vinculado ao sistema" }, { status: 404 });
    }

    const today = format(new Date(), "yyyy-MM-dd");

    // 2. Buscar agendamentos de hoje
    const { data: appointments, error: appError } = await supabaseAdmin
      .from("appointments")
      .select("*")
      .eq("barber_id", barber.id)
      .eq("appointment_date", today)
      .order("appointment_time", { ascending: true });

    if (appError) throw appError;

    // 3. Calcular estatísticas do dia
    const todayCount = appointments?.length || 0;
    const completedCount = appointments?.filter(a => a.status === "completed").length || 0;
    const pendingCount = appointments?.filter(a => a.status === "pending" || a.status === "confirmed").length || 0;
    const canceledCount = appointments?.filter(a => a.status === "cancelled").length || 0;
    
    // Eficiência (Comparecimento vs Total agendado sem contar cancelados)
    const validTotal = todayCount - canceledCount;
    const efficiency = validTotal > 0 ? Math.round((completedCount / validTotal) * 100) : 100;

    return NextResponse.json({
      stats: {
        todayCount,
        completedCount,
        pendingCount,
        efficiency
      },
      todayAppointments: appointments || []
    });
  } catch (error: any) {
    console.error("Error fetching barber stats:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
