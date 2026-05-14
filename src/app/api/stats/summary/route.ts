import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { AuthService } from "@/lib/services/auth.service";
import { TenantContext } from "@/lib/services/tenant-context";
import { format } from "date-fns";

export async function GET(request: NextRequest) {
  const tenant = await TenantContext.getTenant(request);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
  }

  const result = await AuthService.verifySession(request, tenant.id);
  if (!result.authenticated || result.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");

    // Buscando agendamentos do tenant
    let query = supabaseAdmin!
      .from("appointments")
      .select("id, appointment_date, status, is_paid, payment_status, payment_method, paid_at, total_price, services_json")
      .eq("tenant_id", tenant.id);

    // Se houver filtros de data, aplicamos
    if (month && year) {
      const monthStr = month.padStart(2, '0');
      query = query.gte("appointment_date", `${year}-${monthStr}-01`)
        .lte("appointment_date", `${year}-${monthStr}-31`);
    }

    const { data: appointments, error: appointmentsError } = await query;

    if (appointmentsError) throw appointmentsError;

    const activeAppointments = appointments.filter(a => a.status !== "cancelled");
    const totalAppointments = activeAppointments.length;
    const todayAppointments = activeAppointments.filter(a => a.appointment_date === todayStr).length;

    const totalRevenue = appointments
      .filter(a => a.is_paid && a.status !== "cancelled")
      .reduce((sum, a) => sum + (Number(a.total_price) || 0), 0);

    const pendingRevenue = appointments
      .filter(a => !a.is_paid && a.status !== "cancelled")
      .reduce((sum, a) => sum + (Number(a.total_price) || 0), 0);

    const serviceCounts: Record<string, number> = {};
    appointments.forEach(a => {
      // Extrair nomes dos serviços do JSON
      const services = a.services_json || [];
      services.forEach((s: any) => {
        const name = s.name || "Serviço";
        serviceCounts[name] = (serviceCounts[name] || 0) + 1;
      });
    });

    let popularService = "Nenhum";
    let maxCount = 0;
    for (const [name, count] of Object.entries(serviceCounts)) {
      if (count > maxCount) {
        maxCount = count;
        popularService = name;
      }
    }

    return NextResponse.json({
      todayAppointments,
      totalAppointments,
      totalRevenue,
      pendingRevenue,
      popularService
    });
  } catch (error) {
    console.error("Stats Error:", error);
    return NextResponse.json({ error: "Erro ao carregar estatísticas" }, { status: 500 });
  }
}
