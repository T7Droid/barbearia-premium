import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);

export const messaging = typeof window !== "undefined" ? getMessaging(app) : null;

export const requestNotificationPermission = async () => {
  if (typeof window === "undefined" || !messaging || !('serviceWorker' in navigator)) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        if (reg.active?.scriptURL && !reg.active.scriptURL.includes('/sw.js')) {
          console.log('🗑️ Removendo Service Worker duplicado:', reg.active.scriptURL);
          await reg.unregister();
        }
      }

      await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      const registration = await navigator.serviceWorker.ready;
      
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration
      });

      console.log("🔥 MEU FCM TOKEN ATUAL:", token);
      return token;
    }
    return null;
  } catch (error) {
    console.error("Erro ao solicitar permissão de notificação:", error);
    return null;
  }
};

if (typeof window !== "undefined") {
  isSupported().then(yes => yes && getAnalytics(app));
}

export default app;
