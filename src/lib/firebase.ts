import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBw-Bt60sJV_K_WWoHo_oCp2ylms4Yci3A",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "kingbarbers-app.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "kingbarbers-app",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "kingbarbers-app.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "597056305785",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:597056305785:web:df04339b36ff77a72672a8",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-G7F80RKP1Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const messaging = typeof window !== "undefined" ? getMessaging(app) : null;

export const requestNotificationPermission = async () => {
  if (typeof window === "undefined" || !messaging) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
      });
      return token;
    }
    return null;
  } catch (error) {
    console.error("Erro ao solicitar permissão de notificação:", error);
    return null;
  }
};

// Analytics (Safe for SSR)
if (typeof window !== "undefined") {
  isSupported().then(yes => yes && getAnalytics(app));
}

export default app;
