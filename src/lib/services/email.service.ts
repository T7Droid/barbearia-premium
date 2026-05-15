import { Resend } from "resend";
import { config } from "@/lib/config";

const resend = config.resend.isConfigured 
  ? new Resend(process.env.RESEND_API_KEY) 
  : null;

export class EmailService {
  static async sendEmailConfirmacao(email: string, nome: string) {
    if (!config.resend.isConfigured || !resend) {
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
    } catch (error) {
      console.error("Erro ao enviar e-mail pelo Resend:", error);
    }
  }

  static async sendAdminNotification(subject: string, html: string) {
    if (!config.resend.isConfigured || !resend) {
      return;
    }

    try {
      await resend.emails.send({
        from: "Barber Premium <onboarding@resend.dev>",
        to: "thyagoneves.sa@gmail.com",
        subject: `[ADMIN] ${subject}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
            <h2 style="color: #333; border-bottom: 2px solid #f4f4f4; padding-bottom: 10px;">Notificação do Sistema</h2>
            ${html}
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #999;">Esta é uma mensagem automática do sistema Barber Premium.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error("Erro ao enviar e-mail de notificação admin:", error);
    }
  }
}
