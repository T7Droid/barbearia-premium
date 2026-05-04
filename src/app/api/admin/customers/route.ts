import { NextResponse, NextRequest } from "next/server";
import { AuthService } from "@/lib/services/auth.service";
import { TenantContext } from "@/lib/services/tenant-context";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const tenant = await TenantContext.getTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
    }

    const session = await AuthService.verifySession(request, tenant.id);
    if (!session.authenticated || session.user?.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    // Buscar perfis através da tabela de vínculos para isolar por tenant
    const { data: memberships, error: memberError } = await supabaseAdmin!
      .from("tenant_memberships")
      .select(`
        role,
        profiles (*)
      `)
      .eq("tenant_id", tenant.id)
      .eq("role", "client");

    if (memberError) {
      console.error("Error fetching memberships:", memberError);
      return NextResponse.json({ error: "Erro ao buscar vínculos" }, { status: 500 });
    }

    // Mapear dados garantindo que colunas inexistentes tenham valores padrão
    const customers = (memberships || []).map(m => {
      const p = m.profiles as any;
      return {
        id: p.id,
        full_name: p.full_name,
        email: p.email || "N/D",
        phone: p.phone,
        points: p.points || 0,
        created_at: p.created_at,
        reschedule_count: p.reschedule_count || 0,
        cancel_count: p.cancel_count || 0,
        can_pay_at_shop: p.can_pay_at_shop ?? true
      };
    });

    return NextResponse.json(customers);
  } catch (error) {
    console.error("GET /api/admin/customers error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const tenant = await TenantContext.getTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
    }

    const session = await AuthService.verifySession(request, tenant.id);
    if (!session.authenticated || session.user?.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const { userId, ...updates } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Usuário não identificado" }, { status: 400 });
    }

    // Permite atualizar apenas campos específicos para segurança
    const allowedUpdates: any = {};
    if (updates.canPayAtShop !== undefined) allowedUpdates.can_pay_at_shop = updates.canPayAtShop;

    // Verificar se o usuário pertence a este tenant antes de permitir a alteração
    const { data: member } = await supabaseAdmin!
      .from("tenant_memberships")
      .select("id")
      .eq("user_id", userId)
      .eq("tenant_id", tenant.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: "Este usuário não é cliente desta barbearia." }, { status: 403 });
    }

    const { error } = await supabaseAdmin!
      .from("profiles")
      .update(allowedUpdates)
      .eq("id", userId);

    if (error) {
      if (error.code === "42703") {
        return NextResponse.json({ error: "O banco de dados não possui as colunas necessárias. Por favor, execute o script de migração enviado anteriormente." }, { status: 400 });
      }
      console.error("Error updating customer profile:", error);
      return NextResponse.json({ error: "Erro ao atualizar cliente" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/admin/customers error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
