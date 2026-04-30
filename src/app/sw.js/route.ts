import { NextResponse } from 'next/server';

export async function GET() {
  const swCode = `
    importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

    const firebaseConfig = {
      apiKey: "${process.env.NEXT_PUBLIC_FIREBASE_API_KEY || ''}",
      authDomain: "${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || ''}",
      projectId: "${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || ''}",
      storageBucket: "${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || ''}",
      messagingSenderId: "${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || ''}",
      appId: "${process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ''}"
    };

    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    // Evento Push Nativo (O segredo para o Android/PWA funcionar 100%)
    self.addEventListener('push', (event) => {
      console.log('[SW] Push Nativo recebido:', event);
      
      event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
          // Verifica se o app está em primeiro plano
          const isForeground = windowClients.some(client => client.focused);
          
          if (isForeground) {
            console.log('[SW] App em primeiro plano. O toast cuidará da exibição. Ignorando notificação nativa.');
            return;
          }

          let data = {};
          try {
            data = event.data ? event.data.json() : {};
          } catch (e) {
            data = { notification: { title: 'Nova Mensagem', body: event.data ? event.data.text() : '' } };
          }

          console.log('[SW] Dados processados do Push:', data);

          const notification = data.notification || (data.data && data.data.notification ? JSON.parse(data.data.notification) : data.data) || {};
          const title = notification.title || data.title || 'Novo Agendamento';
          const body = notification.body || data.body || 'Você tem uma nova atualização.';

          const options = {
            body: body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png',
            vibrate: [100, 50, 100],
            data: data.data || data, // Guardar os dados para usar no clique
            tag: 'push-notification',
            renotify: true
          };

          return self.registration.showNotification(title, options);
        })
      );
    });

    // Mantendo o listener do Firebase apenas para log, sem disparar nova notificação
    messaging.onBackgroundMessage((payload) => {
      console.log('[SW/Firebase] onBackgroundMessage disparado (apenas log):', payload);
    });

    // Lógica de Cache PWA
    const CACHE_NAME = 'kingbarber-v1';
    self.addEventListener('install', (event) => {
      event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
          return cache.addAll(['/']);
        })
      );
    });

    self.addEventListener('fetch', (event) => {
      event.respondWith(
        fetch(event.request).catch(() => {
          return caches.match(event.request);
        })
      );
    });

    // Clique na notificação
    self.addEventListener('notificationclick', (event) => {
      event.notification.close();
      const data = event.notification.data;
      
      // O slug pode vir direto no data ou dentro de notification.data dependendo de como o FCM envia
      const slug = data?.slug || data?.notification?.data?.slug;
      const urlToOpen = slug ? \`/\${slug}/meu-perfil/historico\` : '/home';

      event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
          // Se já houver uma aba aberta com essa URL, foca nela
          for (let i = 0; i < windowClients.length; i++) {
            const client = windowClients[i];
            if (client.url.includes(urlToOpen) && 'focus' in client) {
              return client.focus();
            }
          }
          // Se não, abre uma nova aba
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
      );
    });
  `;

  return new NextResponse(swCode, {
    headers: {
      'Content-Type': 'application/javascript',
      'Service-Worker-Allowed': '/',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
