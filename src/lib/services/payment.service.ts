import { payment, isMercadoPagoConfigured } from "@/lib/mercadopago";
import { config } from "@/lib/config";

export class PaymentService {
  static async processCardPayment(paymentData: any, sessionId?: string) {
    if (config.mercadopago.isConfigured && payment) {
      try {
        const result = await payment.create({
          body: {
            transaction_amount: paymentData.transaction_amount / 100,
            token: paymentData.token,
            description: paymentData.description,
            installments: paymentData.installments,
            payment_method_id: paymentData.payment_method_id,
            external_reference: sessionId,
            payer: {
              email: paymentData.payer.email,
            },
          }
        });

        return {
          id: result.id,
          status: result.status,
          detail: result.status_detail,
        };
      } catch (error) {
        console.error("Mercado Pago Error:", error);
        throw error;
      }
    }

    return {
      id: "mock_payment_" + Math.random().toString(36).substr(2, 9),
      status: "approved",
      detail: "accredited",
    };
  }
}
