import { supabase, supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { randomUUID } from "crypto";
import { config } from "@/lib/config";
import { TenantService } from "./tenant.service";

export interface Appointment {
  id: number;
  totalPrice: number;
  totalDuration: number;
  servicesJson?: any[];
  barberId?: number;
  barberName?: string;
  unitId?: string;
  unitName?: string;
  appointmentDate: string;
  appointmentTime: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: "pending" | "confirmed" | "cancelled";
  isPaid: boolean;
  paymentStatus?: "pending" | "paid" | "refunded";
  paymentMethod?: "cash" | "pix" | "card" | "online" | null;
  paidAt?: string | null;
  isReschedule?: boolean;
  rescheduleId?: number;
  serviceId?: number;
  serviceName?: string;
  servicePrice?: number;
  userId?: string;
  tenantId: string;
  unit?: {
    id: string;
    name: string;
    address: string;
    number?: string;
    city?: string;
    state?: string;
  };
  createdAt: string;
}

export class AppointmentService {
  private static mapToSupabase(data: any) {
    const mapped: any = {};
    if (data.totalPrice !== undefined) mapped.total_price = data.totalPrice;
    if (data.totalDuration !== undefined) mapped.total_duration = data.totalDuration;
    if (data.servicesJson !== undefined) mapped.services_json = data.servicesJson;
    if (data.barberId !== undefined) mapped.barber_id = data.barberId;
    if (data.barberName !== undefined) mapped.barber_name = data.barberName;
    if (data.appointmentDate !== undefined) mapped.appointment_date = data.appointmentDate;
    if (data.appointmentTime !== undefined) mapped.appointment_time = data.appointmentTime;
    if (data.customerName !== undefined) mapped.customer_name = data.customerName;
    if (data.customerEmail !== undefined) mapped.customer_email = data.customerEmail;
    if (data.customerPhone !== undefined) mapped.customer_phone = data.customerPhone;
    if (data.status !== undefined) mapped.status = data.status;
    if (data.isPaid !== undefined) mapped.is_paid = data.isPaid;
    if (data.paymentStatus !== undefined) mapped.payment_status = data.paymentStatus;
    if (data.paymentMethod !== undefined) mapped.payment_method = data.paymentMethod;
    if (data.paidAt !== undefined) mapped.paid_at = data.paidAt;
    if (data.isReschedule !== undefined) mapped.is_reschedule = data.isReschedule;
    if (data.rescheduleId !== undefined) mapped.reschedule_id = data.rescheduleId;
    if (data.userId !== undefined) mapped.user_id = data.userId;
    if (data.tenantId !== undefined) mapped.tenant_id = data.tenantId;
    if (data.unitId !== undefined) mapped.unit_id = data.unitId;
    if (data.unitName !== undefined) mapped.unit_name = data.unitName;
    if (data.createdAt !== undefined) mapped.created_at = data.createdAt;
    return mapped;
  }

  private static mapFromSupabase(data: any): Appointment {
    if (!data) return {} as Appointment;
    
    // Captura o ID de forma agressiva e garante que seja um número (BigInt fix)
    const rawId = data.id ?? data.appointment_id ?? (data as any)._id;
    const finalId = typeof rawId === 'bigint' ? Number(rawId) : rawId;
    
    return {
      id: finalId,
      totalPrice: Number(data.total_price),
      totalDuration: Number(data.total_duration),
      servicesJson: data.services_json,
      serviceId: data.services_json && data.services_json.length > 0 ? Number(data.services_json[0].id) : 0,
      serviceName: data.services_json && data.services_json.length > 0 ? data.services_json.map((s: any) => s.name).join(" + ") : "",
      servicePrice: Number(data.total_price),
      barberId: data.barber_id ? Number(data.barber_id) : undefined,
      barberName: data.barber_name,
      appointmentDate: data.appointment_date,
      appointmentTime: data.appointment_time,
      customerName: data.customer_name,
      customerEmail: data.customer_email,
      customerPhone: data.customer_phone,
      status: data.status,
      isPaid: data.is_paid,
      paymentStatus: data.payment_status ?? (data.is_paid ? "paid" : "pending"),
      paymentMethod: data.payment_method ?? null,
      paidAt: data.paid_at ?? null,
      isReschedule: data.is_reschedule,
      rescheduleId: data.reschedule_id ? Number(data.reschedule_id) : undefined,
      userId: data.user_id,
      unitId: data.unit_id,
      unitName: data.unit_name,
      unit: data.units ? {
        id: data.units.id,
        name: data.units.name,
        address: data.units.address,
        number: data.units.number,
        city: data.units.city,
        state: data.units.state
      } : undefined,
      tenantId: data.tenant_id,
      createdAt: data.created_at,
    };
  }

  static async createCheckoutSession(data: any): Promise<any> {
    const { rescheduleId, serviceIds, serviceId: legacyId } = data;
    let isPaid = false;
    let originalPaymentMethod = null;

    // Support both single ID (legacy) and array of IDs
    const ids = Array.isArray(serviceIds) ? serviceIds : (legacyId ? [legacyId] : []);
    if (ids.length === 0) throw new Error("No services selected");

    const { ServiceService } = require("./service.service");
    
    // Fetch all services
    const services = await Promise.all(ids.map(id => ServiceService.getById(id)));
    const validServices = services.filter(s => !!s);
    
    if (validServices.length === 0) throw new Error("Services not found");

    if (rescheduleId) {
      const oldAppointment = await this.getById(parseInt(rescheduleId));
      if (oldAppointment?.isPaid) {
        isPaid = true;
        originalPaymentMethod = oldAppointment.paymentMethod;
      }
    }

    const totalAmount = validServices.reduce((sum, s) => sum + (s.price || 0), 0);
    const combinedNames = validServices.map(s => s.name).join(" + ");

    const sessionData = {
      ...data,
      isPaid,
      originalPaymentMethod,
      amount: totalAmount,
      serviceName: combinedNames,
      servicesJson: validServices,
      serviceId: validServices[0].id
    };

    if (!config.supabase.isConfigured || !supabaseAdmin) {
      throw new Error("Supabase Admin is required for checkout sessions.");
    }

    const sessionId = randomUUID();
    const { error } = await supabaseAdmin
      .from("checkout_sessions")
      .insert({
        id: sessionId,
        data: sessionData,
        tenant_id: data.tenantId,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      });

    if (error) throw error;
    return { sessionId, ...sessionData };
  }

  static async getById(id: number): Promise<Appointment | null> {
    if (!config.supabase.isConfigured || !supabaseAdmin) {
      throw new Error("Supabase Admin is required for backend lookups.");
    }

    const { data, error } = await supabaseAdmin!
      .from("appointments")
      .select("*, units(*)")
      .eq("id", id)
      .single();

    if (error) return null;
    return this.mapFromSupabase(data);
  }

  static async confirm(sessionId: string, paymentData: any): Promise<Appointment> {
    if (!config.supabase.isConfigured || !supabaseAdmin) {
      throw new Error("Supabase Admin is required for appointment confirmation.");
    }

    const { data: sessionDataRaw, error: sessionError } = await supabaseAdmin
      .from("checkout_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !sessionDataRaw) throw new Error("Session not found");
    const session = sessionDataRaw.data;

    // --- NOVA TRAVA: VALIDAR ASSINATURA E LIMITE MENSAL DE AGENDAMENTOS ---
    const [fullTenant, isSubActive] = await Promise.all([
      TenantService.getTenantById(sessionDataRaw.tenant_id),
      TenantService.isSubscriptionActive(sessionDataRaw.tenant_id)
    ]);

    if (!isSubActive) {
      throw new Error("SUBSCRIPTION_INACTIVE");
    }

    if (fullTenant && fullTenant.plans) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await supabaseAdmin
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", sessionDataRaw.tenant_id)
        .gte("created_at", startOfMonth.toISOString());

      if (count !== null && count >= fullTenant.plans.max_appointments_month) {
        throw new Error("LIMIT_APPOINTMENTS_REACHED");
      }
    }

    const totalDuration = session.servicesJson?.reduce((acc: number, s: any) => acc + (s.durationMinutes || 0), 0) || 0;
    const isAvailable = await this.isSlotAvailable(
      session.appointmentDate,
      session.appointmentTime,
      totalDuration,
      session.barberId,
      sessionDataRaw.tenant_id,
      session.unitId
    );

    if (!isAvailable) {
      throw new Error("SLOT_OCCUPIED");
    }
    // -------------------------------------------------------------

    if (session.rescheduleId) {
      await supabaseAdmin!.from("appointments").delete().eq("id", session.rescheduleId);
    }

    const isOnlinePayment = paymentData.paymentMethodId === "mercado_pago" || paymentData.paymentMethodId === "pix";
    const hasSuccessfulResult = paymentData.paymentResult && paymentData.paymentResult.status === "approved" && (paymentData.paymentResult.id || paymentData.paymentResult.payment_id);

    // Forçar isPaid como false se for pagamento no local, independente de qualquer outro dado
    const isPaid = (paymentData.paymentMethodId === "offline_local") ? false : (session.isPaid || (isOnlinePayment && hasSuccessfulResult));
    
    console.log(`[SERVER DEBUG] Confirmando agendamento: Método=${paymentData.paymentMethodId}, Pago=${isPaid}`);

    const now = new Date().toISOString();
    const appointmentData = this.mapToSupabase({
      totalPrice: session.amount,
      totalDuration: session.servicesJson?.reduce((acc: number, s: any) => acc + (s.durationMinutes || 0), 0) || 0,
      servicesJson: session.servicesJson,
      barberId: session.barberId,
      barberName: session.barberName,
      appointmentDate: session.appointmentDate,
      appointmentTime: session.appointmentTime,
      customerName: session.customerName,
      customerEmail: session.customerEmail,
      customerPhone: session.customerPhone,
      status: "confirmed",
      isPaid: isPaid,
      paymentStatus: isPaid ? "paid" : "pending",
      paymentMethod: isPaid ? paymentData.paymentMethodId : null,
      paidAt: isPaid ? now : null,
      isReschedule: !!session.rescheduleId,
      userId: session.userId,
      unitId: session.unitId,
      unitName: session.unitName,
      tenantId: sessionDataRaw.tenant_id,
      createdAt: now
    });

    const { data: appointment, error: appError } = await supabaseAdmin!
      .from("appointments")
      .insert(appointmentData)
      .select()
      .single();

    console.log("[SERVER DEBUG] Agendamento inserido no Supabase:", appointment);

    if (appError) throw appError;

    if (session.userId) {
      // --- LOYALTY POINTS LOGIC ---
      if (isPaid) {
        // 1. Fetch current settings for THIS tenant
        const { data: settingsData } = await supabaseAdmin
          .from("settings")
          .select("is_points_enabled, points_per_appointment")
          .eq("tenant_id", sessionDataRaw.tenant_id)
          .single();

        const settings = settingsData || { is_points_enabled: true, points_per_appointment: 5 };

        if (settings.is_points_enabled) {
          const pointsToAdd = settings.points_per_appointment || 0;

          // 2. Usar UPSERT para garantir que o perfil exista e atualizar os pontos NO TENANT correte
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("points, full_name")
            .eq("id", session.userId)
            .eq("tenant_id", sessionDataRaw.tenant_id)
            .single();

          const currentPoints = profile?.points || 0;
          const newPoints = currentPoints + pointsToAdd;

          const { error: upsertError } = await supabaseAdmin
            .from("profiles")
            .upsert({
              id: session.userId,
              tenant_id: sessionDataRaw.tenant_id,
              points: newPoints,
              full_name: profile?.full_name || session.customerName
            });

          if (upsertError) {
            console.error(`[LOYALTY] Erro ao atualizar pontos para o usuário ${session.userId} no tenant ${sessionDataRaw.tenant_id}:`, upsertError);
          }
        }
      }

      // --- RESCHEDULE COUNTER ---
      if (session.rescheduleId) {
        try {
          // Buscar perfil para pegar valor atual
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("reschedule_count")
            .eq("id", session.userId)
            .eq("tenant_id", sessionDataRaw.tenant_id)
            .single();

          const currentCount = profile?.reschedule_count || 0;

          await supabaseAdmin
            .from("profiles")
            .update({ reschedule_count: currentCount + 1 })
            .eq("id", session.userId)
            .eq("tenant_id", sessionDataRaw.tenant_id);
            
          console.log(`[REAGENDAMENTO] Contador incrementado para usuário ${session.userId}`);
        } catch (e) {
          console.error("[REAGENDAMENTO] Erro ao incrementar contador:", e);
        }
      }
    }
    // ----------------------------

    await supabaseAdmin!.from("checkout_sessions").delete().eq("id", sessionId);

    return this.mapFromSupabase(appointment);
  }
  
  static async cancel(id: number, tenantId: string): Promise<boolean> {
    if (!config.supabase.isConfigured || !supabaseAdmin) {
      throw new Error("Supabase Admin is required for appointment cancellation.");
    }

    try {
      // 1. Buscar o agendamento para pegar o user_id
      const { data: appData } = await supabaseAdmin
        .from("appointments")
        .select("user_id")
        .eq("id", id)
        .single();

      // 2. Atualizar o status para cancelado
      const { error } = await supabaseAdmin
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", id)
        .eq("tenant_id", tenantId);

      if (error) throw error;

      // 3. Incrementar contador de cancelamentos no perfil
      if (appData?.user_id) {
        try {
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("cancel_count")
            .eq("id", appData.user_id)
            .eq("tenant_id", tenantId)
            .single();

          const currentCount = profile?.cancel_count || 0;

          await supabaseAdmin
            .from("profiles")
            .update({ cancel_count: currentCount + 1 })
            .eq("id", appData.user_id)
            .eq("tenant_id", tenantId);
            
          console.log(`[CANCELAMENTO] Contador incrementado para usuário ${appData.user_id}`);
        } catch (e) {
          console.error("[CANCELAMENTO] Erro ao incrementar contador:", e);
        }
      }
    } catch (error: any) {
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        console.warn("STORE: Network error or CORS issue while refreshing profile (Failed to fetch).");
      } else {
        console.error(`[APPOINTMENT] Erro ao cancelar agendamento ${id}:`, error);
      }
      return false;
    }

    return true;
  }

  static async list(): Promise<Appointment[]> {
    const { data, error } = await supabaseAdmin!
      .from("appointments")
      .select("id, appointment_date, appointment_time, customer_name, customer_email, customer_phone, status, is_paid, payment_status, payment_method, paid_at, is_reschedule, reschedule_id, user_id, created_at, barber_id, barber_name, tenant_id, unit_id, total_price, total_duration, services_json")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(d => this.mapFromSupabase(d));
  }

  static async getStats(): Promise<any> {
    const appointments = await this.list();
    const todayStr = new Date().toISOString().split('T')[0];

    const todayAppointments = (appointments || []).filter(a => a.appointmentDate === todayStr).length;
    const totalAppointments = (appointments || []).length;
    const totalRevenue = (appointments || [])
      .filter(a => a.isPaid && a.status !== "cancelled")
      .reduce((sum, a) => sum + (a.servicePrice || 0), 0);

    const serviceCounts: Record<string, number> = {};
    (appointments || []).forEach(a => {
      if (a.serviceName) {
        serviceCounts[a.serviceName] = (serviceCounts[a.serviceName] || 0) + 1;
      }
    });

    let popularService = "Nenhum";
    let maxCount = 0;
    for (const [name, count] of Object.entries(serviceCounts)) {
      if (count > maxCount) {
        maxCount = count;
        popularService = name;
      }
    }

    return {
      todayAppointments,
      totalAppointments,
      totalRevenue,
      popularService
    };
  }

  static async getBookedSlots(date: string, barberId?: number, tenantId?: string, excludeId?: number): Promise<{time: string, duration: number}[]> {
    if (!config.supabase.isConfigured || !supabaseAdmin) {
      throw new Error("Supabase Admin is required for availability checks.");
    }

    let query = supabaseAdmin
      .from("appointments")
      .select("appointment_time, total_duration")
      .eq("appointment_date", date)
      .not("status", "eq", "cancelled");

    if (barberId) {
      query = query.eq("barber_id", barberId);
    }
    
    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data, error } = await query;

    if (error) throw error;
    
    return (data || []).map(a => ({
      time: a.appointment_time,
      duration: Number(a.total_duration || 30) 
    }));
  }

  static async isSlotAvailable(
    date: string, 
    time: string, 
    duration: number, 
    barberId: number | undefined, 
    tenantId: string,
    unitId?: string,
    excludeId?: number
  ): Promise<boolean> {
    const booked = await this.getBookedSlots(date, barberId, tenantId, excludeId);
    
    const [h, m] = time.split(":").map(Number);
    const newStart = h * 60 + m;
    const newEnd = newStart + duration;

    // 1. Checar Expediente (Fechamento)
    const closingTime = await this.getBarberClosingTime(barberId, unitId, date, tenantId);
    if (newEnd > closingTime) {
      return false;
    }

    // 2. Checar Conflitos com outros agendamentos
    const hasConflict = booked.some(b => {
      const [bh, bm] = b.time.split(":").map(Number);
      const bStart = bh * 60 + bm;
      const bEnd = bStart + b.duration;

      // Colisão se o novo intervalo intersecta o existente
      return (newStart < bEnd && newEnd > bStart);
    });

    return !hasConflict;
  }

  static async getBarberClosingTime(
    barberId: number | undefined, 
    unitId: string | undefined, 
    date: string,
    tenantId: string
  ): Promise<number> {
    if (!supabaseAdmin) return 1080; // 18:00 default fallback

    const targetDate = new Date(date + "T12:00:00"); 
    const daysMap = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayName = daysMap[targetDate.getDay()];

    let closingMinutes = 1080; // 18:00 default

    // 1. Tentar pegar a config do Barbeiro (específica da unidade ou global)
    if (barberId) {
      const { data: barber } = await supabaseAdmin
        .from("barbers")
        .select("weekly_hours")
        .eq("id", barberId)
        .single();
      
      if (barber?.weekly_hours) {
        const h = barber.weekly_hours;
        let dayConfig = null;
        
        // Normalizar unitId para busca insensível a maiúsculas
        const uId = unitId ? String(unitId).toLowerCase() : null;
        let unitBlock = null;
        if (uId) {
          const matchingKey = Object.keys(h).find(k => k.toLowerCase() === uId);
          if (matchingKey) unitBlock = h[matchingKey];
        }

        if (unitBlock && unitBlock[dayName]) {
          dayConfig = unitBlock[dayName];
        } else if (h[dayName]) {
          dayConfig = h[dayName];
        }

        if (dayConfig?.active && dayConfig.end) {
          const [hh, mm] = dayConfig.end.split(":").map(Number);
          return hh * 60 + mm;
        }
      }
    }

    // 2. Se não achou no barbeiro, tenta na Unidade
    if (unitId) {
      const { data: unit } = await supabaseAdmin
        .from("units")
        .select("weekly_hours")
        .eq("id", unitId)
        .single();
      
      const dayConfig = unit?.weekly_hours?.[dayName];
      if (dayConfig?.active && dayConfig.end) {
        const [hh, mm] = dayConfig.end.split(":").map(Number);
        closingMinutes = hh * 60 + mm;
      }
    }

    return closingMinutes;
  }

  static async getBookedSlotsInRange(startDate: string, endDate: string, tenantId: string) {
    if (!config.supabase.isConfigured || !supabaseAdmin) {
      throw new Error("Supabase Admin is required for availability checks.");
    }

    const { data, error } = await supabaseAdmin
      .from("appointments")
      .select("appointment_date, appointment_time")
      .eq("tenant_id", tenantId)
      .gte("appointment_date", startDate)
      .lte("appointment_date", endDate)
      .not("status", "eq", "cancelled");

    if (error) throw error;
    return data || [];
  }
}
