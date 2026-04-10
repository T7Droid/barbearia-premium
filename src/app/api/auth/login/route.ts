import { NextResponse } from "next/server";
import { ADMIN_USER, createSessionToken } from "@/lib/mock-auth";
import { USERS_STORE } from "@/lib/mock-store";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // 1. Supabase Auth (Mandatory for Production)
    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json({ error: "Serviço de autenticação indísponível" }, { status: 503 });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    // 2. Fetch User Profile for Role verification
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", data.user.id)
      .single();

    const userRole = profile?.role || "client";

    const response = NextResponse.json({ 
      success: true, 
      user: { 
        name: profile?.full_name || data.user.user_metadata?.full_name || data.user.email, 
        email: data.user.email, 
        role: userRole
      },
      redirectTo: userRole === "admin" ? "/admin" : "/meu-perfil"
    });

    response.cookies.set("session_token", data.session?.access_token || "", {
      httpOnly: true,
      secure: true, // Enforcement for production
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;

    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
