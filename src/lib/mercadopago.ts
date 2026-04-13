import { MercadoPagoConfig, Payment } from "mercadopago";

// Chave global (fallback ou uso do sistema)
const globalAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || "";

export const isMercadoPagoConfigured = !!globalAccessToken && !globalAccessToken.includes("your-access-token");

/**
 * Cria um cliente do Mercado Pago dinamicamente para um accessToken específico.
 * Útil para o fluxo multi-tenant onde cada barbearia tem seu próprio token.
 */
export function getMPClient(accessToken: string) {
  return new MercadoPagoConfig({ 
    accessToken: accessToken || globalAccessToken, 
    options: { timeout: 5000 } 
  });
}

/**
 * Retorna uma instância do serviço de pagamentos para um accessToken.
 */
export function getPaymentClient(accessToken: string) {
  const client = getMPClient(accessToken);
  return new Payment(client);
}

// Instâncias padrão (mantidas para compatibilidade retroativa temporária)
export const client = isMercadoPagoConfigured
  ? getMPClient(globalAccessToken)
  : null;

export const payment = client ? new Payment(client) : null;
