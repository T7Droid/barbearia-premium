import { USERS_STORE } from "@/lib/mock-store";
import { supabase, supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { verifyToken, SECRET } from "@/lib/auth";
import { config } from "@/lib/config";

export class AuthService {
  static async getCurrentUser(token: string) {
    if (!config.supabase.isConfigured || !supabase) {
      throw new Error("Supabase is not configured. Real database is required for production.");
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;

    // Usar supabaseAdmin para buscar o perfil e bypassar RLS
    const { data: profile } = await supabaseAdmin!
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return {
      id: user.id,
      name: profile?.full_name || user.email,
      email: user.email,
      phone: profile?.phone || "",
      role: profile?.role || "client",
      points: profile?.points || 0,
      notificationsEnabled: profile?.notifications_enabled ?? true
    };
  }

  static async verifySession(request: any) {
    const cookieHeader = request.headers.get("cookie") || "";
    const token = cookieHeader
      .split("; ")
      .find((row: string) => row.startsWith("session_token="))
      ?.split("=")[1];

    if (!token) return { authenticated: false };

    const user = await this.getCurrentUser(token);
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
