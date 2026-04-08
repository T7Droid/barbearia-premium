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
    if (config.supabase.isConfigured && supabase) {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("id", { ascending: true });

      if (error) throw error;
      return data as BarberService[];
    }

    return Array.from(SERVICES_STORE.values());
  }

  static async getById(id: number): Promise<BarberService | null> {
    if (config.supabase.isConfigured && supabase) {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("id", id)
        .single();

      if (error) return null;
      return data as BarberService;
    }

    return SERVICES_STORE.get(id) || null;
  }

  static async create(data: Omit<BarberService, "id">): Promise<BarberService> {
    if (config.supabase.isConfigured && supabase) {
      const { data: newService, error } = await supabase
        .from("services")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return newService as BarberService;
    }

    const id = Math.max(0, ...Array.from(SERVICES_STORE.keys())) + 1;
    const newService = { id, ...data, price: Math.round(data.price) };
    SERVICES_STORE.set(id, newService);
    return newService;
  }

  static async update(id: number, data: Partial<BarberService>): Promise<BarberService> {
    if (config.supabase.isConfigured && supabase) {
      const { data: updatedService, error } = await supabase
        .from("services")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return updatedService as BarberService;
    }

    const existing = SERVICES_STORE.get(id);
    if (!existing) throw new Error("Service not found");
    const updated = {
      ...existing,
      ...data,
      id,
      price: data.price !== undefined ? Math.round(data.price) : existing.price
    };
    SERVICES_STORE.set(id, updated);
    return updated;
  }

  static async delete(id: number): Promise<void> {
    if (config.supabase.isConfigured && supabase) {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return;
    }

    SERVICES_STORE.delete(id);
  }
}
