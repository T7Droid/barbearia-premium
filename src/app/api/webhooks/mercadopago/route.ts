import { NextRequest, NextResponse } from "next/server";
import { AppointmentService } from "@/lib/services/appointment.service";
import { PaymentService } from "@/lib/services/payment.service";
import { TenantService } from "@/lib/services/tenant.service";
import { EmailService } from "@/lib/services/email.service";
import { payment as globalPayment, isMercadoPagoConfigured as isGlobalMPConfigured } from "@/lib/mercadopago";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Mercado Pago Webhook Received:", JSON.stringify(body));

    // Identificar o ID do pagamento
    const paymentId = body.data?.id || body.id || (body.resource ? body.resource.split("/").pop() : null);
    const type = body.type || body.topic;
    const action = body.action;

    // Mercado Pago envia notificações de diferentes formas (type="payment", topic="payment", action="payment.updated", etc)
    const isPaymentNotification = type === "payment" || (action && action.startsWith("payment."));

    if (isPaymentNotification && paymentId) {
      console.log(`Processing payment notification: ${paymentId}`);

      let paymentInfo: any = null;
      let tenantId: string | null = null;

      // 1. Tentar identificar o tenant pelo user_id do Mercado Pago (Seller ID)
      const mpUserId = body.user_id ? String(body.user_id) : null;
      
      if (mpUserId) {
        console.log(`Searching for tenant with MP User ID: ${mpUserId}`);
        const tenant = await TenantService.getTenantByMPUserId(mpUserId);
        if (tenant) {
          console.log(`Found tenant ${tenant.slug} (${tenant.id}) for MP User ${mpUserId}`);
          tenantId = tenant.id;
          
          try {
            paymentInfo = await PaymentService.getPaymentStatus(paymentId, tenant.id);
            console.log(`Payment info fetched using tenant credentials: status=${paymentInfo.status}`);
          } catch (error) {
            console.error(`Error fetching payment with tenant credentials:`, error);
          }
        } else {
          console.log(`No tenant found for MP User ID: ${mpUserId}`);
        }
      }

      // 2. Fallback para o cliente global se não conseguimos via tenant
      if (!paymentInfo && isGlobalMPConfigured && globalPayment) {
        try {
          console.log(`Attempting fallback to global credentials for payment ${paymentId}`);
          const result = await globalPayment.get({ id: paymentId });
          paymentInfo = {
            id: result.id,
            status: result.status,
            detail: result.status_detail,
            external_reference: result.external_reference
          };
          console.log(`Payment info fetched using global credentials: status=${paymentInfo.status}`);
        } catch (error) {
          console.error(`Error fetching payment with global credentials:`, error);
        }
      }

      // 3. Se temos as informações do pagamento, processar a confirmação
      if (paymentInfo && paymentInfo.status === "approved" && paymentInfo.external_reference) {
        const sessionId = paymentInfo.external_reference;
        console.log(`Confirmed payment found! Session ID: ${sessionId}`);

        try {
          const appointment = await AppointmentService.confirm(sessionId, {
            paymentMethodId: "mercado_pago",
            paymentResult: {
              id: paymentId,
              status: paymentInfo.status,
              detail: paymentInfo.detail || paymentInfo.status_detail
            }
          });

          // Enviar e-mail se possível
          if (appointment.customerEmail) {
            try {
              await EmailService.sendEmailConfirmacao(appointment.customerEmail, appointment.customerName);
              console.log(`Confirmation email sent to ${appointment.customerEmail}`);
            } catch (emailError) {
              console.error("Error sending confirmation email:", emailError);
            }
          }

          console.log(`Webhook: Appointment confirmed successfully for payment ${paymentId}`);
        } catch (confirmError: any) {
          // Se o agendamento já foi confirmado ou houve conflito, apenas logamos
          console.warn(`Webhook: Problem confirming appointment for session ${sessionId}:`, confirmError.message);
        }
      } else if (paymentInfo) {
        console.log(`Payment ${paymentId} status is ${paymentInfo.status} (not approved yet or missing external_reference)`);
      } else {
        console.warn(`Could not retrieve payment info for ID ${paymentId}`);
      }
    } else {
      console.log(`Ignored webhook: type=${type}, action=${action}, paymentId=${paymentId}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook Critical Error:", error);
    // Retornamos 200 para o Mercado Pago não ficar tentando reenviar se for erro de processamento nosso
    // (A menos que queiramos retentativa, mas normalmente webhooks MP podem ser ruidosos)
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
