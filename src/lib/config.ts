import { isSupabaseConfigured } from "./supabase";
import { isMercadoPagoConfigured } from "./mercadopago";

export const config = {
  supabase: {
    isConfigured: isSupabaseConfigured,
  },
  mercadopago: {
    isConfigured: isMercadoPagoConfigured,
  },
  resend: {
    isConfigured: !!process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes("your-api-key"),
  },
  isDevMode: process.env.NODE_ENV === "development",
  useMocks: !isSupabaseConfigured, // Main toggle based on Supabase
};

export const getStatus = () => ({
  supabase: config.supabase.isConfigured ? "✅ Configurado" : "❌ Mock (Sem URL/Chave)",
  mercadopago: config.mercadopago.isConfigured ? "✅ Configurado" : "❌ Mock (Sem Access Token)",
  resend: config.resend.isConfigured ? "✅ Configurado" : "❌ Mock (Sem API Key)",
  mode: config.useMocks ? "MODO MOCK / DESENVOLVIMENTO" : "MODO PRODUÇÃO / REAL",
});
