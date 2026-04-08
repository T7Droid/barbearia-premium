import { NextResponse } from "next/server";
import { USERS_STORE } from "@/lib/mock-store";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { createToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password, name, phone } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
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
        // Create profile in DB (normally done via trigger, but we'll be safe)
        await supabase.from("profiles").insert({
          id: data.user.id,
          full_name: name,
          phone: phone || "",
          role: "client",
          points: 50
        });

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
    USERS_STORE.set(email, {
      name,
      email,
      phone: phone || "",
      points: 50,
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
