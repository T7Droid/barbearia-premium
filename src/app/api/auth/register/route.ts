import { NextResponse, NextRequest } from "next/server";
import { supabase, supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { TenantContext } from "@/lib/services/tenant-context";

export async function POST(request: NextRequest) {
  try {
    const tenant = await TenantContext.getTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
    }

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
        // Buscar configurações do tenant específico
        const { data: settingsData } = await supabaseAdmin!
          .from("settings")
          .select("is_points_enabled, initial_points")
          .eq("tenant_id", tenant.id)
          .single();

        const settings = settingsData || { is_points_enabled: true, initial_points: 20 };
        const initialPoints = (settings.is_points_enabled) ? (settings.initial_points || 0) : 0;

        console.log(`[AUTH REGISTER] Atribuindo ${initialPoints} pontos iniciais para usuário ${data.user.id} no tenant ${tenant.id}`);
        
        const { error: profileError } = await supabaseAdmin!.from("profiles").upsert({
          id: data.user.id,
          tenant_id: tenant.id,
          full_name: name,
          phone: phone || "",
          role: "client",
          points: initialPoints
        });

        if (profileError) {
          console.error("[AUTH REGISTER] Erro ao criar/atualizar perfil:", profileError);
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
      } else if (error) {
        throw error;
      }
    }

    return NextResponse.json({ error: "Erro ao realizar cadastro" }, { status: 500 });
  } catch (error: any) {
    console.error("Register Error:", error);
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 });
  }
}
