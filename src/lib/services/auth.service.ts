import { supabase, supabaseAdmin } from "@/lib/supabase";


export class AuthService {
  static async getCurrentUser(token: string, tenantId?: string) {
    if (!token) return null;

    const { data: { user }, error } = await supabase!.auth.getUser(token);
    if (error || !user) return null;

    // Lógica de papel (Role) Multi-Tenant:
    let userRole = "client";


    // 1. Verificamos se há um cargo específico para este tenant na nova tabela
    let membership: any = null;

    if (tenantId) {
      // Buscar o tenant para checar o owner_id
      const { data: tenantData } = await supabaseAdmin!
        .from("tenants")
        .select("owner_id")
        .eq("id", tenantId)
        .single();

      const { data: mData } = await supabaseAdmin!
        .from("tenant_memberships")
        .select("role, points, cancel_count, reschedule_count, can_pay_at_shop")
        .eq("user_id", user.id)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      
      membership = mData;

      if (membership) {
        userRole = membership.role;
      } else if (tenantData?.owner_id === user.id) {
        userRole = "admin";
      }
    }


    const { data: profile } = await supabaseAdmin!
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return {
      id: user.id,
      email: user.email,
      name: profile?.full_name || user.user_metadata?.full_name || user.email,
      role: userRole,
      points: membership?.points || 0,
      phone: profile?.phone || "",
      tenantId: tenantId,
      notificationsEnabled: profile?.notifications_enabled ?? false,
      pushNotificationsEnabled: profile?.push_notifications_enabled ?? false,
      rescheduleCount: membership?.reschedule_count || 0,
      cancelCount: membership?.cancel_count || 0,
      canPayAtShop: membership?.can_pay_at_shop ?? true,
      fcmToken: profile?.fcm_token || ""
    };
  }

  static async verifySession(request: any, tenantId?: string) {
    let token: string | undefined;

    // Se for NextRequest, usar o utilitário de cookies nativo
    if (request.cookies && typeof request.cookies.get === "function") {
      token = request.cookies.get("session_token")?.value;
    } else {
      // Fallback para parse manual de header (útil se for um Request padrão ou outro contexto)
      const cookieHeader = request.headers.get("cookie") || "";
      token = cookieHeader
        .split(";")
        .map((c: string) => c.trim())
        .find((row: string) => row.startsWith("session_token="))
        ?.split("=")[1];
    }

    if (!token) {
      return { authenticated: false };
    }

    const user = await this.getCurrentUser(token, tenantId);
    if (!user) {
      return { authenticated: false };
    }

    return { authenticated: true, user };
  }

  static async logout() {
    await supabase!.auth.signOut();
  }

  static async updateProfile(request: any, updates: any) {
    const { authenticated, user } = await this.verifySession(request);
    if (!authenticated || !user) {
      return { success: false, error: "Não autenticado" };
    }

    // --- SEGURANÇA: Validar se o plano permite notificações por e-mail ---
    let finalNotificationsEnabled = updates.notificationsEnabled;
    
    // Precisamos do slug do tenant para checar o plano
    const tenantSlug = request.headers.get("x-tenant-slug");
    if (tenantSlug && updates.notificationsEnabled === true) {
      const { data: tenantData } = await supabaseAdmin!
        .from("tenants")
        .select("id, plan_id, plans(slug)")
        .eq("slug", tenantSlug)
        .single();
      
      const planSlug = (tenantData as any)?.plans?.slug;
      if (planSlug === "basico") {
        return { 
          success: false, 
          error: "Funcionalidade restrita: O recebimento de e-mails não está disponível no Plano Básico. Faça o upgrade para o Plano Profissional ou Premium para ativar." 
        };
      }
    }

    const { error } = await supabaseAdmin!
      .from("profiles")
      .update({
        full_name: updates.name,
        phone: updates.phone,
        notifications_enabled: finalNotificationsEnabled,
        push_notifications_enabled: updates.pushNotificationsEnabled,
        fcm_token: updates.fcmToken
      })
      .eq("id", user.id);

    if (error) {
      console.error("Error updating profile:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  }
}
