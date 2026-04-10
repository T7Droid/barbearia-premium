import { supabase, supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { randomUUID } from "crypto";
import { config } from "@/lib/config";

export interface Appointment {
  id: number;
  serviceId: number;
  serviceName: string;
  servicePrice: number;
  appointmentDate: string;
  appointmentTime: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: "pending" | "confirmed" | "cancelled";
  isPaid: boolean;
  isReschedule?: boolean;
  rescheduleId?: number;
  userId?: string;
  createdAt: string;
}

export class AppointmentService {
  private static mapToSupabase(data: any) {
    const mapped: any = {};
    if (data.serviceId !== undefined) mapped.service_id = data.serviceId;
    if (data.serviceName !== undefined) mapped.service_name = data.serviceName;
    if (data.servicePrice !== undefined) mapped.service_price = data.servicePrice;
    if (data.appointmentDate !== undefined) mapped.appointment_date = data.appointmentDate;
    if (data.appointmentTime !== undefined) mapped.appointment_time = data.appointmentTime;
    if (data.customerName !== undefined) mapped.customer_name = data.customerName;
    if (data.customerEmail !== undefined) mapped.customer_email = data.customerEmail;
    if (data.customerPhone !== undefined) mapped.customer_phone = data.customerPhone;
    if (data.status !== undefined) mapped.status = data.status;
    if (data.isPaid !== undefined) mapped.is_paid = data.isPaid;
    if (data.isReschedule !== undefined) mapped.is_reschedule = data.isReschedule;
    if (data.rescheduleId !== undefined) mapped.reschedule_id = data.rescheduleId;
    if (data.userId !== undefined) mapped.user_id = data.userId;
    if (data.createdAt !== undefined) mapped.created_at = data.createdAt;
    return mapped;
  }

  private static mapFromSupabase(data: any): Appointment {
    if (!data) return null as any;
    return {
      id: Number(data.id),
      serviceId: Number(data.service_id),
      serviceName: data.service_name,
      servicePrice: Number(data.service_price),
      appointmentDate: data.appointment_date,
      appointmentTime: data.appointment_time,
      customerName: data.customer_name,
      customerEmail: data.customer_email,
      customerPhone: data.customer_phone,
      status: data.status,
      isPaid: data.is_paid,
      isReschedule: data.is_reschedule,
      rescheduleId: data.reschedule_id ? Number(data.reschedule_id) : undefined,
      userId: data.user_id,
      createdAt: data.created_at,
    };
  }

  static async createCheckoutSession(data: any): Promise<any> {
    const { rescheduleId, serviceId } = data;
    let isPaid = false;

    const { ServiceService } = require("./service.service");
    const service = await ServiceService.getById(serviceId);
    if (!service) throw new Error("Service not found");

    if (rescheduleId) {
      const oldAppointment = await this.getById(parseInt(rescheduleId));
      if (oldAppointment?.isPaid) isPaid = true;
    }

    const sessionData = {
      ...data,
      isPaid,
      amount: service.price,
      serviceName: service.name
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
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      });

    if (error) throw error;
    return { sessionId, ...sessionData };
  }

  static async getById(id: number): Promise<Appointment | null> {
    if (!config.supabase.isConfigured || !supabaseAdmin) {
      throw new Error("Supabase Admin is required for backend lookups.");
    }

    const { data, error } = await supabaseAdmin
      .from("appointments")
      .select("*")
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

    if (session.rescheduleId) {
      await supabaseAdmin!.from("appointments").delete().eq("id", session.rescheduleId);
    }

    const isPaid = session.isPaid || (
      (paymentData.paymentMethodId === "mercado_pago" || paymentData.paymentMethodId === "pix") &&
      paymentData.paymentResult.status === "approved"
    );

    const appointmentData = this.mapToSupabase({
      serviceId: session.serviceId,
      serviceName: session.serviceName,
      servicePrice: session.amount,
      appointmentDate: session.appointmentDate,
      appointmentTime: session.appointmentTime,
      customerName: session.customerName,
      customerEmail: session.customerEmail,
      customerPhone: session.customerPhone,
      status: "confirmed",
      isPaid: isPaid,
      isReschedule: !!session.rescheduleId,
      userId: session.userId,
      createdAt: new Date().toISOString()
    });

    const { data: appointment, error: appError } = await supabaseAdmin!
      .from("appointments")
      .insert(appointmentData)
      .select()
      .single();

    if (appError) throw appError;

    // --- LOYALTY POINTS LOGIC ---
    // Only award points if points are enabled AND the appointment is paid AND there is a user
    if (session.userId && isPaid) {
      // 1. Fetch current settings with fallback
      const { data: settingsData } = await supabaseAdmin
        .from("settings")
        .select("is_points_enabled, points_per_appointment")
        .eq("id", 1)
        .single();

      // Fallback para valores padrão caso a consulta falhe
      const settings = settingsData || { is_points_enabled: true, points_per_appointment: 5 };

      console.log(`[LOYALTY CHECK] Configurações: enabled=${settings.is_points_enabled}, ptsPerApp=${settings.points_per_appointment}`);

      if (settings.is_points_enabled) {
        const pointsToAdd = settings.points_per_appointment || 0;

        // 2. Usar UPSERT para garantir que o perfil exista e atualizar os pontos
        // Usamos supabaseAdmin para bypassar RLS e garantir a atualização
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("points, full_name")
          .eq("id", session.userId)
          .single();

        const currentPoints = profile?.points || 0;
        const newPoints = currentPoints + pointsToAdd;

        const { error: upsertError } = await supabaseAdmin
          .from("profiles")
          .upsert({
            id: session.userId,
            points: newPoints,
            full_name: profile?.full_name || session.customerName
          });

        if (upsertError) {
          console.error(`[LOYALTY] Erro ao atualizar pontos para o usuário ${session.userId}:`, upsertError);
        } else {
          console.log(`[LOYALTY] Sucesso! Usuário ${session.userId} recebeu ${pointsToAdd} pontos. Novo total: ${newPoints}`);
        }
      } else {
        console.log(`[LOYALTY] Sistema de pontos desativado nas configurações.`);
      }
    } else {
      console.log(`[LOYALTY] Pontos NÃO atribuídos: userId=${session.userId}, isPaid=${isPaid}`);
    }
    // ----------------------------

    await supabaseAdmin!.from("checkout_sessions").delete().eq("id", sessionId);

    return this.mapFromSupabase(appointment);
  }

  static async list(): Promise<Appointment[]> {
    if (!config.supabase.isConfigured || !supabaseAdmin) {
      throw new Error("Supabase Admin is required for listing appointments on server.");
    }

    const { data, error } = await supabaseAdmin
      .from("appointments")
      .select("*")
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
      .filter(a => a.isPaid)
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

  static async getBookedSlots(date: string): Promise<string[]> {
    if (!config.supabase.isConfigured || !supabaseAdmin) {
      throw new Error("Supabase Admin is required for availability checks.");
    }

    const { data, error } = await supabaseAdmin
      .from("appointments")
      .select("appointment_time")
      .eq("appointment_date", date)
      .not("status", "eq", "cancelled");

    if (error) throw error;
    return (data || []).map(a => a.appointment_time);
  }

  static async getBookedSlotsInRange(startDate: string, endDate: string) {
    if (!config.supabase.isConfigured || !supabaseAdmin) {
      throw new Error("Supabase Admin is required for availability checks.");
    }

    const { data, error } = await supabaseAdmin
      .from("appointments")
      .select("appointment_date, appointment_time")
      .gte("appointment_date", startDate)
      .lte("appointment_date", endDate)
      .not("status", "eq", "cancelled");

    if (error) throw error;
    return data || [];
  }
}
