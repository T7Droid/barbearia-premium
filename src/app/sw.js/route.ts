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
        data: data.data || data,
        tag: 'push-notification',
        renotify: true
      };

      event.waitUntil(
        self.registration.showNotification(title, options)
      );
    });

    // Mantendo o listener do Firebase para compatibilidade e logs extras
    messaging.onBackgroundMessage((payload) => {
      console.log('[SW/Firebase] onBackgroundMessage disparado:', payload);
      // Aqui não chamamos showNotification de novo para não duplicar, 
      // o evento 'push' acima já cuidou disso com mais prioridade.
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
      const urlToOpen = data?.slug ? \`/\${data.slug}/admin/agenda\` : '/';

      event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
          for (let i = 0; i < windowClients.length; i++) {
            const client = windowClients[i];
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }
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
