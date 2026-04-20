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

  // Verificar se o usuário é um barbeiro ou administrador
  const auth = await AuthService.verifySession(request, tenant.id);
  if (!auth.authenticated || (auth.user?.role !== "barber" && auth.user?.role !== "admin")) {
    return NextResponse.json({ error: "ER-BAR-STS-403: Não autorizado" }, { status: 403 });
  }

  try {
    // 1. Encontrar o registro do barbeiro vinculado a este usuário
    const { data: barber, error: barberError } = await supabaseAdmin
      .from("barbers")
      .select("id, commission_percentage")
      .eq("user_id", auth.user.id)
      .eq("tenant_id", tenant.id)
      .single();

    if (barberError || !barber) {
      // Se for admin, não retornamos erro, apenas um estado vazio
      const isAdmin = auth.user?.role === "admin";
      if (isAdmin) {
        return NextResponse.json({
          hasProfile: false,
          stats: { todayCount: 0, completedCount: 0, pendingCount: 0, efficiency: 100 },
          todayAppointments: [],
          commissionPercentage: 50 // Default para admin visualizando
        });
      }
      return NextResponse.json({ error: "Barbeiro não vinculado ao sistema" }, { status: 404 });
    }

    const year = request.nextUrl.searchParams.get("year");
    const month = request.nextUrl.searchParams.get("month");

    // 2. Buscar agendamentos deste barbeiro
    let query = supabaseAdmin!
      .from("appointments")
      .select("id, appointment_date, appointment_time, customer_name, customer_email, customer_phone, status, is_paid, is_reschedule, reschedule_id, user_id, created_at, barber_id, barber_name, tenant_id, unit_id, total_price, total_duration, services_json")
      .eq("barber_id", barber.id);

    if (year && month) {
      const startDate = `${year}-${month.padStart(2, "0")}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${year}-${month.padStart(2, "0")}-${lastDay}`;
      query = query.gte("appointment_date", startDate).lte("appointment_date", endDate);
    }

    const { data: appointments, error: appError } = await query
      .order("appointment_date", { ascending: false })
      .order("appointment_time", { ascending: false });

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
      hasProfile: true,
      stats: {
        todayCount,
        completedCount,
        pendingCount,
        efficiency
      },
      commissionPercentage: barber.commission_percentage ?? 50,
      todayAppointments: appointments || []
    });
  } catch (error: any) {
    console.error("Error fetching barber stats:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
