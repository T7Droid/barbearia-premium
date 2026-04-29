importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyBw-Bt60sJV_K_WWoHo_oCp2ylms4Yci3A",
  authDomain: "kingbarbers-app.firebaseapp.com",
  projectId: "kingbarbers-app",
  storageBucket: "kingbarbers-app.firebasestorage.app",
  messagingSenderId: "597056305785",
  appId: "1:597056305785:web:df04339b36ff77a72672a8"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Log para depuração de mensagens em segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensagem recebida em segundo plano:', payload);
  
  const notificationTitle = payload.notification.title || 'Novo Agendamento';
  const notificationOptions = {
    body: payload.notification.body || 'Você tem uma nova atualização.',
    icon: '/icons/icon-192x192.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
