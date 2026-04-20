import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { AuthService } from "@/lib/services/auth.service";
import { TenantContext } from "@/lib/services/tenant-context";

export async function GET(request: NextRequest) {
  const tenant = await TenantContext.getTenant(request);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
  }

  const result = await AuthService.verifySession(request, tenant.id);
  if (!result.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { user } = result;

  try {
    let query = supabaseAdmin!
      .from("appointments")
      .select("id, appointment_date, appointment_time, customer_name, customer_email, customer_phone, status, is_paid, is_reschedule, reschedule_id, user_id, created_at, barber_id, barber_name, tenant_id, unit_id, unit_name, total_price, total_duration, services_json")
      .eq("tenant_id", tenant.id);

    // Se for cliente, ver apenas os seus
    if (user?.role !== "admin") {
      query = query.eq("customer_email", user?.email);
    }

    const year = request.nextUrl.searchParams.get("year");
    const month = request.nextUrl.searchParams.get("month");

    if (year && month) {
      const startDate = `${year}-${month.padStart(2, "0")}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${year}-${month.padStart(2, "0")}-${lastDay}`;
      query = query.gte("appointment_date", startDate).lte("appointment_date", endDate);
    }

    const { data, error } = await query
      .order("appointment_date", { ascending: false })
      .order("appointment_time", { ascending: false });

    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("API Appointments Error:", error);
    return NextResponse.json({ error: "Erro ao carregar agendamentos" }, { status: 500 });
  }
}
