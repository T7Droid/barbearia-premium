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
    const unitId = searchParams.get("unitId");
    const totalDuration = parseInt(searchParams.get("totalDuration") || "0");

    // 2. Buscar agendamentos no intervalo
    const appointments = await AppointmentService.getBookedSlotsInRange(start, end, tenant.id);

    // Agrupar agendamentos por data e barbeiro
    const bookedByDate: Record<string, {time: string, duration: number}[]> = {};
    appointments.forEach((a: any) => {
      const dateStr = a.appointment_date;
      if (barberId && String(a.barber_id) !== String(barberId)) return;
      
      if (!bookedByDate[dateStr]) bookedByDate[dateStr] = [];
      bookedByDate[dateStr].push({
        time: a.appointment_time,
        duration: Number(a.total_duration || 30)
      });
    });

    // 3. Buscar escala do barbeiro se fornecido
    let barberSchedule: any = null;
    if (barberId) {
      const { data: barber } = await supabaseAdmin
        .from("barbers")
        .select("weekly_hours")
        .eq("id", parseInt(barberId))
        .single();
      barberSchedule = barber?.weekly_hours;
    }

    // 4. Iterar por cada dia no intervalo
    const dates = eachDayOfInterval({
      start: parseISO(start),
      end: parseISO(end)
    });

    const busyDates: string[] = [];

    for (const date of dates) {
      const dateStr = format(date, "yyyy-MM-dd");
      const dayName = daysMap[date.getDay()];
      
      // Determinar a configuração do dia para este barbeiro/unidade
      let dayConfig = null;
      if (barberSchedule) {
        const uId = unitId ? String(unitId).toLowerCase() : null;
        let unitBlock = null;
        if (uId) {
          const matchingKey = Object.keys(barberSchedule).find(k => k.toLowerCase() === uId);
          if (matchingKey) unitBlock = barberSchedule[matchingKey];
        }
        dayConfig = unitBlock ? unitBlock[dayName] : barberSchedule[dayName];
      }

      // Se não houver configuração ou o barbeiro estiver inativo no dia
      if (!dayConfig || !dayConfig.active || !dayConfig.start || !dayConfig.end) {
        busyDates.push(dateStr);
        continue;
      }

      // Simulação de disponibilidade simplificada para este dia
      const [startH, startM] = dayConfig.start.split(":").map(Number);
      const [endH, endM] = dayConfig.end.split(":").map(Number);
      const dayEndMinutes = endH * 60 + endM;
      let currentMinutes = startH * 60 + startM;
      const dayAppointments = bookedByDate[dateStr] || [];
      
      let hasAnySlot = false;
      const required = totalDuration > 0 ? totalDuration : 30;

      while (currentMinutes + required <= dayEndMinutes) {
        const overlapping = dayAppointments.find(b => {
          const [bh, bm] = b.time.split(":").map(Number);
          const bStart = bh * 60 + bm;
          const bEnd = bStart + b.duration;
          return (currentMinutes < bEnd && (currentMinutes + required) > bStart);
        });

        if (overlapping) {
          const [bh, bm] = overlapping.time.split(":").map(Number);
          currentMinutes = bh * 60 + bm + overlapping.duration;
        } else {
          hasAnySlot = true;
          break;
        }
      }

      if (!hasAnySlot) {
        busyDates.push(dateStr);
      }
    }

    return NextResponse.json(busyDates);
  } catch (error) {
    console.error("Busy Dates Error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
