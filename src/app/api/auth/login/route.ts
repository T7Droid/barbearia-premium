import { NextResponse } from "next/server";
import { ADMIN_USER, createSessionToken } from "@/lib/mock-auth";
import { USERS_STORE } from "@/lib/mock-store";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // 1. Try Supabase Auth first if configured
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data.user) {
        const response = NextResponse.json({ 
          success: true, 
          user: { 
            name: data.user.user_metadata?.full_name || data.user.email, 
            email: data.user.email, 
            role: "client" // Normally we'd fetch profile here
          } 
        });

        response.cookies.set("session_token", data.session?.access_token || "", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24,
        });

        return response;
      }
    }

    // 2. Fallback to Mock Auth
    if (email === ADMIN_USER.email && password === ADMIN_USER.password) {
      const token = await createSessionToken({
        email: ADMIN_USER.email,
        name: ADMIN_USER.name,
        role: "admin",
      });

      const response = NextResponse.json({ success: true, user: { name: ADMIN_USER.name, email: ADMIN_USER.email, role: "admin" } });

      response.cookies.set("session_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
      });

      return response;
    }

    const client = Array.from(USERS_STORE.values()).find((u: any) => u.email === email) as any;
    if (client) {
      const token = await createSessionToken({
        email: client.email,
        name: client.name,
        role: "client",
      });

      const response = NextResponse.json({
        success: true,
        user: { name: client.name, email: client.email, role: "client" },
        redirectTo: "/meu-perfil"
      });

      response.cookies.set("session_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
      });

      return response;
    }

    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
