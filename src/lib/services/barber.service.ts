import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { config } from "@/lib/config";
import { TenantService } from "./tenant.service";

export interface Barber {
  id: number;
  name: string;
  description: string;
  imageUrl?: string;
  active: boolean;
  tenant_id?: string;
}

export class BarberService {
  private static mapToSupabase(data: Partial<Barber>) {
    const mapped: any = {};
    if (data.name !== undefined) mapped.name = data.name;
    if (data.description !== undefined) mapped.description = data.description;
    if (data.imageUrl !== undefined) mapped.image_url = data.imageUrl;
    if (data.active !== undefined) mapped.active = data.active;
    if (data.tenant_id !== undefined) mapped.tenant_id = data.tenant_id;
    return mapped;
  }

  private static mapFromSupabase(data: any): Barber {
    if (!data) return null as any;
    return {
      id: Number(data.id),
      name: data.name,
      description: data.description,
      imageUrl: data.image_url,
      active: data.active,
      tenant_id: data.tenant_id
    };
  }

  static async list(tenantId?: string): Promise<Barber[]> {
    if (!config.supabase.isConfigured || !supabaseAdmin) {
      throw new Error("Supabase is missing.");
    }

    let query = supabaseAdmin
      .from("barbers")
      .select("*")
      .eq("active", true)
      .order("id", { ascending: true });

    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    const { data, error } = await query;

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

  static async create(data: Omit<Barber, "id">, tenantId: string): Promise<Barber> {
    if (!config.supabase.isConfigured || !supabaseAdmin) {
      throw new Error("Supabase is missing.");
    }

    // 1. Validar Plano e Limites
    const tenant = await TenantService.getTenantById(tenantId);
    if (!tenant || !tenant.plans) {
      throw new Error("Plano da barbearia não encontrado para validação.");
    }

    // 2. Contar barbeiros ativos atuais
    const { count, error: countError } = await supabaseAdmin
      .from("barbers")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("active", true);

    if (countError) throw countError;

    if (count !== null && count >= tenant.plans.max_barbers) {
      throw new Error(`LIMITE_ATINGIDO: Seu plano (${tenant.plans.name}) permite no máximo ${tenant.plans.max_barbers} barbeiros ativos.`);
    }

    // 3. Criar
    const payload = { ...data, tenant_id: tenantId };
    const { data: newBarber, error } = await supabaseAdmin
      .from("barbers")
      .insert(this.mapToSupabase(payload))
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
