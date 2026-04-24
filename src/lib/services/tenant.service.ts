import { supabase, supabaseAdmin } from "@/lib/supabase";

export interface Plan {
  id: string;
  name: string;
  max_barbers: number;
  max_units: number;
  max_appointments_month: number;
  price: number;
  slug: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  owner_id?: string;
  plan_id?: string;
  mp_connected?: boolean;
  mp_access_token?: string | null;
  mp_public_key?: string | null;
  mpConnected?: boolean;
  mpAccessToken?: string | null;
  plans?: Plan;
}

export class TenantService {
  static async getTenantBySlug(slug: string): Promise<Tenant | null> {
    if (!supabaseAdmin) return null;

    const { data, error } = await supabaseAdmin
      .from("tenants")
      .select("*, plans(*)")
      .eq("slug", slug)
      .single();

    if (error || !data) return null;
    return data;
  }

  static async getTenantById(id: string): Promise<Tenant | null> {
    if (!supabaseAdmin) return null;

    const { data, error } = await supabaseAdmin
      .from("tenants")
      .select("*, plans(*)")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return data;
  }

  static async isSubscriptionActive(tenantId: string): Promise<boolean> {
    if (!supabaseAdmin) return false;

    const { data, error } = await supabaseAdmin
      .from("subscriptions")
      .select("status, expires_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return false;

    const isStatusOk = ["active", "trialing"].includes(data.status);
    const isNotExpired = new Date(data.expires_at) > new Date();

    return isStatusOk && isNotExpired;
  }
}
