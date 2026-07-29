import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { sessionActions } from '../../store';
import fetchOrThrow from '../util/fetchOrThrow';

// Canais de notificacao do app nativo (Android) - cada um com seu som.
// Os sons ficam em android/app/src/main/res/raw (sirene.wav, alerta.wav, bipe.wav).
const CHANNELS = [
  {
    id: 'ls_bloqueio',
    name: 'Bloqueio e Desbloqueio',
    description: 'Avisos de bloqueio e desbloqueio do veiculo',
    sound: 'sirene',
    importance: 5,
    visibility: 1,
    vibration: true,
  },
  {
    id: 'ls_energia',
    name: 'Energia e Bateria',
    description: 'Corte de energia e bateria fraca',
    sound: 'alerta',
    importance: 5,
    visibility: 1,
    vibration: true,
  },
  {
    id: 'ls_geral',
    name: 'Avisos gerais',
    description: 'Ignicao, movimento e outros avisos',
    sound: 'bipe',
    importance: 4,
    visibility: 1,
    vibration: true,
  },
];

// Ativa o push nativo quando o site roda dentro do app (Capacitor).
// No navegador comum nao faz nada (o push web continua pelo FirebaseNotifications).
const LsNativePush = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.session.user);

  useEffect(() => {
    const cap = window.Capacitor;
    const isNative = cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform();
    const Push = cap && cap.Plugins && cap.Plugins.PushNotifications;
    if (!isNative || !Push || !user) {
      return undefined;
    }

    const saveToken = async (value) => {
      if (!value) {
        return;
      }
      const current =
        user.attributes && user.attributes.notificationTokens
          ? String(user.attributes.notificationTokens).split(',')
          : [];
      if (current.includes(value)) {
        return;
      }
      try {
        const updated = {
          ...user,
          attributes: {
            ...user.attributes,
            notificationTokens: [...current.slice(-2), value].join(','),
          },
        };
        const response = await fetchOrThrow(`/api/users/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        });
        dispatch(sessionActions.updateUser(await response.json()));
      } catch {
        // ignore
      }
    };

    // ouvir o token ANTES de registrar (senao o evento pode se perder)
    Push.addListener('registration', (token) => {
      saveToken(token && token.value);
    });
    Push.addListener('registrationError', () => {
      // ignore
    });
    (async () => {
      try {
        for (const ch of CHANNELS) {
          // eslint-disable-next-line no-await-in-loop
          await Push.createChannel(ch);
        }
        const perm = await Push.requestPermissions();
        if (perm && perm.receive === 'granted') {
          await Push.register();
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      try {
        Push.removeAllListeners();
      } catch {
        // ignore
      }
    };
  }, [user, dispatch]);

  return null;
};

export default LsNativePush;
