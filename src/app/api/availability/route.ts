import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { AppointmentService } from "@/lib/services/appointment.service";
import { TenantContext } from "@/lib/services/tenant-context";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const serviceId = searchParams.get("serviceId");
  const barberId = searchParams.get("barberId");

  const tenant = await TenantContext.getTenant(request);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
  }

  if (!date || !serviceId) {
    return NextResponse.json({ error: "Data e serviço são obrigatórios" }, { status: 400 });
  }

  if (!isSupabaseConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Supabase não está configurado" }, { status: 500 });
  }

  try {
    // 1. Buscar barbeiro específico para pegar seus horários individuais
    let dayConfig = { active: false };
    let interval = 45;

    if (barberId) {
      const { data: barber } = await supabaseAdmin
        .from("barbers")
        .select("weekly_hours")
        .eq("id", parseInt(barberId))
        .single();
      
      if (barber?.weekly_hours) {
        // Determinar o dia da semana
        const targetDate = new Date(date + "T00:00:00");
        const daysMap = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const dayName = daysMap[targetDate.getDay()];
        dayConfig = barber.weekly_hours[dayName] || { active: false };
      }
    }

    // 2. Buscar configurações do tenant para o intervalo (slot_interval)
    const { data: settings } = await supabaseAdmin
      .from("settings")
      .select("slot_interval, weekly_hours")
      .eq("tenant_id", tenant.id)
      .single();

    if (settings) {
      interval = settings.slot_interval || 45;
      
      // Se o barbeiro NÃO tiver horários próprios (ainda não migrado), usamos o global
      if (!dayConfig.active) {
        const targetDate = new Date(date + "T00:00:00");
        const daysMap = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const dayName = daysMap[targetDate.getDay()];
        dayConfig = settings.weekly_hours?.[dayName] || { active: false };
      }
    }

    // Se o dia estiver fechado (tanto no barbeiro quanto no global)
    if (!dayConfig.active || !(dayConfig as any).start || !(dayConfig as any).end) {
      return NextResponse.json([]);
    }

    const startConfig = (dayConfig as any).start;
    const endConfig = (dayConfig as any).end;

    // 3. Gerar slots teóricos baseados no intervalo
    const slots: { time: string, available: boolean }[] = [];
    const interval = settings.slot_interval || 45;
    
    const [startH, startM] = dayConfig.start.split(":").map(Number);
    const [endH, endM] = dayConfig.end.split(":").map(Number);
    
    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    const rescheduleId = searchParams.get("reschedule");

    // 4. Buscar agendamentos já feitos para este dia e tenant
    const bookedTimes = await AppointmentService.getBookedSlots(
      date, 
      barberId ? parseInt(barberId) : undefined,
      tenant.id,
      rescheduleId ? parseInt(rescheduleId) : undefined
    );

    while (currentMinutes + interval <= endMinutes) {
      const h = Math.floor(currentMinutes / 60);
      const m = currentMinutes % 60;
      const timeStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      
      const isBooked = bookedTimes.includes(timeStr);
      
      slots.push({
        time: timeStr,
        available: !isBooked
      });
      
      currentMinutes += interval;
    }

    return NextResponse.json(slots);
  } catch (error: any) {
    console.error("Availability Error:", error);
    return NextResponse.json({ error: error.message || "Erro ao consultar disponibilidade" }, { status: 500 });
  }
}
