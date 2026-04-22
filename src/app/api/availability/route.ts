import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { AppointmentService } from "@/lib/services/appointment.service";
import { TenantContext } from "@/lib/services/tenant-context";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const serviceId = searchParams.get("serviceId");
  const barberId = searchParams.get("barberId");
  const unitId = searchParams.get("unitId");

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
    // Determinar o dia da semana (Usar Meio-dia para evitar shifts de fuso horário)
    const targetDate = new Date(date + "T12:00:00");
    const daysMap = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayName = daysMap[targetDate.getDay()];

    console.log(`[AVAILABILITY] Consultando ${date} -> Identificado como ${dayName}. Unidade: ${unitId}`);
    // Sincronização de escala concluída

    let dayConfig: any = { active: false, start: "09:00", end: "18:00" };
    let interval = 45;

    // 1. Buscar configurações da Unidade (OBRIGATÓRIO para limites)
    let unitHours = null;
    if (unitId) {
      const { data: unit } = await supabaseAdmin
        .from("units")
        .select("weekly_hours")
        .eq("id", unitId) // Removido parseInt pois o ID é UUID (string)
        .single();
      unitHours = unit?.weekly_hours;
    }

    // 2. Tentar pegar a configuração de horário de hoje
    if (barberId) {
      const { data: barber } = await supabaseAdmin
        .from("barbers")
        .select("weekly_hours")
        .eq("id", parseInt(barberId))
        .single();
      
      const schedule = barber?.weekly_hours;
      if (schedule) {
        // Normalizar unitId para busca
        const uId = unitId ? String(unitId).toLowerCase() : null;
        
        // Tenta encontrar o bloco da unidade (case-insensitive keys)
        let unitBlock = null;
        if (uId) {
          const matchingKey = Object.keys(schedule).find(k => k.toLowerCase() === uId);
          if (matchingKey) unitBlock = schedule[matchingKey];
        }

        if (unitBlock && unitBlock[dayName]) {
          dayConfig = unitBlock[dayName];
          console.log(`[AVAILABILITY] Encontrado horário por unidade (${unitId}) para ${dayName}:`, dayConfig);
        } else if (schedule[dayName]) {
          dayConfig = schedule[dayName];
          console.log(`[AVAILABILITY] Usando horário global (sem unidade) para ${dayName}:`, dayConfig);
        }
      }
    }

    // 3. Buscar configurações do tenant para o intervalo base (step)
    const { data: settings } = await supabaseAdmin
      .from("settings")
      .select("slot_interval, weekly_hours")
      .eq("tenant_id", tenant.id)
      .single();

    const step = settings?.slot_interval || 30;
    
    // 4. Determinar horário de fechamento final (Hard Lock)
    const dayEndMinutes = await AppointmentService.getBarberClosingTime(
      barberId ? parseInt(barberId) : undefined,
      unitId || undefined,
      date,
      tenant.id
    );

    // Se o dia não foi encontrado ou está inativo
    if (!dayConfig || !dayConfig.active || !dayConfig.start) {
      console.log(`[AVAILABILITY] Dia ${date} (${dayName}) bloqueado para o barbeiro ${barberId}. DayConfig:`, dayConfig);
      return NextResponse.json([]);
    }

    const [startH, startM] = dayConfig.start.split(":").map(Number);
    let currentMinutes = startH * 60 + startM;

    // 5. Calcular duração total dos serviços selecionados
    const rescheduleId = searchParams.get("reschedule");
    const serviceIdsRaw = searchParams.get("serviceIds") || serviceId;
    const serviceIds = serviceIdsRaw?.split(",").map(id => parseInt(id)) || [];

    const { ServiceService } = require("@/lib/services/service.service");
    const servicesData = await Promise.all(serviceIds.map(id => ServiceService.getById(id)));
    const totalRequiredDuration = servicesData.reduce((sum, s) => sum + (s?.durationMinutes || 0), 0);

    // 6. Buscar agendamentos existentes (agora retornando {time, duration})
    const bookedSlots = await AppointmentService.getBookedSlots(
      date, 
      barberId ? parseInt(barberId) : undefined,
      tenant.id,
      rescheduleId ? parseInt(rescheduleId) : undefined
    );

    // Pegar breakTime da config do barbeiro/unidade (default 0)
    let breakTime = 0;
    const configObj = (dayConfig as any).config || {};
    if (configObj.useBreakTime) {
      breakTime = parseInt(configObj.breakTimeMinutes || "0");
    }

    // 7. Algoritmo de Grade Dinâmica (Duração Total como Step)
    const slots: { time: string, available: boolean }[] = [];
    
    // O intervalo (step) agora é a duração total dos serviços, como solicitado pelo usuário
    const dynamicStep = totalRequiredDuration > 0 ? totalRequiredDuration : step;

    while (currentMinutes + totalRequiredDuration <= dayEndMinutes) {
      const h = Math.floor(currentMinutes / 60);
      const m = currentMinutes % 60;
      const timeStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;

      // Verificar colisão com agendamentos existentes
      const overlapping = bookedSlots.find(b => {
        const [bh, bm] = b.time.split(":").map(Number);
        const bStart = bh * 60 + bm;
        const bEnd = bStart + b.duration;
        
        // Colisão se o novo intervalo intersecta o agendamento existente
        return (currentMinutes < bEnd && (currentMinutes + totalRequiredDuration) > bStart);
      });

      if (overlapping) {
        // Se colidir, pula para o final do agendamento + tempo de respiro
        const [bh, bm] = overlapping.time.split(":").map(Number);
        currentMinutes = bh * 60 + bm + overlapping.duration + breakTime;
      } else {
        // Se livre, adiciona o slot e avança pela duração total do serviço
        slots.push({ time: timeStr, available: true });
        currentMinutes += dynamicStep;
      }
    }

    return NextResponse.json(slots);
  } catch (error: any) {
    console.error("Availability Error:", error);
    return NextResponse.json({ error: error.message || "Erro ao consultar disponibilidade" }, { status: 500 });
  }
}
