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
        role: profile?.role || "client",
        points: profile?.points || 0
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

      const client = Array.from(USERS_STORE.values()).find((u: any) => u.email === email) as any;
      if (!client) return null;

      return {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        role: "client",
        points: client.points
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
}
