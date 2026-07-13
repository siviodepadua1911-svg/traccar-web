import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Switch,
  Slider, TextField, Typography, Divider, CircularProgress,
} from '@mui/material';
import { useCatchCallback } from '../../reactHelper';
import fetchOrThrow from '../util/fetchOrThrow';

const LS_TOGGLES = [
  { key: 'powerCut', label: 'Corte de energia', types: ['alarm'], alarms: 'powerCut,powerOff' },
  { key: 'lowBattery', label: 'Bateria fraca', types: ['alarm'], alarms: 'lowBattery,lowPower' },
  { key: 'inactive', label: 'Sem sinal (mais de 1h)', types: ['deviceInactive'] },
  { key: 'ignitionOn', label: 'Ignição ligada', types: ['ignitionOn'] },
  { key: 'ignitionOff', label: 'Ignição desligada', types: ['ignitionOff'] },
  { key: 'moving', label: 'Início de movimento', types: ['deviceMoving'] },
  { key: 'overspeed', label: 'Excesso de velocidade', types: ['deviceOverspeed'] },
  { key: 'geofence', label: 'Cerca virtual (entrar/sair)', types: ['geofenceEnter', 'geofenceExit'] },
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

const LsAlertsDialog = ({ deviceId, deviceName, device, onClose }) => {
  const user = useSelector((state) => state.session.user);

  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [states, setStates] = useState({});
  const [linked, setLinked] = useState([]);
  const [speed, setSpeed] = useState(
    device && device.attributes && device.attributes.speedLimit
      ? Math.round(device.attributes.speedLimit * 1.852) : 100,
  );
  const [telegram, setTelegram] = useState(String((user.attributes && user.attributes.telegramChatId) || ''));

  const load = useCatchCallback(async () => {
    const response = await fetchOrThrow(`/api/notifications?deviceId=${deviceId}`);
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

  useEffect(() => { load(); }, [load]);

  const handleSave = useCatchCallback(async () => {
    setSaving(true);
    try {
      const chatId = telegram.trim();
      if (chatId !== String((user.attributes && user.attributes.telegramChatId) || '')) {
        const updatedUser = { ...user, attributes: { ...user.attributes } };
        if (chatId) {
          updatedUser.attributes.telegramChatId = chatId;
        } else {
          delete updatedUser.attributes.telegramChatId;
        }
        await fetchOrThrow(`/api/users/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedUser),
        });
      }
      const notificators = chatId ? 'web,telegram' : 'web';
      const allResponse = await fetchOrThrow('/api/notifications');
      const all = await allResponse.json();

      for (const toggle of LS_TOGGLES) {
        const want = !!states[toggle.key];
        for (const type of toggle.types) {
          const current = linked.find((n) => n.type === type && matchesToggle(n, toggle));
          if (want && !current) {
            let notification = all.find((n) => n.type === type && !n.always
              && n.attributes && n.attributes.ls && matchesToggle(n, toggle));
            if (!notification) {
              const body = {
                type, always: false, notificators, calendarId: 0, attributes: { ls: true },
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
              body: JSON.stringify({ deviceId, notificationId: notification.id }),
            });
          } else if (!want && current) {
            await fetchOrThrow('/api/permissions', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ deviceId, notificationId: current.id }),
            });
          }
        }
      }

      if (states.overspeed && device) {
        const knots = Number(speed) / 1.852;
        const currentLimit = Number((device.attributes && device.attributes.speedLimit) || 0);
        if (Math.abs(currentLimit - knots) > 0.01) {
          const updatedDevice = { ...device, attributes: { ...device.attributes, speedLimit: knots } };
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
  }, [states, speed, telegram, linked, user, device, deviceId, onClose]);

  return (
    <Dialog open onClose={() => !saving && onClose()} fullWidth maxWidth="xs">
      <DialogTitle>
        {`Meus alertas — ${deviceName}`}
        <Typography variant="body2" color="textSecondary" component="div">
          Escolha o que este veículo avisa você
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2">{toggle.label}</Typography>
                  <Switch
                    checked={!!states[toggle.key]}
                    onChange={(e) => setStates({ ...states, [toggle.key]: e.target.checked })}
                    size="small"
                  />
                </div>
                {toggle.key === 'overspeed' && states.overspeed && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 4px 4px' }}>
                    <Slider value={speed} onChange={(e, v) => setSpeed(v)} min={60} max={160} step={5} size="small" />
                    <Typography variant="body2" style={{ minWidth: 64, fontWeight: 600 }}>{`${speed} km/h`}</Typography>
                  </div>
                )}
              </div>
            ))}
            <Divider style={{ margin: '10px 0' }} />
            <Typography variant="body2" style={{ fontWeight: 600, marginBottom: 6 }}>
              Conectar meu Telegram
            </Typography>
            <TextField
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
              placeholder="Chat ID (número)"
              fullWidth
              size="small"
              helperText="Mande /start para @Alert_Ls_auto_truck_bot e pegue seu Id no @userinfobot"
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose()} disabled={saving}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !loaded}>
          {saving ? <CircularProgress size={18} /> : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LsAlertsDialog;
