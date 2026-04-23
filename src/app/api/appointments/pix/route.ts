import { NextRequest, NextResponse } from "next/server";
import { PaymentService } from "@/lib/services/payment.service";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, payer } = body;

    if (!sessionId || !payer) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    // 1. Buscar a sessão para obter o valor real
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

    // 2. Gerar o Pix
    const pixResult = await PaymentService.processPixPayment(
      { payer, description: sessionData.serviceName },
      sessionId,
      amountInCents,
      sessionRecord.tenant_id
    );

    return NextResponse.json(pixResult);
  } catch (error: any) {
    console.error("Pix route error:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao gerar Pix" },
      { status: 500 }
    );
  }
}
