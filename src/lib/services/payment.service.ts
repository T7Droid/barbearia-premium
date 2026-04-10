import { payment, isMercadoPagoConfigured } from "@/lib/mercadopago";
import { config } from "@/lib/config";
import { randomUUID } from "crypto";

export class PaymentService {
  static async processCardPayment(paymentData: any, sessionId: string, amountInCents: number) {
    if (config.mercadopago.isConfigured && payment) {
      try {
        // Use o valor do servidor (centavos) e divida por 100 apenas uma vez
        const amount = amountInCents / 100;
        
        console.log(`Processing MP Payment for Session ${sessionId}: R$ ${amount}`);

        const body: any = {
          transaction_amount: amount,
          token: paymentData.token,
          description: paymentData.description || "Agendamento Barber Premium",
          installments: Number(paymentData.installments) || 1,
          payment_method_id: paymentData.payment_method_id,
          external_reference: sessionId,
          payer: {
            ...paymentData.payer, // Inclui TUDO que o Brick enviou (email, identification, first_name, last_name, etc)
          },
        };

        // Adicionar campos opcionais apenas se existirem e não forem vazios
        if (paymentData.issuer_id && paymentData.issuer_id !== "") {
          body.issuer_id = paymentData.issuer_id;
        }

        console.log("DEBUG: Enviando para Mercado Pago:", JSON.stringify(body, null, 2));

        const result = await payment.create({
          body,
          requestOptions: {
            idempotencyKey: randomUUID(), // Sempre usar um UUID V4 para evitar erros 10102 de idempotência no MP
          }
        });

        console.log("Mercado Pago Success:", result.status);

        return {
          id: result.id,
          status: result.status,
          detail: result.status_detail,
        };
      } catch (error: any) {
        console.error("Mercado Pago Error Details:", error.message || error);
        if (error.cause) console.error("MP Error Cause:", JSON.stringify(error.cause));
        throw error;
      }
    }

    // Mock se não configurado
    return {
      id: "mock_payment_" + Math.random().toString(36).substr(2, 9),
      status: "approved",
    };
  }

  static async processPixPayment(paymentData: any, sessionId: string, amountInCents: number) {
    if (config.mercadopago.isConfigured && payment) {
      try {
        const amount = amountInCents / 100;

        // Separar primeiro e último nome (exigência do Pix no MP)
        const nameParts = (paymentData.payer?.name || "Cliente").split(" ");
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "S";

        const body = {
          transaction_amount: amount,
          payment_method_id: "pix",
          description: paymentData.description || "Agendamento Barber Premium",
          external_reference: sessionId,
          payer: {
            email: paymentData.payer?.email,
            first_name: firstName,
            last_name: lastName,
            identification: {
              type: "CPF",
              number: paymentData.payer?.identification?.number?.replace(/\D/g, ""), // Limpar máscara
            },
          },
        };

        console.log("DEBUG: Gerando Pix no Mercado Pago:", JSON.stringify(body, null, 2));

        const result = await payment.create({ 
          body,
          requestOptions: {
            idempotencyKey: `pix_${sessionId}_${Date.now()}` // Chave única por tentativa de Pix
          }
        });

        return {
          id: result.id,
          status: result.status,
          qr_code: (result as any).point_of_interaction?.transaction_data?.qr_code,
          qr_code_base64: (result as any).point_of_interaction?.transaction_data?.qr_code_base64,
        };
      } catch (error: any) {
        console.error("Mercado Pago Pix Error:", error.message || error);
        if (error.cause) console.error("MP Pix Cause:", JSON.stringify(error.cause));
        throw error;
      }
    }

    // Mock se não configurado
    return {
      id: "mock_pix_" + Math.random().toString(36).substr(2, 9),
      status: "pending",
      qr_code: "00020101021226850014br.gov.bcb.pix0163MOCKED-PIX-PAYLOAD-FOR-TESTING-PURPOSES-ONLY",
      qr_code_base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
    };
  }

  static async getPaymentStatus(paymentId: string) {
    if (config.mercadopago.isConfigured && payment) {
      try {
        const result = await payment.get({ id: paymentId });
        return {
          id: result.id,
          status: result.status,
          detail: result.status_detail,
        };
      } catch (error: any) {
        console.error("Mercado Pago Status Check Error:", error.message || error);
        throw error;
      }
    }
    return { id: paymentId, status: "pending" };
  }
}
