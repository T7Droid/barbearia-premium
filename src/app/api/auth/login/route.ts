import { NextResponse } from "next/server";
import { supabase, supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

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

    const { data: profile } = await supabaseAdmin!
      .from("profiles")
      .select("role, full_name")
      .eq("id", data.user.id)
      .single();

    let userRole = profile?.role || "client";

    const response = NextResponse.json({ 
      success: true, 
      user: { 
        name: profile?.full_name || data.user.user_metadata?.full_name || data.user.email, 
        email: data.user.email, 
        role: userRole,
        points: 0
      },
      redirectTo: userRole === "admin" ? "/admin" : "/meu-perfil"
    });

    response.cookies.set("session_token", data.session?.access_token || "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
