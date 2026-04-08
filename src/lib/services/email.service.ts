import { Resend } from "resend";
import { config } from "@/lib/config";

const resend = config.resend.isConfigured 
  ? new Resend(process.env.RESEND_API_KEY) 
  : null;

export class EmailService {
  static async sendEmailConfirmacao(email: string, nome: string) {
    if (!config.resend.isConfigured || !resend) {
      console.log(`[MOCK EMAIL] Para: ${email} | Assunto: Pagamento confirmado ✅ | Conteúdo: Olá ${nome}, seu agendamento foi confirmado.`);
      return;
    }

    try {
      await resend.emails.send({
        from: "Sua Barbearia <onboarding@resend.dev>",
        to: email,
        subject: "Pagamento confirmado ✅",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Olá, ${nome}!</h2>
            <p>Seu agendamento foi confirmado com sucesso.</p>
            <p>Estamos ansiosos para atendê-lo!</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 14px; color: #666;">Obrigado por escolher nossa barbearia 💈</p>
          </div>
        `,
      });
      console.log(`E-mail de confirmação enviado para: ${email}`);
    } catch (error) {
      console.error("Erro ao enviar e-mail pelo Resend:", error);
    }
  }
}
