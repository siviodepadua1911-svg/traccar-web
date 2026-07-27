import { useState, useEffect, useReducer, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Rnd } from 'react-rnd';
import {
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Menu,
  MenuItem,
  Chip,
  Link,
  Avatar,
  Checkbox,
  Button,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import SettingsIcon from '@mui/icons-material/Settings';
import KeyIcon from '@mui/icons-material/Key';
import BoltIcon from '@mui/icons-material/Bolt';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';
import BatteryChargingFullIcon from '@mui/icons-material/BatteryChargingFull';
import PowerIcon from '@mui/icons-material/Power';
import SatelliteAltIcon from '@mui/icons-material/SatelliteAlt';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import { mapIconKey, mapIcons } from '../../map/core/preloadImages';

import { useTranslation } from './LocalizationProvider';
import RemoveDialog from './RemoveDialog';
import LsDeviceEvents from './LsDeviceEvents';
import LsSlideToConfirm from './LsSlideToConfirm';
import LsFichaCompleta from './LsFichaCompleta';
import LsVehicleSheet from './LsVehicleSheet';
import PositionValue from './PositionValue';
import { useDeviceReadonly, useRestriction } from '../util/permissions';
import usePositionAttributes from '../attributes/usePositionAttributes';
import { devicesActions } from '../../store';
import { useCatch, useCatchCallback } from '../../reactHelper';
import { useAttributePreference, usePreference } from '../util/preferences';
import fetchOrThrow from '../util/fetchOrThrow';
import { translateResult } from '../util/lsCommandResult';
import { formatTime, formatAddress, formatDurationShort } from '../util/formatter';
import { lsCardColors } from '../theme/lsCardColors';

const useStyles = makeStyles()((theme, { desktopPadding }) => ({
  card: {
    pointerEvents: 'auto',
    width: '100%',
    maxWidth: 'calc(100vw - 16px)',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    [theme.breakpoints.up('sm')]: {
      borderRadius: 0,
    },
  },
  table: {
    '& .MuiTableCell-sizeSmall': {
      paddingLeft: 0,
      paddingRight: 0,
    },
    '& .MuiTableCell-sizeSmall:first-of-type': {
      paddingRight: theme.spacing(1),
    },
  },
  cell: {
    borderBottom: 'none',
  },
  sectionTitle: {
    marginTop: theme.spacing(1.5),
    fontWeight: 600,
  },
  root: {
    pointerEvents: 'none',
    position: 'fixed',
    zIndex: 1300,
    left: '12px',
    top: '149px',
  },
  mobileRoot: {
    pointerEvents: 'none',
    position: 'fixed',
    zIndex: 1300,
    left: 0,
    right: 0,
    bottom: `${theme.dimensions.bottomBarHeight}px`,
    display: 'flex',
    justifyContent: 'center',
  },
  mobileCard: {
    pointerEvents: 'auto',
    width: 'calc(100% - 24px)',
    maxWidth: 480,
    maxHeight: '70vh',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 12,
  },
}));

const StatusRow = ({ name, content }) => (
  <TableRow>
    <TableCell style={{ borderBottom: 'none' }}>
      <Typography variant="body2">{name}</Typography>
    </TableCell>
    <TableCell style={{ borderBottom: 'none' }}>
      <Typography variant="body2" color="textSecondary">
        {content}
      </Typography>
    </TableCell>
  </TableRow>
);

const rawValue = (v) => {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

const COLORS = {
  ok: '#2e7d32',
  warn: '#ed6c02',
  bad: '#d32f2f',
  info: '#0288d1',
};

const Colored = ({ color, children }) => <span style={{ color, fontWeight: 600 }}>{children}</span>;

const SENSOR_ICON = { fontSize: 18, verticalAlign: 'text-bottom', marginRight: 8 };

const SensorRows = ({ position }) => {
  const a = position.attributes;
  const rows = [];
  if ('ignition' in a) {
    rows.push([
      'Ignição',
      <KeyIcon style={{ ...SENSOR_ICON, color: '#f9a825' }} />,
      a.ignition ? (
        <Colored color={COLORS.ok}>Ligada</Colored>
      ) : (
        <Colored color={COLORS.warn}>Desligada</Colored>
      ),
    ]);
  }
  if ('blocked' in a) {
    rows.push([
      'Bloqueio',
      a.blocked ? (
        <LockIcon style={{ ...SENSOR_ICON, color: '#e53935' }} />
      ) : (
        <LockOpenIcon style={{ ...SENSOR_ICON, color: '#43a047' }} />
      ),
      a.blocked ? (
        <Colored color={COLORS.bad}>BLOQUEADO</Colored>
      ) : (
        <Colored color={COLORS.ok}>Liberado</Colored>
      ),
    ]);
  }
  if ('motion' in a) {
    rows.push([
      'Movimento',
      <DirectionsRunIcon style={{ ...SENSOR_ICON, color: a.motion ? '#1e88e5' : '#90a4ae' }} />,
      a.motion ? <Colored color={COLORS.info}>Em movimento</Colored> : 'Parado',
    ]);
  }
  if ('power' in a) {
    const v = Number(a.power);
    const c = v >= 12.5 ? COLORS.ok : v >= 11.5 ? COLORS.warn : COLORS.bad;
    rows.push([
      'Bateria do veículo',
      <BoltIcon style={{ ...SENSOR_ICON, color: '#fb8c00' }} />,
      <Colored color={c}>{`${v.toFixed(2)} V`}</Colored>,
    ]);
  }
  if ('power' in a) {
    const va = Number(a.power);
    const sys24 = va > 18;
    const vMin = sys24 ? 25 : 13;
    const vMax = sys24 ? 28 : 15;
    const vOff = sys24 ? 24 : 12.8;
    let altTexto = 'Motor desligado';
    let altCor = '#5f6368';
    if (va > vMax) {
      altTexto = 'Voltagem alta - verificar';
      altCor = COLORS.bad;
    } else if (va >= vMin) {
      altTexto = 'Carregando (motor ligado)';
      altCor = COLORS.ok;
    } else if (va > vOff) {
      altTexto = 'Motor ligado';
    }
    rows.push([
      'Alternador',
      <BatteryChargingFullIcon style={{ ...SENSOR_ICON, color: altCor }} />,
      <Colored color={altCor}>{altTexto}</Colored>,
    ]);
  }
  if ('batteryLevel' in a) {
    const v = Number(a.batteryLevel);
    const c = v >= 60 ? COLORS.ok : v >= 20 ? COLORS.warn : COLORS.bad;
    rows.push([
      'Bateria interna',
      <BatteryFullIcon style={{ ...SENSOR_ICON, color: '#43a047' }} />,
      <Colored color={c}>{`${Math.round(v)}%`}</Colored>,
    ]);
  }
  if ('charge' in a) {
    rows.push([
      'Alimentação externa',
      <PowerIcon style={{ ...SENSOR_ICON, color: '#8e24aa' }} />,
      a.charge ? (
        <Colored color={COLORS.ok}>Conectada</Colored>
      ) : (
        <Colored color={COLORS.warn}>Desconectada</Colored>
      ),
    ]);
  }
  if ('rssi' in a) {
    const v = Number(a.rssi);
    const max = v > 5 ? 31 : 5;
    const pct = Math.round((v / max) * 100);
    const c = pct >= 70 ? COLORS.ok : pct >= 40 ? COLORS.warn : COLORS.bad;
    const label = pct >= 70 ? 'Forte' : pct >= 40 ? 'Médio' : 'Fraco';
    rows.push([
      'Sinal GSM',
      <SignalCellularAltIcon style={{ ...SENSOR_ICON, color: '#039be5' }} />,
      <Colored color={c}>{`${label} (${pct}%)`}</Colored>,
    ]);
  }
  if ('sat' in a) {
    const v = Number(a.sat);
    const c = v >= 5 ? COLORS.ok : v >= 3 ? COLORS.warn : COLORS.bad;
    rows.push([
      'Satélites GPS',
      <SatelliteAltIcon style={{ ...SENSOR_ICON, color: '#00897b' }} />,
      <Colored color={c}>{String(v)}</Colored>,
    ]);
  }
  if (a.alarm) {
    rows.push([
      'Alarme',
      <WarningAmberIcon style={{ ...SENSOR_ICON, color: '#e53935' }} />,
      <Colored color={COLORS.bad}>{String(a.alarm)}</Colored>,
    ]);
  }
  return rows.map(([name, icon, content]) => (
    <StatusRow
      key={name}
      name={
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          {icon}
          {name}
        </span>
      }
      content={content}
    />
  ));
};

const SPEEDO_MAX = 120;

const speedoPoint = (angleDeg, radius) => {
  const rad = (angleDeg * Math.PI) / 180;
  return [110 + radius * Math.cos(rad), 110 - radius * Math.sin(rad)];
};

const speedoTicks = [];
for (let v = 0; v <= SPEEDO_MAX; v += 20) {
  const ang = 210 - (v / SPEEDO_MAX) * 240;
  const [x1, y1] = speedoPoint(ang, 88);
  const [x2, y2] = speedoPoint(ang, 78);
  const [lx, ly] = speedoPoint(ang, 63);
  speedoTicks.push({ v, x1, y1, x2, y2, lx, ly });
}

const Speedometer = ({ speed }) => {
  const shown = Math.max(0, Math.round(speed));
  const value = Math.min(shown, SPEEDO_MAX);
  const angle = -120 + (value / SPEEDO_MAX) * 240;
  return (
    <svg viewBox="0 0 220 190" style={{ display: 'block', width: '100%' }}>
      <circle cx="110" cy="110" r="100" fill="#23272e" stroke="#3d4451" strokeWidth="2" />
      <path d="M 33.8 154 A 88 88 0 0 1 166.6 42.6" fill="none" stroke="#2e7d32" strokeWidth="6" />
      <path
        d="M 166.6 42.6 A 88 88 0 0 1 196.7 125.3"
        fill="none"
        stroke="#ed6c02"
        strokeWidth="6"
      />
      <path
        d="M 196.7 125.3 A 88 88 0 0 1 186.2 154"
        fill="none"
        stroke="#d32f2f"
        strokeWidth="6"
      />
      {speedoTicks.map((tk) => (
        <g key={tk.v}>
          <line x1={tk.x1} y1={tk.y1} x2={tk.x2} y2={tk.y2} stroke="#e8eaed" strokeWidth="3" />
          <text x={tk.lx} y={tk.ly + 4} textAnchor="middle" fontSize="12" fill="#e8eaed">
            {tk.v}
          </text>
        </g>
      ))}
      <text x="110" y="152" textAnchor="middle" fontSize="30" fontWeight="500" fill="#ffffff">
        {shown}
      </text>
      <text x="110" y="170" textAnchor="middle" fontSize="11" fill="#9aa0a6">
        km/h
      </text>
      <g
        style={{
          transform: `rotate(${angle}deg)`,
          transformOrigin: '110px 110px',
          transition: 'transform 0.8s ease',
        }}
      >
        <line
          x1="110"
          y1="124"
          x2="110"
          y2="42"
          stroke="#e53935"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>
      <circle cx="110" cy="110" r="9" fill="#3d4451" />
      <circle cx="110" cy="110" r="3.5" fill="#e53935" />
    </svg>
  );
};

// Endereco por extenso via geocodificacao reversa sob demanda (Nominatim/OSM
// atras de /api/server/geocode) - so busca quando o card abre, com cache local
// pra nao repetir a consulta ao navegar entre veiculos ou reabrir o mesmo.
const LsAddress = ({ position, color }) => {
  const geocoderEnabled = useSelector((state) => state.session.server.geocoderEnabled);
  const coordinateFormat = usePreference('coordinateFormat');
  const [address, setAddress] = useState(position.address || null);
  const cacheRef = useRef(new Map());

  useEffect(() => {
    if (position.address) {
      setAddress(position.address);
      return undefined;
    }
    if (!geocoderEnabled) {
      setAddress(null);
      return undefined;
    }
    const key = `${position.latitude.toFixed(4)},${position.longitude.toFixed(4)}`;
    if (cacheRef.current.has(key)) {
      setAddress(cacheRef.current.get(key));
      return undefined;
    }
    let cancelled = false;
    const query = new URLSearchParams({
      latitude: position.latitude,
      longitude: position.longitude,
    });
    fetchOrThrow(`/api/server/geocode?${query.toString()}`)
      .then((response) => response.text())
      .then((text) => {
        if (!cancelled) {
          cacheRef.current.set(key, text);
          setAddress(text);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAddress(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [position.latitude, position.longitude, position.address, geocoderEnabled]);

  return (
    <Typography variant="body2" style={{ color }}>
      {address ||
        formatAddress(
          { latitude: position.latitude, longitude: position.longitude },
          coordinateFormat,
        )}
    </Typography>
  );
};

const StatusBox = ({ c, icon, label, value, sub, color }) => (
  <div
    style={{
      flex: 1,
      minWidth: 0,
      background: c.surfaceAlt,
      border: `1px solid ${c.border}`,
      borderRadius: 10,
      padding: '8px 6px',
      textAlign: 'center',
    }}
  >
    <div style={{ color: color || c.accent, display: 'flex', justifyContent: 'center' }}>
      {icon}
    </div>
    <Typography
      variant="caption"
      style={{ color: c.textSecondary, display: 'block', marginTop: 2 }}
    >
      {label}
    </Typography>
    <Typography variant="body2" noWrap style={{ color: c.text, fontWeight: 700 }}>
      {value}
    </Typography>
    {sub && (
      <Typography variant="caption" style={{ color: color || c.textSecondary, display: 'block' }}>
        {sub}
      </Typography>
    )}
  </div>
);

const ShortcutButton = ({ c, icon, label, onClick, disabled }) => (
  <div
    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 64 }}
  >
    <IconButton size="small" disabled={disabled} onClick={onClick} style={{ color: c.accent }}>
      {icon}
    </IconButton>
    <Typography variant="caption" style={{ color: disabled ? c.border : c.textSecondary }}>
      {label}
    </Typography>
  </div>
);

const ignitionBoxInfo = (a) => {
  if (!('ignition' in a)) return { value: '—', sub: null, color: undefined };
  return a.ignition
    ? { value: 'Ligada', sub: null, color: COLORS.ok }
    : { value: 'Desligada', sub: null, color: COLORS.warn };
};

const signalBoxInfo = (a) => {
  if (!('rssi' in a)) return { value: '—', sub: null, color: undefined };
  const v = Number(a.rssi);
  const max = v > 5 ? 31 : 5;
  const pct = Math.round((v / max) * 100);
  const color = pct >= 70 ? COLORS.ok : pct >= 40 ? COLORS.warn : COLORS.bad;
  const label = pct >= 70 ? 'Forte' : pct >= 40 ? 'Médio' : 'Fraco';
  return { value: label, sub: `${pct}%`, color };
};

const batteryBoxInfo = (a) => {
  if (!('power' in a)) return { value: '—', sub: null, color: undefined };
  const va = Number(a.power);
  const sys24 = va > 18;
  const vMin = sys24 ? 25 : 13;
  const vMax = sys24 ? 28 : 15;
  const vOff = sys24 ? 24 : 12.8;
  let sub = 'Motor desligado';
  let color = '#5f6368';
  if (va > vMax) {
    sub = 'Voltagem alta';
    color = COLORS.bad;
  } else if (va >= vMin) {
    sub = 'Carregando';
    color = COLORS.ok;
  } else if (va > vOff) {
    sub = 'Motor ligado';
    color = COLORS.ok;
  }
  return { value: `${va.toFixed(1)} V`, sub, color };
};

const StatusCard = ({
  deviceId,
  position,
  onClose,
  disableActions,
  desktopPadding = 0,
  deviceIds,
}) => {
  const { classes } = useStyles({ desktopPadding });
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const c = lsCardColors(dark);
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const t = useTranslation();

  const readonly = useRestriction('readonly');
  const deviceReadonly = useDeviceReadonly();

  const shareDisabled = useSelector((state) => state.session.server.attributes.disableShare);
  const user = useSelector((state) => state.session.user);
  const canBlock =
    !deviceReadonly || (user && user.attributes && user.attributes.lsPerfil === 'bloqueio');
  const device = useSelector((state) => state.devices.items[deviceId]);
  const stopSince = useSelector((state) => state.session.stopSince[deviceId]);

  const deviceImage = device?.attributes?.deviceImage;

  const positionAttributes = usePositionAttributes(t);
  const positionItems = useAttributePreference(
    'positionItems',
    'fixTime,address,speed,totalDistance',
  );

  const navigationAppLink = useAttributePreference('navigationAppLink');
  const navigationAppTitle = useAttributePreference('navigationAppTitle');

  const savedPos = JSON.parse(localStorage.getItem('lsCardPos') || '{"x":0,"y":0}');
  const savedSize = JSON.parse(localStorage.getItem('lsCardSize3') || '{"w":null,"h":null}');

  const [anchorEl, setAnchorEl] = useState(null);

  const [removing, setRemoving] = useState(false);
  const [showAll] = useState(false);
  const [fichaOpen, setFichaOpen] = useState(false);
  const [settingsAnchor, setSettingsAnchor] = useState(null);
  const [sections, setSections] = useState(() => ({
    speedo: true,
    sensores: true,
    resposta: true,
    conect: true,
    perfil: true,
    params: true,
    eventos: true,
    ...JSON.parse(localStorage.getItem('lsCardSections') || '{}'),
  }));
  const toggleSection = (key) => {
    const next = { ...sections, [key]: !sections[key] };
    setSections(next);
    localStorage.setItem('lsCardSections', JSON.stringify(next));
  };

  // Atualiza o "Parado ha Xh" da pill periodicamente sem precisar de nova posicao.
  const [, forceTick] = useReducer((n) => n + 1, 0);
  useEffect(() => {
    const interval = setInterval(forceTick, 30000);
    return () => clearInterval(interval);
  }, []);

  const navIndex = deviceIds ? deviceIds.indexOf(deviceId) : -1;
  const canNavigate = Boolean(deviceIds) && deviceIds.length > 1 && navIndex >= 0;
  const navigateDevice = (offset) => {
    if (!canNavigate) return;
    const nextIndex = (navIndex + offset + deviceIds.length) % deviceIds.length;
    dispatch(devicesActions.selectId(deviceIds[nextIndex]));
  };

  const handleRemove = useCatch(async (removed) => {
    if (removed) {
      const response = await fetchOrThrow('/api/devices');
      dispatch(devicesActions.refresh(await response.json()));
    }
    setRemoving(false);
  });

  const handleGeofence = useCatchCallback(async () => {
    const newItem = {
      name: t('sharedGeofence'),
      area: `CIRCLE (${position.latitude} ${position.longitude}, 50)`,
    };
    const response = await fetchOrThrow('/api/geofences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
    });
    const item = await response.json();
    await fetchOrThrow('/api/permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: position.deviceId, geofenceId: item.id }),
    });
    navigate(`/settings/geofence/${item.id}`);
  }, [navigate, position, t]);

  const sendCommand = useCatch(async (type) => {
    localStorage.setItem('lsExpectResultUntil', String(Date.now() + 3 * 60 * 1000));
    if (user && user.limitCommands) {
      const listResponse = await fetchOrThrow(`/api/commands/send?deviceId=${deviceId}`);
      const available = await listResponse.json();
      const saved = available.find((c2) => c2.type === type);
      if (!saved) {
        throw Error('Comando não liberado para este veículo - fale com a LS Autotruck');
      }
      await fetchOrThrow('/api/commands/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...saved, deviceId }),
      });
      return;
    }
    await fetchOrThrow('/api/commands/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, type }),
    });
  });

  const blocked = Boolean(position?.attributes?.blocked);
  const moving = Boolean(position?.attributes?.motion);

  let pill = null;
  if (position) {
    if (blocked) {
      pill = { label: 'Bloqueado', bg: '#c62828', fg: '#fff' };
    } else if (moving) {
      pill = { label: 'Em movimento', bg: '#1565c0', fg: '#fff' };
    } else {
      const label = stopSince
        ? `Parado há ${formatDurationShort(Math.max(0, Date.now() - new Date(stopSince).getTime()))}`
        : 'Parado';
      pill = { label, bg: c.surfaceAlt, fg: c.textSecondary };
    }
  }

  const cardBody = device && (
    <div
      style={{
        background: c.surface,
        color: c.text,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <div
        className="draggable-header"
        style={{
          padding: '10px 8px',
          cursor: desktop ? 'move' : 'default',
          borderBottom: `1px solid ${c.border}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <IconButton
            size="small"
            onClick={() => navigateDevice(-1)}
            disabled={!canNavigate}
            style={{ color: canNavigate ? c.textSecondary : c.border }}
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Avatar variant="rounded" style={{ width: 38, height: 38, background: c.surfaceAlt }}>
              <img
                style={{ width: 24, height: 24 }}
                src={mapIcons[mapIconKey(device.category)]}
                alt=""
              />
            </Avatar>
            <span
              style={{
                position: 'absolute',
                right: -2,
                bottom: -2,
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: device.status === 'online' ? '#2e7d32' : '#9aa0a6',
                border: `2px solid ${c.surface}`,
              }}
            />
          </div>
          <div style={{ minWidth: 0, flexGrow: 1 }}>
            <Typography
              variant="body1"
              noWrap
              style={{ fontWeight: 700, lineHeight: 1.2, color: c.text }}
            >
              {device.name}
            </Typography>
            <Typography
              variant="caption"
              noWrap
              style={{ display: 'block', color: c.textSecondary }}
            >
              {[
                device.attributes?.placa,
                canNavigate ? `${navIndex + 1} de ${deviceIds.length}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Typography>
          </div>
          <IconButton
            size="small"
            onClick={() => navigateDevice(1)}
            disabled={!canNavigate}
            style={{ color: canNavigate ? c.textSecondary : c.border }}
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={(e) => setAnchorEl(e.currentTarget)}
            disabled={!position}
            style={{ color: c.textSecondary }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={onClose}
            onTouchStart={onClose}
            style={{ color: c.textSecondary }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </div>
      </div>

      {position ? (
        <CardContent style={{ flexGrow: 1, overflow: 'auto', padding: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ maxWidth: 178, margin: '0 auto', width: '100%' }}>
              <Speedometer speed={position.speed * 1.852} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Chip
                size="small"
                label={pill.label}
                style={{ background: pill.bg, color: pill.fg, fontWeight: 600 }}
              />
              <Typography variant="caption" style={{ color: c.textSecondary }}>
                {formatTime(position.fixTime, 'minutes')}
              </Typography>
              <Typography variant="caption" style={{ color: c.textSecondary }}>
                {`${Math.round(position.speed * 1.852)} km/h`}
              </Typography>
            </div>

            <div>
              <LsAddress position={position} color={c.text} />
              <Link
                href={`https://www.google.com/maps/search/?api=1&query=${position.latitude}%2C${position.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                variant="caption"
                style={{ color: c.accent }}
              >
                Ver no mapa
              </Link>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <StatusBox
                c={c}
                icon={<KeyIcon fontSize="small" />}
                label="Ignição"
                {...ignitionBoxInfo(position.attributes)}
              />
              <StatusBox
                c={c}
                icon={<SignalCellularAltIcon fontSize="small" />}
                label="Sinal"
                {...signalBoxInfo(position.attributes)}
              />
              <StatusBox
                c={c}
                icon={<BoltIcon fontSize="small" />}
                label="Bateria"
                {...batteryBoxInfo(position.attributes)}
              />
            </div>

            <Button
              fullWidth
              variant="contained"
              startIcon={blocked ? <LockOpenIcon /> : <LockIcon />}
              disabled={disableActions || !canBlock}
              onClick={() => {
                if (
                  window.confirm(
                    blocked ? 'Desbloquear o motor do veiculo?' : 'Bloquear o motor do veiculo?',
                  )
                ) {
                  sendCommand(blocked ? 'engineResume' : 'engineStop');
                }
              }}
              style={{
                background:
                  disableActions || !canBlock ? c.border : blocked ? '#2e7d32' : '#c62828',
                color: '#fff',
                borderRadius: 24,
                padding: 11,
                fontWeight: 700,
                textTransform: 'none',
                fontSize: 14,
              }}
            >
              {blocked ? 'DESBLOQUEAR' : 'BLOQUEAR'}
            </Button>

            <div style={{ display: 'flex', justifyContent: 'space-around' }}>
              <ShortcutButton
                c={c}
                icon={showAll ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                label="Ficha completa"
                onClick={() => setFichaOpen(true)}
              />
            </div>

            {showAll && (
              <div
                style={{
                  borderTop: `1px solid ${c.border}`,
                  paddingTop: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <IconButton
                    size="small"
                    onClick={(e) => setSettingsAnchor(e.currentTarget)}
                    style={{ color: c.textSecondary }}
                  >
                    <SettingsIcon fontSize="small" />
                  </IconButton>
                </div>
                {sections.speedo && (
                  <div style={{ width: 160, margin: '0 auto' }}>
                    <Speedometer speed={position.speed * 1.852} />
                  </div>
                )}
                <Avatar
                  variant="rounded"
                  src={deviceImage ? `/api/media/${device.uniqueId}/${deviceImage}` : undefined}
                  style={{
                    width: '100%',
                    height: 140,
                    backgroundColor: c.surfaceAlt,
                    border: `1px solid ${c.border}`,
                    borderRadius: 10,
                  }}
                >
                  <img
                    style={{ width: 56, height: 56 }}
                    src={mapIcons[mapIconKey(device.category)]}
                    alt=""
                  />
                </Avatar>
                <Table size="small" className={classes.table}>
                  <TableBody>
                    {positionItems
                      .split(',')
                      .filter(
                        (key) =>
                          position.hasOwnProperty(key) || position.attributes.hasOwnProperty(key),
                      )
                      .map((key) => (
                        <StatusRow
                          key={key}
                          name={positionAttributes[key]?.name || key}
                          content={
                            <PositionValue
                              position={position}
                              property={position.hasOwnProperty(key) ? key : null}
                              attribute={position.hasOwnProperty(key) ? null : key}
                            />
                          }
                        />
                      ))}
                  </TableBody>
                </Table>
                {sections.eventos && <LsDeviceEvents deviceId={deviceId} />}
                {sections.sensores && (
                  <>
                    <Typography variant="subtitle2" className={classes.sectionTitle}>
                      Sensores
                    </Typography>
                    <Table size="small" className={classes.table}>
                      <TableBody>
                        <SensorRows position={position} />
                      </TableBody>
                    </Table>
                  </>
                )}
                {sections.resposta && position.attributes.result && (
                  <>
                    <Typography variant="subtitle2" className={classes.sectionTitle}>
                      Última resposta do rastreador
                    </Typography>
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      style={{ wordBreak: 'break-word' }}
                    >
                      {translateResult(position.attributes.result)}
                    </Typography>
                  </>
                )}
                {sections.conect && (
                  <>
                    <Typography variant="subtitle2" className={classes.sectionTitle}>
                      Conectividade
                    </Typography>
                    <Table size="small" className={classes.table}>
                      <TableBody>
                        <StatusRow name="Modelo" content={device.model || '—'} />
                        <StatusRow name="ID / IMEI" content={device.uniqueId} />
                        <StatusRow name="Telefone (chip)" content={device.phone || '—'} />
                        <StatusRow name="Protocolo" content={position.protocol || '—'} />
                        <StatusRow
                          name="Última comunicação"
                          content={formatTime(device.lastUpdate, 'seconds')}
                        />
                        <StatusRow
                          name="Status"
                          content={
                            device.status === 'online'
                              ? 'Conectado'
                              : device.status === 'offline'
                                ? 'Desconectado'
                                : 'Desconhecido'
                          }
                        />
                      </TableBody>
                    </Table>
                  </>
                )}
                {sections.perfil && (
                  <>
                    <Typography variant="subtitle2" className={classes.sectionTitle}>
                      Perfil
                    </Typography>
                    <Table size="small" className={classes.table}>
                      <TableBody>
                        <StatusRow name="Categoria" content={device.category || 'padrão'} />
                        {device.contact && <StatusRow name="Contato" content={device.contact} />}
                        {Object.entries(device.attributes || {})
                          .filter(([k]) => k !== 'deviceImage')
                          .map(([k, v]) => (
                            <StatusRow key={k} name={k} content={rawValue(v)} />
                          ))}
                      </TableBody>
                    </Table>
                  </>
                )}
                {sections.params && (
                  <>
                    <Typography variant="subtitle2" className={classes.sectionTitle}>
                      {`Parâmetros recebidos (${Object.keys(position.attributes).length})`}
                    </Typography>
                    <Table size="small" className={classes.table}>
                      <TableBody>
                        <StatusRow name="Válido (GPS)" content={rawValue(position.valid)} />
                        <StatusRow name="Latitude" content={position.latitude.toFixed(6)} />
                        <StatusRow name="Longitude" content={position.longitude.toFixed(6)} />
                        <StatusRow name="Altitude" content={`${Math.round(position.altitude)} m`} />
                        <StatusRow
                          name="Velocidade"
                          content={`${Math.round(position.speed * 1.852)} km/h`}
                        />
                        <StatusRow name="Direção" content={`${Math.round(position.course)}°`} />
                        {position.accuracy > 0 && (
                          <StatusRow
                            name="Precisão"
                            content={`${Math.round(position.accuracy)} m`}
                          />
                        )}
                        {Object.keys(position.attributes)
                          .sort()
                          .map((k) => (
                            <StatusRow
                              key={k}
                              name={k}
                              content={rawValue(position.attributes[k])}
                            />
                          ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      ) : (
        <CardContent style={{ textAlign: 'center' }}>
          <Typography variant="body2" style={{ color: c.textSecondary }}>
            Sem posição recebida ainda
          </Typography>
        </CardContent>
      )}
    </div>
  );

  return (
    <>
      <div className={desktop ? classes.root : classes.mobileRoot}>
        {device &&
          (desktop ? (
            <Rnd
              default={{
                x: savedPos.x,
                y: savedPos.y,
                width: savedSize.w || 360,
                height: savedSize.h || Math.min(window.innerHeight - 200, 940),
              }}
              onDragStop={(e, d) =>
                localStorage.setItem('lsCardPos', JSON.stringify({ x: d.x, y: d.y }))
              }
              onResizeStop={(e, dir, ref) =>
                localStorage.setItem(
                  'lsCardSize3',
                  JSON.stringify({ w: ref.offsetWidth, h: ref.offsetHeight }),
                )
              }
              minHeight={230}
              minWidth={300}
              maxWidth={620}
              enableResizing={{ bottom: true, right: true, bottomRight: true }}
              resizeHandleStyles={{ bottom: { height: '18px', bottom: 0 } }}
              resizeHandleComponent={{
                bottom: (
                  <div
                    style={{
                      width: '100%',
                      height: 18,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'ns-resize',
                    }}
                  >
                    <div
                      style={{ width: 48, height: 5, borderRadius: 3, backgroundColor: '#b6c2d2' }}
                    />
                  </div>
                ),
              }}
              dragHandleClassName="draggable-header"
              style={{ position: 'relative', pointerEvents: 'auto' }}
            >
              <Card elevation={3} className={classes.card}>
                {cardBody}
              </Card>
            </Rnd>
          ) : position ? (
            <LsVehicleSheet
              device={device}
              position={position}
              onClose={onClose}
              onMenu={deviceReadonly ? undefined : (e) => setAnchorEl(e.currentTarget)}
              canEdit={!deviceReadonly}
              disableActions={disableActions}
              canBlock={canBlock}
              blocked={blocked}
              sendCommand={sendCommand}
            />
          ) : (
            <Card elevation={3} className={classes.mobileCard}>
              {cardBody}
            </Card>
          ))}
      </div>
      <Menu
        anchorEl={settingsAnchor}
        open={Boolean(settingsAnchor)}
        onClose={() => setSettingsAnchor(null)}
      >
        {[
          ['speedo', 'Velocímetro'],
          ['sensores', 'Sensores'],
          ['resposta', 'Última resposta'],
          ['conect', 'Conectividade'],
          ['perfil', 'Perfil'],
          ['params', 'Parâmetros recebidos'],
          ['eventos', 'Alertas e eventos'],
        ].map(([key, label]) => (
          <MenuItem key={key} dense onClick={() => toggleSection(key)}>
            <Checkbox size="small" checked={!!sections[key]} style={{ padding: '0 8px 0 0' }} />
            {label}
          </MenuItem>
        ))}
      </Menu>
      {position && (
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <MenuItem
            onClick={() => navigate(`/stream?deviceId=${deviceId}`)}
            disabled={position.protocol !== 'jt808'}
          >
            {t('linkLiveVideo')}
          </MenuItem>
          {!readonly && <MenuItem onClick={handleGeofence}>{t('sharedCreateGeofence')}</MenuItem>}
          <MenuItem
            component="a"
            target="_blank"
            href={`https://www.google.com/maps/search/?api=1&query=${position.latitude}%2C${position.longitude}`}
          >
            {t('linkGoogleMaps')}
          </MenuItem>
          <MenuItem
            component="a"
            target="_blank"
            href={`http://maps.apple.com/?ll=${position.latitude},${position.longitude}`}
          >
            {t('linkAppleMaps')}
          </MenuItem>
          <MenuItem
            component="a"
            target="_blank"
            href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${position.latitude}%2C${position.longitude}&heading=${position.course}`}
          >
            {t('linkStreetView')}
          </MenuItem>
          {navigationAppTitle && navigationAppLink && (
            <MenuItem
              component="a"
              target="_blank"
              href={navigationAppLink
                .replace('{latitude}', position.latitude)
                .replace('{longitude}', position.longitude)}
            >
              {navigationAppTitle}
            </MenuItem>
          )}
          <MenuItem
            onClick={() => navigate(`/settings/device/${deviceId}/command`)}
            disabled={disableActions}
          >
            {t('commandTitle')}
          </MenuItem>
          <MenuItem
            onClick={() => navigate(`/settings/device/${deviceId}`)}
            disabled={disableActions || deviceReadonly}
          >
            {t('sharedEdit')}
          </MenuItem>
          {!shareDisabled && !user.temporary && (
            <MenuItem onClick={() => navigate(`/settings/device/${deviceId}/share`)}>
              <Typography color="secondary">{t('sharedShare')}</Typography>
            </MenuItem>
          )}
          <MenuItem onClick={() => setRemoving(true)} disabled={disableActions || deviceReadonly}>
            <Typography color="error">{t('sharedRemove')}</Typography>
          </MenuItem>
        </Menu>
      )}
      <RemoveDialog
        open={removing}
        endpoint="devices"
        itemId={deviceId}
        onResult={(removed) => handleRemove(removed)}
      />
      {fichaOpen && position && (
        <LsFichaCompleta device={device} position={position} onClose={() => setFichaOpen(false)} />
      )}
    </>
  );
};

export default StatusCard;
