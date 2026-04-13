import { getPaymentClient, isMercadoPagoConfigured } from "@/lib/mercadopago";
import { config } from "@/lib/config";
import { randomUUID } from "crypto";
import { TenantService } from "./tenant.service";
import { supabaseAdmin } from "@/lib/supabase";
import { encrypt, decrypt, isEncrypted } from "@/lib/crypto";

export class PaymentService {
  /**
   * Decripta um token de forma segura. Compatível com tokens antigos não-encriptados.
   */
  private static decryptToken(token: string): string {
    if (!token) return "";
    try {
      return isEncrypted(token) ? decrypt(token) : token;
    } catch {
      return token; // fallback: retornar como está se falhar
    }
  }

  /**
   * Obtém o cliente do Mercado Pago para um tenant específico.
   */
  private static async getClientForTenant(tenantId: string) {
    const tenant = await TenantService.getTenantById(tenantId);
    
    if (tenant && (tenant as any).mp_connected && (tenant as any).mp_access_token) {
      const accessToken = this.decryptToken((tenant as any).mp_access_token);
      const refreshToken = (tenant as any).mp_refresh_token 
        ? this.decryptToken((tenant as any).mp_refresh_token) 
        : null;

      return { 
        client: getPaymentClient(accessToken), 
        accessToken,
        refreshToken
      };
    }
    
    // Fallback: usar o cliente padrão do sistema
    return { 
      client: getPaymentClient(""), 
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || "",
      refreshToken: null 
    };
  }

  /**
   * Tenta renovar o token do tenant usando o refresh_token.
   * Usa o MERCADOPAGO_ACCESS_TOKEN como client_secret (padrão moderno do MP).
   */
  private static async refreshTenantToken(tenantId: string, refreshToken: string) {
    console.log(`[Payment] Attempting to refresh token for tenant: ${tenantId}`);
    
    try {
      if (!refreshToken) throw new Error("Sem refresh token disponível");

      const response = await fetch("https://api.mercadopago.com/oauth/token", {
        method: "POST",
        headers: { 
          "Content-Type": "application/x-www-form-urlencoded",
          accept: "application/json"
        },
        body: new URLSearchParams({
          client_id: config.mercadopago.appId || "",
          client_secret: config.mercadopago.clientSecret || "",
          grant_type: "refresh_token",
          refresh_token: refreshToken
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Falha na renovação do token");
      }

      // Encriptar novos tokens antes de salvar
      const encryptedAccessToken = encrypt(data.access_token);
      const encryptedRefreshToken = data.refresh_token ? encrypt(data.refresh_token) : null;

      await supabaseAdmin!
        .from("tenants")
        .update({
          mp_access_token: encryptedAccessToken,
          mp_public_key: data.public_key,
          mp_refresh_token: encryptedRefreshToken,
          mp_user_id: String(data.user_id),
          mp_connected: true,
          mp_connection_error: null
        })
        .eq("id", tenantId);

      console.log(`[Payment] Token refreshed successfully for tenant: ${tenantId}`);
      return data.access_token; // Retorna o token em texto (para uso imediato na memória)
    } catch (error) {
      console.error(`[Payment] Failed to refresh token for tenant ${tenantId}. Disconnecting.`, error);
      
      await supabaseAdmin!
        .from("tenants")
        .update({ 
          mp_connected: false,
          mp_connection_error: "Token expirado ou inválido. Por favor, conecte sua conta novamente." 
        })
        .eq("id", tenantId);
        
      throw new Error("Sua conta do Mercado Pago foi desconectada por segurança (token expirado). Por favor, reconecte no painel administrativo.");
    }
  }

  /**
   * Helper para executar chamadas MP com lógica de retry/refresh
   */
  private static async executeWithRetry(tenantId: string, callFn: (client: any) => Promise<any>): Promise<any> {
    const { client, refreshToken } = await this.getClientForTenant(tenantId);
    
    try {
      return await callFn(client);
    } catch (error: any) {
      // Se for erro de autorização (401) e tivermos um refresh token, tentamos renovar
      const isAuthError = error.status === 401 || error.statusCode === 401 || 
                          (error.message && error.message.includes("unauthorized"));
      
      if (isAuthError && refreshToken) {
        const newAccessToken = await this.refreshTenantToken(tenantId, refreshToken);
        const newClient = getPaymentClient(newAccessToken);
        return await callFn(newClient);
      }
      throw error;
    }
  }

  static async processCardPayment(paymentData: any, sessionId: string, amountInCents: number, tenantId: string) {
    return this.executeWithRetry(tenantId, async (paymentClient) => {
      const amount = amountInCents / 100;
      const body: any = {
        transaction_amount: amount,
        token: paymentData.token,
        description: paymentData.description || "Agendamento Barber Premium",
        installments: Number(paymentData.installments) || 1,
        payment_method_id: paymentData.payment_method_id,
        external_reference: sessionId,
        payer: { ...paymentData.payer },
      };

      if (paymentData.issuer_id && paymentData.issuer_id !== "") {
        body.issuer_id = paymentData.issuer_id;
      }

      const result = await paymentClient.create({
        body,
        requestOptions: { idempotencyKey: randomUUID() }
      });

      return {
        id: result.id,
        status: result.status,
        detail: result.status_detail,
      };
    });
  }

  static async processPixPayment(paymentData: any, sessionId: string, amountInCents: number, tenantId: string) {
    return this.executeWithRetry(tenantId, async (paymentClient) => {
      const amount = amountInCents / 100;
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
            number: paymentData.payer?.identification?.number?.replace(/\D/g, ""),
          },
        },
      };

      const result = await paymentClient.create({ 
        body,
        requestOptions: { idempotencyKey: `pix_${sessionId}_${Date.now()}` }
      });

      return {
        id: result.id,
        status: result.status,
        qr_code: (result as any).point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: (result as any).point_of_interaction?.transaction_data?.qr_code_base64,
      };
    });
  }

  static async getPaymentStatus(paymentId: string, tenantId: string) {
    return this.executeWithRetry(tenantId, async (paymentClient) => {
      const result = await paymentClient.get({ id: paymentId });
      return {
        id: result.id,
        status: result.status,
        detail: result.status_detail,
      };
    });
  }
}
