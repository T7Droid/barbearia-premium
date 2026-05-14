import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { AuthService } from "@/lib/services/auth.service";
import { TenantContext } from "@/lib/services/tenant-context";
import { AppointmentService } from "@/lib/services/appointment.service";

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

    // 1. Buscar o agendamento atual para saber se já estava pago e pegar o userId
    const { data: currentApp } = await supabaseAdmin!
      .from("appointments")
      .select("is_paid, user_id")
      .eq("id", id)
      .single();

    const wasAlreadyPaid = currentApp?.is_paid || false;

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
      .select("id, payment_status, payment_method, paid_at, is_paid, user_id")
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

    // 2. Se o agendamento NÃO estava pago e agora está, e tem um usuário vinculado, soma os pontos
    if (!wasAlreadyPaid && data.is_paid && data.user_id) {
      await AppointmentService.addLoyaltyPoints(data.user_id, tenant.id);
    }

    return NextResponse.json({ success: true, appointment: data });
  } catch (error) {
    console.error("[PAYMENT] Erro interno:", error);
    return NextResponse.json({ error: "Erro interno ao processar pagamento" }, { status: 500 });
  }
}
