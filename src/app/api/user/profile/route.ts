import { NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth.service";

export async function GET(request: Request) {
  try {
    const session = await AuthService.verifySession(request);
    if (!session.authenticated) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    return NextResponse.json(session.user);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar perfil" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const updates = await request.json();
    const result = await AuthService.updateProfile(request, updates);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao atualizar perfil" }, { status: 500 });
  }
}
