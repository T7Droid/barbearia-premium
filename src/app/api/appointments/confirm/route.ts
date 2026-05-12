import { NextRequest, NextResponse } from "next/server";
import { AppointmentService } from "@/lib/services/appointment.service";
import { PaymentService } from "@/lib/services/payment.service";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, paymentMethodId, mp_data } = body;

    let paymentResult: any = { status: "approved" };
    
    // 1. Buscar a sessão para obter o valor real (segurança e correção de centavos)
    const { data: sessionRecord } = await supabaseAdmin!
      .from("checkout_sessions")
      .select("data, tenant_id")
      .eq("id", sessionId)
      .single();

    if (!sessionRecord || !sessionRecord.data) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
    }

    const sessionData = sessionRecord.data;
    const amountInCents = sessionData.amount;

    // 2. Mapear itens para o Mercado Pago (Melhoria de qualidade de integração)
    const items = (sessionData.servicesJson || []).map((s: any) => ({
      id: String(s.id),
      title: s.name,
      description: s.description || s.name,
      category_id: "services",
      quantity: 1,
      unit_price: Number(s.price) / 100
    }));

    // 3. Processar pagamento com o valor real do banco
    const tenantId = sessionRecord.tenant_id;
    const isCardPayment = paymentMethodId === "mercado_pago" || paymentMethodId === "card";

    if (mp_data && isCardPayment) {
      paymentResult = await PaymentService.processCardPayment(mp_data, sessionId, amountInCents, tenantId, items);
    } else if (mp_data && paymentMethodId === "pix") {
      // Para o Pix, consultamos o status REAL no Mercado Pago usando o ID
      if (mp_data.id) {
        paymentResult = await PaymentService.getPaymentStatus(mp_data.id, tenantId);
      } else {
        paymentResult = mp_data;
      }
    }

    // 3. Confirmar agendamento
    if (paymentResult.status === "approved") {
      const appointment = await AppointmentService.confirm(sessionId, {
        paymentMethodId,
        paymentResult
      });
      return NextResponse.json(appointment);
    } else {
      return NextResponse.json({
        error: "Pagamento não aprovado",
        detail: (paymentResult as any).detail
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Confirmation Error:", error);
    const message = error.message || "Erro ao confirmar agendamento";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
