import { supabase, supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
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
  private static mapToSupabase(data: Partial<BarberService>) {
    const mapped: any = {};
    if (data.name !== undefined) mapped.name = data.name;
    if (data.description !== undefined) mapped.description = data.description;
    if (data.price !== undefined) mapped.price = Math.round(data.price);
    if (data.durationMinutes !== undefined) mapped.duration_minutes = Math.round(data.durationMinutes);
    if (data.imageUrl !== undefined) mapped.image_url = data.imageUrl;
    return mapped;
  }

  private static mapFromSupabase(data: any): BarberService {
    if (!data) return null as any;
    return {
      id: Number(data.id),
      name: data.name,
      description: data.description,
      price: Number(data.price),
      durationMinutes: Number(data.duration_minutes),
      imageUrl: data.image_url,
      // Extrair unit IDs da relação M2M
      units: data.service_units?.map((su: any) => ({ id: su.unit_id })) ?? []
    };
  }

  static async list(): Promise<BarberService[]> {
    if (!config.supabase.isConfigured || !supabaseAdmin) {
      throw new Error("Supabase is missing.");
    }

    const { data, error } = await supabaseAdmin
      .from("services")
      .select("*, service_units(unit_id)")
      .order("id", { ascending: true });

    if (error) throw error;
    return (data || []).map(d => this.mapFromSupabase(d));
  }

  static async getById(id: number): Promise<BarberService | null> {
    if (!config.supabase.isConfigured || !supabaseAdmin) {
      throw new Error("Supabase is missing.");
    }

    const { data, error } = await supabaseAdmin
      .from("services")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return this.mapFromSupabase(data);
  }

  static async create(data: Omit<BarberService, "id">): Promise<BarberService> {
    if (!config.supabase.isConfigured || !supabaseAdmin) {
      throw new Error("Supabase is missing.");
    }

    const { data: newService, error } = await supabaseAdmin
      .from("services")
      .insert(this.mapToSupabase(data))
      .select()
      .single();

    if (error) throw error;

    // Sincronizar Unidades
    if (Array.isArray(data.unitIds) && data.unitIds.length > 0) {
      const associations = data.unitIds.map(uId => ({
        service_id: newService.id,
        unit_id: uId
      }));
      await supabaseAdmin.from("service_units").insert(associations);
    }

    return this.mapFromSupabase(newService);
  }

  static async update(id: number, data: Partial<BarberService>): Promise<BarberService> {
    if (!config.supabase.isConfigured || !supabaseAdmin) {
      throw new Error("Supabase is missing.");
    }

    const { data: updatedService, error } = await supabaseAdmin
      .from("services")
      .update(this.mapToSupabase(data))
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Sincronizar Unidades
    if (Array.isArray(data.unitIds)) {
      await supabaseAdmin.from("service_units").delete().eq("service_id", id);
      if (data.unitIds.length > 0) {
        const associations = data.unitIds.map(uId => ({
          service_id: id,
          unit_id: uId
        }));
        await supabaseAdmin.from("service_units").insert(associations);
      }
    }

    return this.mapFromSupabase(updatedService);
  }

  static async delete(id: number): Promise<void> {
    if (!config.supabase.isConfigured || !supabaseAdmin) {
      throw new Error("Supabase is missing.");
    }

    const { error } = await supabaseAdmin
      .from("services")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }
}
