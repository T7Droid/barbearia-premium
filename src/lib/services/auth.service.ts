import { supabase, supabaseAdmin } from "@/lib/supabase";

export class AuthService {
  static async getCurrentUser(token: string, tenantId?: string) {
    if (!token) return null;

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;

    // Primeiro buscamos o perfil sem o filtro restrito de tenant para entender o papel do usuário
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    
    // Lógica de papel (Role):
    // 1. Se for o e-mail master ou o e-mail do usuário atual, é admin.
    // 2. Se o perfil diz que é admin, permitimos (assumindo que admins podem ser globais ou gerir múltiplos tenants).
    // 3. Caso contrário, verificamos se o tenant_id bate.
    let userRole = "client";
    const adminEmails = ["admin@barber.com", "thyagoneves.sa@gmail.com"];
    
    if (adminEmails.includes(user.email || "") || profile?.role === "admin") {
      userRole = "admin";
    } else if (profile && tenantId && profile.tenant_id === tenantId) {
      userRole = profile.role || "client";
    }

    return {
      id: user.id,
      email: user.email,
      name: profile?.full_name || user.user_metadata?.full_name || user.email,
      role: userRole,
      points: profile?.points || 0,
      phone: profile?.phone || "",
      tenantId: profile?.tenant_id || tenantId,
      notificationsEnabled: profile?.notifications_enabled ?? true
    };
  }

  static async verifySession(request: any, tenantId?: string) {
    const cookieHeader = request.headers.get("cookie") || "";
    const token = cookieHeader
      .split("; ")
      .find((row: string) => row.startsWith("session_token="))
      ?.split("=")[1];

    if (!token) return { authenticated: false };

    const user = await this.getCurrentUser(token, tenantId);
    if (!user) return { authenticated: false };

    return { authenticated: true, user };
  }

  static async logout() {
    await supabase.auth.signOut();
  }
}
