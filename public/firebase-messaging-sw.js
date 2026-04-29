importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBw-Bt60sJV_K_WWoHo_oCp2ylms4Yci3A",
  authDomain: "kingbarbers-app.firebaseapp.com",
  projectId: "kingbarbers-app",
  storageBucket: "kingbarbers-app.firebasestorage.app",
  messagingSenderId: "597056305785",
  appId: "1:597056305785:web:df04339b36ff77a72672a8",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/firebase-logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
