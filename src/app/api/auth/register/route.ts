import { NextResponse } from "next/server";
import { USERS_STORE } from "@/lib/mock-store";
import { supabase, supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { createToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password, name, phone } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Sua senha deve ter pelo menos 6 caracteres." }, { status: 400 });
    }

    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*[0-9])/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json({ error: "A senha deve conter pelo menos uma letra e um número." }, { status: 400 });
    }

    // 1. Try Supabase Auth first if configured
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            phone: phone || "",
          }
        }
      });

      if (!error && data.user) {
        // Usar supabaseAdmin para bypassar RLS e garantir a criação do perfil
        const { data: settingsData } = await supabaseAdmin!.from("settings").select("is_points_enabled, initial_points").eq("id", 1).single();

        // Fallback para 20 pontos iniciais se a consulta falhar
        const settings = settingsData || { is_points_enabled: true, initial_points: 20 };
        const initialPoints = (settings.is_points_enabled) ? (settings.initial_points || 0) : 0;

        // Create profile in DB (using upsert to handle potential race conditions with DB triggers)
        console.log(`[AUTH REGISTER] Atribuindo ${initialPoints} pontos iniciais para usuário ${data.user.id}`);
        
        const { error: profileError } = await supabaseAdmin!.from("profiles").upsert({
          id: data.user.id,
          full_name: name,
          phone: phone || "",
          role: "client",
          points: initialPoints
        });

        if (profileError) {
          console.error("[AUTH REGISTER] Erro ao criar/atualizar perfil:", profileError);
        } else {
          console.log("[AUTH REGISTER] Perfil criado/atualizado com sucesso com pontos iniciais.");
        }

        const response = NextResponse.json({ success: true, user: { name, email, role: "client" } });
        response.cookies.set("session_token", data.session?.access_token || "", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24,
          path: "/",
        });
        return response;
      }
    }

    // 2. Fallback to Mock
    const { data: settingsData } = await supabaseAdmin!.from("settings").select("is_points_enabled, initial_points").eq("id", 1).single();

    // Fallback para 20 pontos iniciais se a consulta falhar
    const settings = settingsData || { is_points_enabled: true, initial_points: 20 };
    const initialPoints = (settings.is_points_enabled) ? (settings.initial_points || 0) : 0;

    USERS_STORE.set(email.toLowerCase(), {
      name,
      email,
      phone: phone || "",
      points: initialPoints,
      registeredAt: new Date().toISOString(),
      role: "client"
    });

    const token = await createToken({ email, name, role: "client" });

    const response = NextResponse.json({ success: true, user: { name, email, role: "client" } });

    response.cookies.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
