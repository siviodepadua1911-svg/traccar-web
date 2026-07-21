import { useSelector, useDispatch } from 'react-redux';
import { useAsyncTask } from '../../reactHelper';
import { sessionActions } from '../../store';
import fetchOrThrow from '../util/fetchOrThrow';
import { nativeEnvironment } from './NativeInterface';

const firebaseConfig = {
  apiKey: 'AIzaSyB3bIJt2M3T-dCY2g1t1qi-yV5XySI_vjU',
  authDomain: 'ls-autotruck.firebaseapp.com',
  projectId: 'ls-autotruck',
  storageBucket: 'ls-autotruck.firebasestorage.app',
  messagingSenderId: '331994840306',
  appId: '1:331994840306:web:d511feef0ed443a118a46b',
};

const vapidKey =
  'BABR4--D--gfDm4gOc0NJp1_ao44Ueqvn4ekMebHVXV6Q9mG74_QuBsFlxuUS6NhsDQ2wMK90Za1WwSNNFVOxEU';

const FirebaseNotifications = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.session.user);

  useAsyncTask(
    async ({ signal }) => {
      if (
        nativeEnvironment ||
        !user ||
        user.readonly ||
        !('Notification' in window) ||
        !('serviceWorker' in navigator)
      ) {
        return undefined;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return undefined;
      }

      const { initializeApp } = await import('firebase/app');
      const { getMessaging, getToken, onMessage } = await import('firebase/messaging');

      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const app = initializeApp(firebaseConfig);
      const messaging = getMessaging(app);

      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });
      if (!token) {
        return undefined;
      }

      const tokens = user.attributes.notificationTokens?.split(',') || [];
      if (!tokens.includes(token)) {
        const updatedUser = {
          ...user,
          attributes: {
            ...user.attributes,
            notificationTokens: [...tokens.slice(-2), token].join(','),
          },
        };
        const response = await fetchOrThrow(`/api/users/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedUser),
          signal,
        });
        dispatch(sessionActions.updateUser(await response.json()));
      }

      const unsubscribe = onMessage(messaging, (payload) => {
        const title = payload.notification?.title || payload.data?.title;
        if (title) {
          registration.showNotification(title, {
            body: payload.notification?.body || payload.data?.body,
            icon: '/pwa-192x192.png',
          });
        }
      });

      return unsubscribe;
    },
    [user, dispatch],
  );

  return null;
};

export default FirebaseNotifications;
