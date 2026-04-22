import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { AppointmentService } from "@/lib/services/appointment.service";
import { eachDayOfInterval, parseISO, format } from "date-fns";
import { TenantContext } from "@/lib/services/tenant-context";

export async function GET(request: NextRequest) {
  const tenant = await TenantContext.getTenant(request);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const barberId = searchParams.get("barberId");

  if (!start || !end) {
    return NextResponse.json({ error: "Parâmetros start e end são obrigatórios" }, { status: 400 });
  }

  if (!isSupabaseConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Supabase não configurado" }, { status: 500 });
  }

  try {
    // 1. Buscar configurações do tenant
    const { data: settings } = await supabaseAdmin
      .from("settings")
      .select("*")
      .eq("tenant_id", tenant.id)
      .single();

    const daysMap = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const interval = settings?.slot_interval || 45;

    // 2. Buscar agendamentos no intervalo
    const appointments = await AppointmentService.getBookedSlotsInRange(start, end, tenant.id);

    // Filtrar por barbeiro se fornecido
    const filteredAppointments = barberId 
      ? appointments.filter(a => String((a as any).barber_id) === String(barberId))
      : appointments;

    // Agrupar agendamentos por data
    const bookedCountByDate: Record<string, number> = {};
    filteredAppointments.forEach(a => {
      if (a.appointment_date) {
        bookedCountByDate[a.appointment_date] = (bookedCountByDate[a.appointment_date] || 0) + 1;
      }
    });

    // 3. Iterar por cada dia no intervalo
    const dates = eachDayOfInterval({
      start: parseISO(start),
      end: parseISO(end)
    });

    const busyDates: string[] = [];

    dates.forEach(date => {
      const dateStr = format(date, "yyyy-MM-dd");
      const dayName = daysMap[date.getDay()];
      
      const dayConfig = settings?.weekly_hours?.[dayName] || { active: false };
      
      // Se a unidade global está fechada, verificamos se o barbeiro tem exceção.
      // No momento, deixamos o front-end decidir o bloqueio por escala de barbeiro.
      // O busy-dates aqui só marca como "busy" se estiver REALMENTE lotado de agendamentos.
      
      if (!dayConfig.active || !dayConfig.start || !dayConfig.end) {
        return;
      }

      // Cálculo de lotação simplificado
      const [startH, startM] = dayConfig.start.split(":").map(Number);
      const [endH, endM] = dayConfig.end.split(":").map(Number);
      const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
      const maxSlots = Math.floor(totalMinutes / interval);

      const currentBookings = bookedCountByDate[dateStr] || 0;
      // Marcamos como lotado se tiver o dobro de agendamentos que um único barbeiro suporta (fator de segurança)
      if (maxSlots > 0 && currentBookings >= (maxSlots * 2)) {
        busyDates.push(dateStr);
      }
    });

    return NextResponse.json(busyDates);
  } catch (error) {
    console.error("Busy Dates Error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
