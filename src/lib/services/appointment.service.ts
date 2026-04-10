import { SESSIONS_STORE, APPOINTMENTS_STORE } from "@/lib/mock-store";
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
  createdAt: string;
}

export class AppointmentService {
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

    if (!config.supabase.isConfigured || !supabase) {
      throw new Error("Supabase is missing.");
    }

    const sessionId = randomUUID();
    const { error } = await supabase
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
    if (!config.supabase.isConfigured || !supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return data as Appointment;
  }

  static async confirm(sessionId: string, paymentData: any): Promise<Appointment> {
    if (!config.supabase.isConfigured || !supabaseAdmin) {
      throw new Error("Supabase Admin is required for appointment confirmation.");
    }

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("checkout_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) throw new Error("Session not found");

    if (session.rescheduleId) {
      await supabaseAdmin.from("appointments").delete().eq("id", session.rescheduleId);
    }

    const appointmentData = {
      serviceId: session.serviceId,
      serviceName: session.serviceName,
      servicePrice: session.amount,
      appointmentDate: session.appointmentDate,
      appointmentTime: session.appointmentTime,
      customerName: session.customerName,
      customerEmail: session.customerEmail,
      customerPhone: session.customerPhone,
      status: "confirmed",
      isPaid: session.isPaid || paymentData.status === "approved",
      isReschedule: !!session.rescheduleId,
      createdAt: new Date().toISOString()
    };

    const { data: appointment, error: appError } = await supabaseAdmin
      .from("appointments")
      .insert(appointmentData)
      .select()
      .single();

    if (appError) throw appError;

    await supabaseAdmin.from("checkout_sessions").delete().eq("id", sessionId);

    return appointment as Appointment;
  }

  static async list(): Promise<Appointment[]> {
    if (!config.supabase.isConfigured || !supabase) {
      throw new Error("Supabase is missing.");
    }

    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .order("createdAt", { ascending: false });

    if (error) throw error;
    return data as Appointment[];
  }

  static async getStats(): Promise<any> {
    const appointments = await this.list();
    const todayStr = new Date().toISOString().split('T')[0];

    const todayAppointments = appointments.filter(a => a.appointmentDate === todayStr).length;
    const totalAppointments = appointments.length;
    const totalRevenue = appointments.reduce((sum, a) => sum + (a.servicePrice || 0), 0);

    const serviceCounts: Record<string, number> = {};
    appointments.forEach(a => {
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
}
