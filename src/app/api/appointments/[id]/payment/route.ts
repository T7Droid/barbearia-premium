import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { AuthService } from "@/lib/services/auth.service";
import { TenantContext } from "@/lib/services/tenant-context";

const VALID_METHODS = ["cash", "pix", "card"] as const;
type PaymentMethod = (typeof VALID_METHODS)[number];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id);

  if (isNaN(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const tenant = await TenantContext.getTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
    }

    const result = await AuthService.verifySession(request, tenant.id);
    if (!result.authenticated) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Apenas admins podem marcar pagamentos
    if (result.user?.role !== "admin") {
      return NextResponse.json({ error: "Acesso restrito ao administrador" }, { status: 403 });
    }

    const body = await request.json();
    const { paymentMethod } = body as { paymentMethod: PaymentMethod };

    if (!paymentMethod || !VALID_METHODS.includes(paymentMethod)) {
      return NextResponse.json(
        { error: `Método de pagamento inválido. Use: ${VALID_METHODS.join(", ")}` },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin!
      .from("appointments")
      .update({
        payment_status: "paid",
        payment_method: paymentMethod,
        paid_at: new Date().toISOString(),
        is_paid: true,
      })
      .eq("id", id)
      .eq("tenant_id", tenant.id)
      .neq("status", "cancelled")
      .select("id, payment_status, payment_method, paid_at, is_paid")
      .single();

    if (error) {
      console.error("[PAYMENT] Erro ao atualizar pagamento:", error);
      return NextResponse.json({ error: "Erro ao registrar pagamento" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: "Agendamento não encontrado ou já cancelado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, appointment: data });
  } catch (error) {
    console.error("[PAYMENT] Erro interno:", error);
    return NextResponse.json({ error: "Erro interno ao processar pagamento" }, { status: 500 });
  }
}
