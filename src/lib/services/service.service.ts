import { SERVICES_STORE } from "@/lib/mock-store";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { config } from "@/lib/config";

export interface BarberService {
  id: number;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  imageUrl?: string;
}

export class ServiceService {
  static async list(): Promise<BarberService[]> {
    if (!config.supabase.isConfigured || !supabase) {
      throw new Error("Supabase is missing.");
    }

    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("id", { ascending: true });

    if (error) throw error;
    return data as BarberService[];
  }

  static async getById(id: number): Promise<BarberService | null> {
    if (!config.supabase.isConfigured || !supabase) {
      throw new Error("Supabase is missing.");
    }

    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return data as BarberService;
  }

  static async create(data: Omit<BarberService, "id">): Promise<BarberService> {
    if (!config.supabase.isConfigured || !supabase) {
      throw new Error("Supabase is missing.");
    }

    const { data: newService, error } = await supabase
      .from("services")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return newService as BarberService;
  }

  static async update(id: number, data: Partial<BarberService>): Promise<BarberService> {
    if (!config.supabase.isConfigured || !supabase) {
      throw new Error("Supabase is missing.");
    }

    const { data: updatedService, error } = await supabase
      .from("services")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return updatedService as BarberService;
  }

  static async delete(id: number): Promise<void> {
    if (!config.supabase.isConfigured || !supabase) {
      throw new Error("Supabase is missing.");
    }

    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }
}
