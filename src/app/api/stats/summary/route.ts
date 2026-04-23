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
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");

    // Buscando agendamentos do tenant
    const { data: appointments, error: appointmentsError } = await supabaseAdmin!
      .from("appointments")
      .select("id, appointment_date, status, is_paid, payment_status, payment_method, paid_at, total_price, services_json")
      .eq("tenant_id", tenant.id);

    if (appointmentsError) throw appointmentsError;

    const totalAppointments = appointments.length;
    const todayAppointments = appointments.filter(a => a.appointment_date === todayStr).length;
    
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
