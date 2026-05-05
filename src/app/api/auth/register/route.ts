import { NextResponse, NextRequest } from "next/server";
import { supabase, supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { TenantContext } from "@/lib/services/tenant-context";

export async function POST(request: NextRequest) {
  try {
    const tenant = await TenantContext.getTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
    }

    const { email, password, name, phone, acceptedTerms, acceptedPrivacy } = await request.json();

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
    if (isSupabaseConfigured && supabaseAdmin && supabase) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: name
        }
      });

      if (!error && data.user) {
        // Authenticate the user to get the session token
        const { data: authData } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        // Buscar configurações do tenant específico
        const { data: settingsData } = await supabaseAdmin!
          .from("settings")
          .select("is_points_enabled, initial_points")
          .eq("tenant_id", tenant.id)
          .single();

        const settings = settingsData || { is_points_enabled: true, initial_points: 20 };
        const initialPoints = (settings.is_points_enabled) ? (settings.initial_points || 0) : 0;

        console.log(`[AUTH REGISTER] Atribuindo ${initialPoints} pontos iniciais para usuário ${data.user.id} no tenant ${tenant.id}`);
        
        const { error: profileError } = await supabaseAdmin!.from("profiles").update({
          full_name: name,
          email: email,
          phone: phone || "",
          points: initialPoints,
          notifications_enabled: false,
          push_notifications_enabled: false,
          accepted_terms: acceptedTerms === true,
          accepted_privacy: acceptedPrivacy === true
        }).eq("id", data.user.id);

        if (profileError) {
          console.error("[AUTH REGISTER] Erro ao criar/atualizar perfil:", profileError);
        }

        // Adicionar o usuário como membro do tenant (para aparecer na lista de clientes do admin)
        const { error: membershipError } = await supabaseAdmin!.from("tenant_memberships").upsert({
          user_id: data.user.id,
          tenant_id: tenant.id,
          role: "client"
        }, { onConflict: 'user_id,tenant_id' });

        if (membershipError) {
          console.error("[AUTH REGISTER] Erro ao criar vínculo de tenant:", membershipError);
        }

        const response = NextResponse.json({ 
          success: true, 
          user: { 
            name, 
            email, 
            role: "client",
            points: initialPoints
          } 
        });
        response.cookies.set("session_token", authData.session?.access_token || "", {
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
