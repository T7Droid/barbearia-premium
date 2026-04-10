import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { AppointmentService } from "@/lib/services/appointment.service";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const serviceId = searchParams.get("serviceId");

  if (!date || !serviceId) {
    return NextResponse.json({ error: "Data e ID do serviço são obrigatórios" }, { status: 400 });
  }

  if (!isSupabaseConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Supabase não está configurado" }, { status: 500 });
  }

  try {
    // 1. Buscar configurações do salão
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("settings")
      .select("*")
      .eq("id", 1)
      .single();

    if (settingsError || !settings) {
      throw new Error("Configurações não encontradas");
    }

    // 2. Determinar o dia da semana
    const targetDate = new Date(date + "T00:00:00");
    const daysMap = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayName = daysMap[targetDate.getDay()];
    
    const dayConfig = settings.weekly_hours?.[dayName] || { active: false };

    // Se o dia estiver fechado
    if (!dayConfig.active || !dayConfig.start || !dayConfig.end) {
      return NextResponse.json([]);
    }

    // 3. Gerar slots teóricos baseados no intervalo
    const slots: { time: string, available: boolean }[] = [];
    const interval = settings.slot_interval || 45;
    
    // Converter horas para minutos para facilitar o loop
    const [startH, startM] = dayConfig.start.split(":").map(Number);
    const [endH, endM] = dayConfig.end.split(":").map(Number);
    
    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // 4. Buscar agendamentos já feitos para este dia
    const bookedTimes = await AppointmentService.getBookedSlots(date);

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
