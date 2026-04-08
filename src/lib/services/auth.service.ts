import { USERS_STORE } from "@/lib/mock-store";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { verifyToken, SECRET } from "@/lib/auth";
import { config } from "@/lib/config";

export class AuthService {
  static async getCurrentUser(token: string) {
    if (config.supabase.isConfigured && supabase) {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) return null;

      const { data: profile } = await supabase
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

    try {
      const payload = await verifyToken(token);
      if (!payload) return null;

      const email = payload.email as string;
      const role = payload.role as string;
      const name = payload.name as string;

      if (role === "admin") {
        return { name, email, role: "admin" };
      }

      const client = USERS_STORE.get(email.toLowerCase()) || 
                     Array.from(USERS_STORE.values()).find((u: any) => u.email.toLowerCase() === email.toLowerCase()) as any;
      
      if (!client) return null;

      return {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        role: "client",
        points: client.points,
        notificationsEnabled: client.notificationsEnabled ?? true
      };
    } catch {
      return null;
    }
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

    if (config.supabase.isConfigured && supabase) {
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

    const client = USERS_STORE.get(session.user?.email.toLowerCase()) || 
                   Array.from(USERS_STORE.values()).find((u: any) => u.email.toLowerCase() === session.user?.email.toLowerCase()) as any;
    if (!client) return { success: false, error: "Usuário não encontrado" };

    if (updates.name !== undefined) client.name = updates.name;
    if (updates.phone !== undefined) client.phone = updates.phone;
    if (updates.notificationsEnabled !== undefined) client.notificationsEnabled = updates.notificationsEnabled;

    USERS_STORE.set(client.email, client);
    return { success: true };
  }
}
