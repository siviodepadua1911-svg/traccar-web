importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyB3bIJt2M3T-dCY2g1t1qi-yV5XySI_vjU',
  authDomain: 'ls-autotruck.firebaseapp.com',
  projectId: 'ls-autotruck',
  storageBucket: 'ls-autotruck.firebasestorage.app',
  messagingSenderId: '331994840306',
  appId: '1:331994840306:web:d511feef0ed443a118a46b',
});

firebase.messaging();
