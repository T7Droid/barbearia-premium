import { MercadoPagoConfig, Payment } from "mercadopago";

const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || "";

export const isMercadoPagoConfigured = !!accessToken && !accessToken.includes("your-access-token");

export const client = isMercadoPagoConfigured
  ? new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } })
  : null;

export const payment = client ? new Payment(client) : null;
