import { NextRequest, NextResponse } from "next/server";
import { AppointmentService } from "@/lib/services/appointment.service";
import { PaymentService } from "@/lib/services/payment.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, paymentMethodId, mp_data } = body;

    let paymentResult: any = { status: "approved" };

    if (mp_data && paymentMethodId === "mercado_pago") {
      paymentResult = await PaymentService.processCardPayment(mp_data, sessionId);
    }

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
  } catch (error) {
    console.error("Confirmation Error:", error);
    return NextResponse.json({ error: "Erro ao confirmar agendamento" }, { status: 500 });
  }
}
