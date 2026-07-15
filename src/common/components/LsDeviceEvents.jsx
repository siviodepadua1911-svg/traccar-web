import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Table, TableBody, TableRow, TableCell, IconButton, Link,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PowerOffIcon from '@mui/icons-material/PowerOff';
import BatteryAlertIcon from '@mui/icons-material/BatteryAlert';
import VibrationIcon from '@mui/icons-material/Vibration';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import KeyIcon from '@mui/icons-material/Key';
import SpeedIcon from '@mui/icons-material/Speed';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import FenceIcon from '@mui/icons-material/Fence';
import { useCatchCallback } from '../../reactHelper';
import fetchOrThrow from '../util/fetchOrThrow';

const EVENT_TYPES = [
  'alarm', 'ignitionOn', 'ignitionOff', 'deviceOverspeed',
  'deviceOnline', 'deviceOffline', 'deviceInactive',
  'geofenceEnter', 'geofenceExit',
];

const ALARM_LABELS = {
  powerCut: 'Alimentação cortada',
  powerOff: 'Aparelho desligado',
  powerRestored: 'Alimentação restaurada',
  lowBattery: 'Bateria fraca',
  lowPower: 'Bateria fraca',
  vibration: 'Vibração detectada',
  sos: 'SOS',
  tampering: 'Violação do aparelho',
  removing: 'Aparelho removido',
};

const ALARM_ICONS = {
  powerCut: PowerOffIcon,
  powerOff: PowerOffIcon,
  lowBattery: BatteryAlertIcon,
  lowPower: BatteryAlertIcon,
  vibration: VibrationIcon,
};

const C = { ok: '#2e7d32', warn: '#ed6c02', bad: '#d32f2f', info: '#0288d1', gray: '#5f6368' };

const STATE_OF = {
  ignitionOn: ['ignicao', true],
  ignitionOff: ['ignicao', false],
  deviceOnline: ['conexao', true],
  deviceOffline: ['conexao', false],
};

const collapseStates = (eventsDesc) => {
  const asc = [...eventsDesc].reverse();
  const last = {};
  const keep = new Set();
  asc.forEach((event) => {
    const st = STATE_OF[event.type];
    if (!st) {
      keep.add(event.id);
      return;
    }
    const group = st[0];
    const value = st[1];
    if (last[group] !== value) {
      keep.add(event.id);
    }
    last[group] = value;
  });
  return eventsDesc.filter((event) => keep.has(event.id));
};

const describeEvent = (event) => {
  const a = event.attributes || {};
  switch (event.type) {
    case 'alarm': {
      const alarm = String(a.alarm || '');
      const Icon = ALARM_ICONS[alarm] || WarningAmberIcon;
      return { label: ALARM_LABELS[alarm] || `Alarme: ${alarm}`, color: C.bad, Icon };
    }
    case 'ignitionOn': return { label: 'Ignição ligada', color: C.ok, Icon: KeyIcon };
    case 'ignitionOff': return { label: 'Ignição desligada', color: C.gray, Icon: KeyIcon };
    case 'deviceOverspeed': return { label: `Excesso de velocidade${a.speed ? ` (${Math.round(a.speed * 1.852)} km/h)` : ''}`, color: C.warn, Icon: SpeedIcon };
    case 'deviceOnline': return { label: 'Voltou a comunicar', color: C.ok, Icon: WifiIcon };
    case 'deviceOffline': return { label: 'Ficou sem comunicar', color: C.gray, Icon: WifiOffIcon };
    case 'deviceInactive': return { label: 'Inativo há mais de 1h', color: C.warn, Icon: WifiOffIcon };
    case 'geofenceEnter': return { label: 'Entrou na cerca virtual', color: C.info, Icon: FenceIcon };
    case 'geofenceExit': return { label: 'Saiu da cerca virtual', color: C.warn, Icon: FenceIcon };
    default: return null;
  }
};

const timeLabel = (time) => {
  const d = dayjs(time);
  if (d.isSame(dayjs(), 'day')) return `hoje ${d.format('HH:mm')}`;
  if (d.isSame(dayjs().subtract(1, 'day'), 'day')) return `ontem ${d.format('HH:mm')}`;
  return d.format('DD/MM HH:mm');
};

const LsDeviceEvents = ({ deviceId }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);

  const load = useCatchCallback(async () => {
    const query = new URLSearchParams({
      deviceId,
      from: dayjs().subtract(7, 'day').toISOString(),
      to: dayjs().toISOString(),
    });
    EVENT_TYPES.forEach((type) => query.append('type', type));
    const response = await fetchOrThrow(`/api/reports/events?${query.toString()}`, {
      headers: { Accept: 'application/json' },
    });
    const events = await response.json();
    events.sort((e1, e2) => new Date(e2.eventTime) - new Date(e1.eventTime));
    setItems(collapseStates(events).slice(0, 10));
  }, [deviceId]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
        <Typography variant="subtitle2" style={{ fontWeight: 600 }} color="primary">
          Alertas e eventos
          <span style={{ fontWeight: 400, color: C.gray, marginLeft: 6, fontSize: 11 }}>últimos 7 dias</span>
        </Typography>
        <IconButton size="small" onClick={() => { setItems(null); load(); }}>
          <RefreshIcon style={{ fontSize: 16 }} />
        </IconButton>
      </div>
      {!items && (
        <Typography variant="body2" color="textSecondary">Carregando…</Typography>
      )}
      {items && items.length === 0 && (
        <Typography variant="body2" color="textSecondary">Nenhum evento nos últimos 7 dias.</Typography>
      )}
      {items && items.length > 0 && (
        <Table size="small" style={{ marginBottom: 4 }}>
          <TableBody>
            {items.map((event) => {
              const info = describeEvent(event);
              if (!info) return null;
              const { label, color, Icon } = info;
              return (
                <TableRow key={event.id}>
                  <TableCell style={{ border: 'none', padding: '3px 0' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', color, fontWeight: 600, fontSize: 13 }}>
                      <Icon style={{ fontSize: 16, marginRight: 6 }} />
                      {label}
                    </span>
                  </TableCell>
                  <TableCell style={{ border: 'none', padding: '3px 0', textAlign: 'right' }}>
                    <span style={{ color: C.gray, fontSize: 12.5 }}>{timeLabel(event.eventTime)}</span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      <Typography variant="body2">
        <Link component="button" type="button" onClick={() => navigate('/reports/events')}>
          Ver todos em Relatórios → Eventos
        </Link>
      </Typography>
    </>
  );
};

export default LsDeviceEvents;
