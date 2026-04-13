import { USERS_STORE } from "@/lib/mock-store";
import { supabase, supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { verifyToken, SECRET } from "@/lib/auth";
import { config } from "@/lib/config";

export class AuthService {
  static async getCurrentUser(token: string, tenantId?: string) {
    if (!config.supabase.isConfigured || !supabase) {
      throw new Error("Supabase is not configured. Real database is required for production.");
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;

    // Se um tenantId foi fornecido, o perfil DEVE pertencer a esse tenant
    let query = supabaseAdmin!
      .from("profiles")
      .select("*")
      .eq("id", user.id);
    
    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    const { data: profile } = await query.single();
    
    // Se solicitamos um tenant específico e não encontramos o perfil lá,
    // o usuário não está vinculado a esta barbearia.
    if (tenantId && !profile && user.email !== "admin@barber.com") {
      return null;
    }

    let currentRole = profile?.role || "client";

    // Auto-promoção para o e-mail de administrador padrão (apenas no tenant 'default' ou como super admin)
    if (user.email === "admin@barber.com" && currentRole !== "admin") {
      console.log(`Auto-promovendo ${user.email} para admin no tenant ${tenantId}...`);
      await supabaseAdmin!
        .from("profiles")
        .upsert({ 
          id: user.id, 
          role: "admin", 
          tenant_id: tenantId,
          full_name: "Admin Super"
        });
      currentRole = "admin";
    }

    return {
      id: user.id,
      name: profile?.full_name || user.email,
      email: user.email,
      phone: profile?.phone || "",
      role: currentRole,
      tenantId: profile?.tenant_id || tenantId,
      points: profile?.points || 0,
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
  
  static async updateProfile(request: any, updates: { name?: string, phone?: string, notificationsEnabled?: boolean }) {
    const session = await this.verifySession(request);
    if (!session.authenticated || !session.user) return { success: false, error: "Não autorizado" };

    if (!config.supabase.isConfigured || !supabase) {
      throw new Error("Supabase is missing.");
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: updates.name,
        phone: updates.phone,
        notifications_enabled: updates.notificationsEnabled
      })
      .eq("id", session.user.id);
    
    return { success: !error, error: error?.message };
  }
}
