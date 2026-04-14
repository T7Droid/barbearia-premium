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

    const { data: rawProfiles, error: profileError } = await supabaseAdmin!
      .from("profiles")
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("role", "client")
      .order("full_name", { ascending: true });

    if (profileError) {
      console.error("Error fetching profiles:", profileError);
      return NextResponse.json({ error: "Erro ao buscar perfis" }, { status: 500 });
    }

    // Mapear dados garantindo que colunas inexistentes tenham valores padrão
    const customers = (rawProfiles || []).map(p => ({
      id: p.id,
      full_name: p.full_name,
      email: p.email || p.user_email || "N/D",
      phone: p.phone,
      points: p.points || 0,
      created_at: p.created_at,
      reschedule_count: p.reschedule_count || 0,
      cancel_count: p.cancel_count || 0,
      can_pay_at_shop: p.can_pay_at_shop ?? true
    }));

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

    const { error } = await supabaseAdmin!
      .from("profiles")
      .update(allowedUpdates)
      .eq("id", userId)
      .eq("tenant_id", tenant.id);

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
