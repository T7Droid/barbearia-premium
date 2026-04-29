import * as admin from "firebase-admin";

const getFirebaseAdmin = () => {
  if (admin.apps.length > 0) return admin.apps[0];

  const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountVar) {
    console.warn("[NotificationService] FIREBASE_SERVICE_ACCOUNT not found in env.");
    return null;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountVar);
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error("[NotificationService] Error initializing Firebase Admin:", error);
    return null;
  }
};

export class NotificationService {
  static async sendPushNotification(token: string, title: string, body: string, data?: any) {
    const app = getFirebaseAdmin();
    if (!app || !token) return false;

    try {
      const message = {
        notification: {
          title,
          body,
        },
        data: data || {},
        token: token,
        android: {
          priority: "high" as const,
          notification: {
            sound: "default",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      console.log(`[NotificationService] Push sent successfully: ${response}`);
      return true;
    } catch (error) {
      console.error("[NotificationService] Error sending push:", error);
      return false;
    }
  }
}
