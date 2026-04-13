import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { config } from "@/lib/config";

export interface Barber {
  id: number;
  name: string;
  description: string;
  imageUrl?: string;
  active: boolean;
}

export class BarberService {
  private static mapToSupabase(data: Partial<Barber>) {
    const mapped: any = {};
    if (data.name !== undefined) mapped.name = data.name;
    if (data.description !== undefined) mapped.description = data.description;
    if (data.imageUrl !== undefined) mapped.image_url = data.imageUrl;
    if (data.active !== undefined) mapped.active = data.active;
    return mapped;
  }

  private static mapFromSupabase(data: any): Barber {
    if (!data) return null as any;
    return {
      id: Number(data.id),
      name: data.name,
      description: data.description,
      imageUrl: data.image_url,
      active: data.active
    };
  }

  static async list(): Promise<Barber[]> {
    if (!config.supabase.isConfigured || !supabaseAdmin) {
      throw new Error("Supabase is missing.");
    }

    const { data, error } = await supabaseAdmin
      .from("barbers")
      .select("*")
      .eq("active", true)
      .order("id", { ascending: true });

    if (error) {
      console.error("Error listing barbers:", error);
      // Return empty array if table doesn't exist yet to avoid crashing the frontend
      if (error.code === 'PGRST116' || error.message.includes('relation "barbers" does not exist')) {
        return [];
      }
      throw error;
    }
    return (data || []).map(d => this.mapFromSupabase(d));
  }

  static async getById(id: number): Promise<Barber | null> {
    if (!config.supabase.isConfigured || !supabaseAdmin) {
      throw new Error("Supabase is missing.");
    }

    const { data, error } = await supabaseAdmin
      .from("barbers")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return this.mapFromSupabase(data);
  }

  static async create(data: Omit<Barber, "id">): Promise<Barber> {
    if (!config.supabase.isConfigured || !supabaseAdmin) {
      throw new Error("Supabase is missing.");
    }

    const { data: newBarber, error } = await supabaseAdmin
      .from("barbers")
      .insert(this.mapToSupabase(data))
      .select()
      .single();

    if (error) throw error;
    return this.mapFromSupabase(newBarber);
  }

  static async update(id: number, data: Partial<Barber>): Promise<Barber> {
    if (!config.supabase.isConfigured || !supabaseAdmin) {
      throw new Error("Supabase is missing.");
    }

    const { data: updatedBarber, error } = await supabaseAdmin
      .from("barbers")
      .update(this.mapToSupabase(data))
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return this.mapFromSupabase(updatedBarber);
  }

  static async delete(id: number): Promise<void> {
    if (!config.supabase.isConfigured || !supabaseAdmin) {
      throw new Error("Supabase is missing.");
    }

    const { error } = await supabaseAdmin
      .from("barbers")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }
}
