import { NextRequest, NextResponse } from "next/server";
import { AppointmentService } from "@/lib/services/appointment.service";
import { payment, isMercadoPagoConfigured } from "@/lib/mercadopago";
import { EmailService } from "@/lib/services/email.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Mercado Pago Webhook Received:", body);

    if (body.type === "payment" && body.data?.id && isMercadoPagoConfigured && payment) {
      const paymentId = body.data.id;

      const paymentInfo = await payment.get({ id: paymentId });

      if (paymentInfo.status === "approved" && paymentInfo.external_reference) {
        const sessionId = paymentInfo.external_reference;

        try {

          const appointment = await AppointmentService.confirm(sessionId, {
            paymentMethodId: "mercado_pago",
            paymentResult: {
              id: paymentId,
              status: paymentInfo.status,
              detail: paymentInfo.status_detail
            }
          });

          await EmailService.sendEmailConfirmacao(appointment.customerEmail, appointment.customerName);

          console.log(`Webhook: Appointment confirmed and email sent for payment ${paymentId}`);
        } catch (confirmError) {
          console.error("Webhook: Error confirming appointment:", confirmError);

        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
