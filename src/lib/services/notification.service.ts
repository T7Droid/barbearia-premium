import * as admin from "firebase-admin";

const getFirebaseAdmin = () => {
  if (admin.apps.length > 0) return admin.apps[0];

  const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountVar) {
    console.warn("[NotificationService] FIREBASE_SERVICE_ACCOUNT not found in env.");
    return null;
  }

  try {
    // Remove aspas simples que podem vir do .env e limpa espaços
    const cleanJson = serviceAccountVar.trim().replace(/^'|'$/g, '');
    const serviceAccount = JSON.parse(cleanJson);
    
    // O Firebase Admin exige quebras de linha reais (\n) na chave privada
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error: any) {
    console.error("[NotificationService] Erro ao inicializar Firebase Admin:", error.message);
    return null;
  }
};

export class NotificationService {
  static async sendPushNotification(token: string, title: string, body: string, data?: any) {
    const app = getFirebaseAdmin();
    if (!app || !token) return false;

    try {
      // Usamos apenas 'data' para evitar que o navegador mostre uma notificação automática
      // e o Service Worker mostre outra (duplicidade). No PWA, o SW cuida de tudo.
      const message = {
        data: {
          ...data,
          title,
          body,
        },
        token: token,
        android: {
          priority: "high" as const,
        },
      };

      const response = await admin.messaging().send(message);
      console.log(`[NotificationService] Push sent successfully: ${response}`);
      return true;
    } catch (error: any) {
      console.error("[NotificationService] Erro ao enviar push:", error.message);
      throw error;
    }
  }
}
