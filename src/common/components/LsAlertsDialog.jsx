import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Switch,
  Select,
  MenuItem,
  Slider,
  Typography,
  Divider,
  CircularProgress,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import { sessionActions } from '../../store';
import { useCatchCallback } from '../../reactHelper';
import fetchOrThrow from '../util/fetchOrThrow';
import { useDeviceReadonly } from '../util/permissions';
import { LS_SOUND_PRESETS, playPreset } from '../util/lsSounds';

const LS_TOGGLES = [
  {
    key: 'powerCut',
    label: 'Corte de energia',
    types: ['alarm'],
    alarms: 'powerCut,powerOff',
    soundKind: 'alarms',
    soundValues: ['powerCut', 'powerOff'],
  },
  {
    key: 'lowBattery',
    label: 'Bateria fraca',
    types: ['alarm'],
    alarms: 'lowBattery,lowPower',
    soundKind: 'alarms',
    soundValues: ['lowBattery', 'lowPower'],
  },
  {
    key: 'inactive',
    label: 'Sem sinal (mais de 1h)',
    types: ['deviceInactive'],
    soundKind: 'events',
    soundValues: ['deviceInactive'],
  },
  {
    key: 'ignitionOn',
    label: 'Ignição ligada',
    types: ['ignitionOn'],
    soundKind: 'events',
    soundValues: ['ignitionOn'],
  },
  {
    key: 'ignitionOff',
    label: 'Ignição desligada',
    types: ['ignitionOff'],
    soundKind: 'events',
    soundValues: ['ignitionOff'],
  },
  {
    key: 'lock',
    label: 'Bloqueio',
    types: ['alarm'],
    alarms: 'lock',
    soundKind: 'alarms',
    soundValues: ['lock'],
  },
  {
    key: 'unlock',
    label: 'Desbloqueio',
    types: ['alarm'],
    alarms: 'unlock',
    soundKind: 'alarms',
    soundValues: ['unlock'],
  },
  {
    key: 'moving',
    label: 'Início de movimento',
    types: ['deviceMoving'],
    soundKind: 'events',
    soundValues: ['deviceMoving'],
  },
  {
    key: 'overspeed',
    label: 'Excesso de velocidade',
    types: ['deviceOverspeed'],
    soundKind: 'events',
    soundValues: ['deviceOverspeed'],
  },
  {
    key: 'geofence',
    label: 'Cerca virtual (entrar/sair)',
    types: ['geofenceEnter', 'geofenceExit'],
    soundKind: 'events',
    soundValues: ['geofenceEnter', 'geofenceExit'],
  },
];

const DEFAULT_ON = ['powerCut', 'lowBattery', 'inactive'];

const matchesToggle = (notification, toggle) => {
  if (!toggle.types.includes(notification.type)) return false;
  if (toggle.alarms) {
    const list = String((notification.attributes && notification.attributes.alarms) || '');
    return toggle.alarms.split(',').some((a) => list.includes(a));
  }
  return true;
};

const soundSource = (user, kind) => {
  const attrs = user.attributes || {};
  if (kind === 'alarms') {
    return attrs.soundAlarms !== undefined ? attrs.soundAlarms : 'sos';
  }
  return attrs.soundEvents !== undefined ? attrs.soundEvents : '';
};

const LsAlertsDialog = ({ deviceId, deviceName, device, onClose }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.session.user);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const deviceReadonly = useDeviceReadonly();

  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [states, setStates] = useState({});
  const [linked, setLinked] = useState([]);
  const [speed, setSpeed] = useState(
    device && device.attributes && device.attributes.speedLimit
      ? Math.round(device.attributes.speedLimit * 1.852)
      : 100,
  );
  const [telegram, setTelegram] = useState(
    String((user.attributes && user.attributes.telegramChatId) || ''),
  );
  const [tgWaiting, setTgWaiting] = useState(false);

  const connectTelegram = () => {
    const tok =
      `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
        .replace(/[^a-z0-9]/gi, '')
        .slice(0, 40);
    const updated = { ...user, attributes: { ...user.attributes, telegramLinkToken: tok } };
    fetch(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});
    window.open(`https://t.me/Alert_Ls_auto_truck_bot?start=${tok}`, '_blank');
    setTgWaiting(true);
    let tries = 0;
    const iv = setInterval(async () => {
      tries += 1;
      try {
        const r = await fetch('/api/session');
        if (r.ok) {
          const u = await r.json();
          const cid = u.attributes && u.attributes.telegramChatId;
          if (cid) {
            setTelegram(String(cid));
            setTgWaiting(false);
            clearInterval(iv);
          }
        }
      } catch {
        // ignore
      }
      if (tries >= 40) {
        setTgWaiting(false);
        clearInterval(iv);
      }
    }, 3000);
  };
  const [sounds, setSounds] = useState(() => {
    const initial = {};
    LS_TOGGLES.forEach((toggle) => {
      const list = String(soundSource(user, toggle.soundKind))
        .split(',')
        .map((x) => x.trim());
      initial[toggle.key] = toggle.soundValues.some((v) => list.includes(v));
    });
    return initial;
  });
  const [alertSounds, setAlertSounds] = useState(() => {
    let saved = {};
    try {
      saved = JSON.parse((user.attributes && user.attributes.lsAlertSounds) || '{}');
    } catch {
      saved = {};
    }
    const initial = {};
    LS_TOGGLES.forEach((toggle) => {
      initial[toggle.key] = saved[toggle.key] || 'beep';
    });
    return initial;
  });

  const load = useCatchCallback(async () => {
    const response = await fetchOrThrow(
      deviceReadonly || !deviceId
        ? '/api/notifications'
        : `/api/notifications?deviceId=${deviceId}`,
    );
    const list = await response.json();
    setLinked(list);
    const next = {};
    LS_TOGGLES.forEach((toggle) => {
      const found = list.some((n) => matchesToggle(n, toggle));
      next[toggle.key] = found || (list.length === 0 && DEFAULT_ON.includes(toggle.key));
    });
    setStates(next);
    setLoaded(true);
  }, [deviceId]);

  useEffect(() => {
    load();
  }, [load]);

  const buildSound = (kind) => {
    const set = new Set(
      String(soundSource(user, kind))
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    );
    LS_TOGGLES.forEach((toggle) => {
      if (toggle.soundKind === kind) {
        toggle.soundValues.forEach((v) => set.delete(v));
      }
    });
    LS_TOGGLES.forEach((toggle) => {
      if (toggle.soundKind === kind && states[toggle.key] && sounds[toggle.key]) {
        toggle.soundValues.forEach((v) => set.add(v));
      }
    });
    return Array.from(set).join(',');
  };

  const handleSave = useCatchCallback(async () => {
    setSaving(true);
    try {
      const chatId = telegram.trim();
      const attributes = { ...user.attributes };
      if (chatId) {
        attributes.telegramChatId = chatId;
      } else {
        delete attributes.telegramChatId;
      }
      delete attributes.telegramLinkToken;
      attributes.soundAlarms = buildSound('alarms');
      attributes.soundEvents = buildSound('events');
      const soundMap = {};
      LS_TOGGLES.forEach((toggle) => {
        if (states[toggle.key] && sounds[toggle.key]) {
          soundMap[toggle.key] = alertSounds[toggle.key];
        }
      });
      attributes.lsAlertSounds = JSON.stringify(soundMap);
      const updatedUser = { ...user, attributes };
      await fetchOrThrow(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser),
      });
      dispatch(sessionActions.updateUser(updatedUser));

      const notificators = chatId ? 'web,firebase,telegram' : 'web,firebase';
      const allResponse = await fetchOrThrow('/api/notifications');
      const all = await allResponse.json();

      for (const toggle of LS_TOGGLES) {
        const want = !!states[toggle.key];
        for (const type of toggle.types) {
          const current = linked.find((n) => n.type === type && matchesToggle(n, toggle));
          if (want && !current) {
            let notification = all.find(
              (n) =>
                n.type === type &&
                !n.always &&
                n.attributes &&
                n.attributes.ls &&
                matchesToggle(n, toggle),
            );
            if (!notification) {
              const body = {
                type,
                always: false,
                notificators,
                calendarId: 0,
                attributes: { ls: true },
              };
              if (toggle.alarms) {
                body.attributes.alarms = toggle.alarms;
              }
              const created = await fetchOrThrow('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
              });
              notification = await created.json();
              all.push(notification);
            } else if (notification.notificators !== notificators) {
              await fetchOrThrow(`/api/notifications/${notification.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...notification, notificators }),
              });
            }
            await fetchOrThrow('/api/permissions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(
                deviceReadonly || !deviceId
                  ? { userId: user.id, notificationId: notification.id }
                  : { deviceId, notificationId: notification.id },
              ),
            });
          } else if (!want) {
            const toRemove = linked.filter((n) => n.type === type && matchesToggle(n, toggle));
            for (const n of toRemove) {
              await fetchOrThrow('/api/permissions', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(
                  deviceReadonly || !deviceId
                    ? { userId: user.id, notificationId: n.id }
                    : { deviceId, notificationId: n.id },
                ),
              });
            }
          }
        }
      }

      if (!deviceReadonly && states.overspeed && device) {
        const knots = Number(speed) / 1.852;
        const currentLimit = Number((device.attributes && device.attributes.speedLimit) || 0);
        if (Math.abs(currentLimit - knots) > 0.01) {
          const updatedDevice = {
            ...device,
            attributes: { ...device.attributes, speedLimit: knots },
          };
          await fetchOrThrow(`/api/devices/${device.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedDevice),
          });
        }
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }, [states, sounds, alertSounds, speed, telegram, linked, user, device, deviceId, onClose]);

  return (
    <Dialog
      open
      onClose={() => !saving && onClose()}
      fullWidth
      maxWidth="xs"
      fullScreen={fullScreen}
    >
      <DialogTitle>
        {deviceName ? `Meus alertas — ${deviceName}` : 'Meus alertas'}
        <Typography variant="body2" color="textSecondary" component="div">
          {deviceName
            ? 'Escolha o que este veículo avisa você'
            : 'Escolha os alertas dos seus veículos'}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {!loaded ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <CircularProgress size={28} />
          </div>
        ) : (
          <>
            {LS_TOGGLES.map((toggle) => (
              <div key={toggle.key}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" style={{ flexGrow: 1 }}>
                    {toggle.label}
                  </Typography>
                  <IconButton
                    size="small"
                    disabled={!states[toggle.key]}
                    onClick={() => setSounds({ ...sounds, [toggle.key]: !sounds[toggle.key] })}
                    title="Tocar som no painel"
                  >
                    {sounds[toggle.key] && states[toggle.key] ? (
                      <VolumeUpIcon fontSize="small" color="primary" />
                    ) : (
                      <VolumeOffIcon fontSize="small" />
                    )}
                  </IconButton>
                  {states[toggle.key] && sounds[toggle.key] && (
                    <>
                      <Select
                        size="small"
                        value={alertSounds[toggle.key] || 'beep'}
                        onChange={(e) =>
                          setAlertSounds({ ...alertSounds, [toggle.key]: e.target.value })
                        }
                        sx={{ fontSize: 12, mx: 0.5, minWidth: 112 }}
                      >
                        {Object.keys(LS_SOUND_PRESETS)
                          .filter((k) => k !== 'none')
                          .map((k) => (
                            <MenuItem key={k} value={k} sx={{ fontSize: 12 }}>
                              {LS_SOUND_PRESETS[k].label}
                            </MenuItem>
                          ))}
                      </Select>
                      <IconButton
                        size="small"
                        onClick={() => playPreset(alertSounds[toggle.key] || 'beep')}
                        title="Ouvir"
                      >
                        <VolumeUpIcon fontSize="small" />
                      </IconButton>
                    </>
                  )}
                  <Switch
                    checked={!!states[toggle.key]}
                    onChange={(e) => setStates({ ...states, [toggle.key]: e.target.checked })}
                    size="small"
                  />
                </div>
                {toggle.key === 'overspeed' && states.overspeed && (
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 4px 4px' }}
                  >
                    <Slider
                      value={speed}
                      onChange={(e, v) => setSpeed(v)}
                      min={60}
                      max={160}
                      step={5}
                      size="small"
                    />
                    <Typography
                      variant="body2"
                      style={{ minWidth: 64, fontWeight: 600 }}
                    >{`${speed} km/h`}</Typography>
                  </div>
                )}
              </div>
            ))}
            <Typography
              variant="caption"
              color="textSecondary"
              component="div"
              style={{ marginTop: 6 }}
            >
              Alto-falante azul = toca um bipe no painel aberto. Vale para todos os seus veículos.
            </Typography>
            <Divider style={{ margin: '10px 0' }} />
            <Typography variant="body2" style={{ fontWeight: 600, marginBottom: 6 }}>
              Conectar meu Telegram
            </Typography>
            {telegram ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ color: '#2e7d32', fontWeight: 600, fontSize: 14 }}>
                  ✓ Telegram conectado
                </span>
                <Button size="small" color="inherit" onClick={() => setTelegram('')}>
                  Desconectar
                </Button>
              </div>
            ) : (
              <div>
                <Button
                  variant="contained"
                  onClick={connectTelegram}
                  sx={{ backgroundColor: '#229ED9', '&:hover': { backgroundColor: '#1c88ba' } }}
                >
                  Conectar Telegram
                </Button>
                {tgWaiting && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginTop: 8,
                      fontSize: 13,
                      color: '#607d8b',
                    }}
                  >
                    <CircularProgress size={16} />
                    Aguardando... abra o Telegram e aperte &quot;Iniciar&quot;.
                  </div>
                )}
                <Typography
                  variant="caption"
                  color="textSecondary"
                  component="div"
                  style={{ marginTop: 6 }}
                >
                  Um toque: abre o bot da LS no Telegram, aperte Iniciar e pronto — sem digitar
                  nada.
                </Typography>
              </div>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose()} disabled={saving}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !loaded}>
          {saving ? <CircularProgress size={18} /> : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LsAlertsDialog;
