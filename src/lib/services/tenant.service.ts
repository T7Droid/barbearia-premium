import { supabase, supabaseAdmin } from "@/lib/supabase";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  owner_id?: string;
}

export class TenantService {
  static async getTenantBySlug(slug: string): Promise<Tenant | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error || !data) return null;
    return data;
  }

  static async getTenantById(id: string): Promise<Tenant | null> {
    if (!supabaseAdmin) return null;

    const { data, error } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return data;
  }
}
