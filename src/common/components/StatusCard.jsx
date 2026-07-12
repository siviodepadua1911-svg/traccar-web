import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Rnd } from 'react-rnd';
import {
  Card,
  CardContent,
  Typography,
  CardActions,
  IconButton,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Menu,
  MenuItem,
  CardMedia,
  TableFooter,
  Link,
  Tooltip,
  Avatar,
  Checkbox,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import CloseIcon from '@mui/icons-material/Close';
import RouteIcon from '@mui/icons-material/Route';
import SendIcon from '@mui/icons-material/Send';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PendingIcon from '@mui/icons-material/Pending';
import SettingsIcon from '@mui/icons-material/Settings';
import KeyIcon from '@mui/icons-material/Key';
import BoltIcon from '@mui/icons-material/Bolt';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';
import PowerIcon from '@mui/icons-material/Power';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import SatelliteAltIcon from '@mui/icons-material/SatelliteAlt';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import { mapIconKey, mapIcons } from '../../map/core/preloadImages';

import { useTranslation } from './LocalizationProvider';
import RemoveDialog from './RemoveDialog';
import PositionValue from './PositionValue';
import { useDeviceReadonly, useRestriction } from '../util/permissions';
import usePositionAttributes from '../attributes/usePositionAttributes';
import { devicesActions } from '../../store';
import { useCatch, useCatchCallback } from '../../reactHelper';
import { useAttributePreference } from '../util/preferences';
import fetchOrThrow from '../util/fetchOrThrow';
import { formatTime } from '../util/formatter';

const useStyles = makeStyles()((theme, { desktopPadding }) => ({
  card: {
    pointerEvents: 'auto',
    width: '100%',
    maxWidth: 'calc(100vw - 16px)',
    height: '100%',
    maxHeight: 'calc(100vh - 170px)',
    display: 'flex',
    flexDirection: 'column',
    [theme.breakpoints.up('sm')]: {
      borderRadius: 0,
    },
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(1, 1, 0, 2),
    color: theme.palette.text.secondary,
  },
  media: {
    height: theme.dimensions.popupImageHeight,
    '& > div': {
      color: theme.palette.common.white,
      mixBlendMode: 'difference',
    },
  },
  content: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    flexGrow: 1,
    overflow: 'auto',
  },
  icon: {
    width: '25px',
    height: '25px',
    filter: 'brightness(0) invert(1)',
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
    color: theme.palette.primary.main,
  },
  actions: {
    justifyContent: 'space-between',
  },
  root: {
    pointerEvents: 'none',
    position: 'fixed',
    zIndex: 1300,
    [theme.breakpoints.up('sm')]: {
      left: '12px',
      top: '149px',
    },
    [theme.breakpoints.down('sm')]: {
      left: '50%',
      transform: 'translateX(-50%)',
      bottom: `calc(${theme.spacing(3)} + ${theme.dimensions.bottomBarHeight}px)`,
    },
  },
}));

const StatusRow = ({ name, content }) => {
  const { classes } = useStyles({ desktopPadding: 0 });

  return (
    <TableRow>
      <TableCell className={classes.cell}>
        <Typography variant="body2">{name}</Typography>
      </TableCell>
      <TableCell className={classes.cell}>
        <Typography variant="body2" color="textSecondary">
          {content}
        </Typography>
      </TableCell>
    </TableRow>
  );
};

const RESULT_DICT = [
  ['Cut off the fuel supply: Success', 'BLOQUEIO executado com sucesso'],
  ['Restore fuel supply: Success', 'DESBLOQUEIO executado com sucesso'],
  ['already in the state of fuel supply cut-off', 'Ja estava bloqueado'],
  ['The terminal will restart after 30 seconds', 'O rastreador vai reiniciar em 30 segundos'],
  ['GMT_OK', 'Fuso horario ajustado'],
  ['TIMER_OK', 'Intervalo de envio ajustado'],
  ['Charging', 'Carregando'],
  ['GPRS:Link Up', 'Dados: conectado'],
  ['NW Signal Level:strong', 'Sinal de rede: forte'],
  ['NW Signal Level:medium', 'Sinal de rede: medio'],
  ['NW Signal Level:weak', 'Sinal de rede: fraco'],
  ['GPS:FIXED', 'GPS: fixado'],
  ['SVS Used in fix:', 'Satelites em uso: '],
  ['GPS Signal Level:', 'Sinal dos satelites: '],
  ['ACC:ON', 'Ignicao: LIGADA'],
  ['ACC:OFF', 'Ignicao: DESLIGADA'],
  ['Defense:ON', 'Modo defesa: ativado'],
  ['Defense:OFF', 'Modo defesa: desativado'],
  ['Battery:', 'Bateria interna: '],
  ['Success', 'Sucesso'],
];

const translateResult = (text) => {
  let out = String(text);
  RESULT_DICT.forEach(([en, pt]) => {
    out = out.split(en).join(pt);
  });
  return out;
};

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

const Colored = ({ color, children }) => (
  <span style={{ color, fontWeight: 600 }}>{children}</span>
);

const SENSOR_ICON = { fontSize: 18, verticalAlign: 'text-bottom', marginRight: 8 };

const SensorRows = ({ position }) => {
  const a = position.attributes;
  const rows = [];
  if ('ignition' in a) {
    rows.push(['Ignição', <KeyIcon style={{ ...SENSOR_ICON, color: '#f9a825' }} />, a.ignition
      ? <Colored color={COLORS.ok}>Ligada</Colored>
      : <Colored color={COLORS.warn}>Desligada</Colored>]);
  }
  if ('blocked' in a) {
    rows.push(['Bloqueio', a.blocked ? <LockIcon style={{ ...SENSOR_ICON, color: '#e53935' }} /> : <LockOpenIcon style={{ ...SENSOR_ICON, color: '#43a047' }} />, a.blocked
      ? <Colored color={COLORS.bad}>BLOQUEADO</Colored>
      : <Colored color={COLORS.ok}>Liberado</Colored>]);
  }
  if ('motion' in a) {
    rows.push(['Movimento', <DirectionsRunIcon style={{ ...SENSOR_ICON, color: a.motion ? '#1e88e5' : '#90a4ae' }} />, a.motion
      ? <Colored color={COLORS.info}>Em movimento</Colored>
      : 'Parado']);
  }
  if ('power' in a) {
    const v = Number(a.power);
    const c = v >= 12.5 ? COLORS.ok : v >= 11.5 ? COLORS.warn : COLORS.bad;
    rows.push(['Bateria do veículo', <BoltIcon style={{ ...SENSOR_ICON, color: '#fb8c00' }} />, <Colored color={c}>{`${v.toFixed(2)} V`}</Colored>]);
  }
  if ('batteryLevel' in a) {
    const v = Number(a.batteryLevel);
    const c = v >= 60 ? COLORS.ok : v >= 20 ? COLORS.warn : COLORS.bad;
    rows.push(['Bateria interna', <BatteryFullIcon style={{ ...SENSOR_ICON, color: '#43a047' }} />, <Colored color={c}>{`${Math.round(v)}%`}</Colored>]);
  }
  if ('charge' in a) {
    rows.push(['Alimentação externa', <PowerIcon style={{ ...SENSOR_ICON, color: '#8e24aa' }} />, a.charge
      ? <Colored color={COLORS.ok}>Conectada (carregando)</Colored>
      : <Colored color={COLORS.warn}>Desconectada</Colored>]);
  }
  if ('rssi' in a) {
    const v = Number(a.rssi);
    const max = v > 5 ? 31 : 5;
    const pct = Math.round((v / max) * 100);
    const c = pct >= 70 ? COLORS.ok : pct >= 40 ? COLORS.warn : COLORS.bad;
    const label = pct >= 70 ? 'Forte' : pct >= 40 ? 'Médio' : 'Fraco';
    rows.push(['Sinal GSM', <SignalCellularAltIcon style={{ ...SENSOR_ICON, color: '#039be5' }} />, <Colored color={c}>{`${label} (${pct}%)`}</Colored>]);
  }
  if ('sat' in a) {
    const v = Number(a.sat);
    const c = v >= 5 ? COLORS.ok : v >= 3 ? COLORS.warn : COLORS.bad;
    rows.push(['Satélites GPS', <SatelliteAltIcon style={{ ...SENSOR_ICON, color: '#00897b' }} />, <Colored color={c}>{String(v)}</Colored>]);
  }
  if (a.alarm) {
    rows.push(['Alarme', <WarningAmberIcon style={{ ...SENSOR_ICON, color: '#e53935' }} />, <Colored color={COLORS.bad}>{String(a.alarm)}</Colored>]);
  }
  return rows.map(([name, icon, content]) => (
    <StatusRow key={name} name={<span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}{name}</span>} content={content} />
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
    <svg viewBox="0 0 220 190" style={{ display: 'block', width: '30%', maxWidth: 130, minWidth: 95, margin: '2px auto 0' }}>
      <circle cx="110" cy="110" r="100" fill="#23272e" stroke="#3d4451" strokeWidth="2" />
      <path d="M 33.8 154 A 88 88 0 0 1 166.6 42.6" fill="none" stroke="#2e7d32" strokeWidth="6" />
      <path d="M 166.6 42.6 A 88 88 0 0 1 196.7 125.3" fill="none" stroke="#ed6c02" strokeWidth="6" />
      <path d="M 196.7 125.3 A 88 88 0 0 1 186.2 154" fill="none" stroke="#d32f2f" strokeWidth="6" />
      {speedoTicks.map((tk) => (
        <g key={tk.v}>
          <line x1={tk.x1} y1={tk.y1} x2={tk.x2} y2={tk.y2} stroke="#e8eaed" strokeWidth="3" />
          <text x={tk.lx} y={tk.ly + 4} textAnchor="middle" fontSize="12" fill="#e8eaed">{tk.v}</text>
        </g>
      ))}
      <text x="110" y="152" textAnchor="middle" fontSize="30" fontWeight="500" fill="#ffffff">{shown}</text>
      <text x="110" y="170" textAnchor="middle" fontSize="11" fill="#9aa0a6">km/h</text>
      <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '110px 110px', transition: 'transform 0.8s ease' }}>
        <line x1="110" y1="124" x2="110" y2="42" stroke="#e53935" strokeWidth="4" strokeLinecap="round" />
      </g>
      <circle cx="110" cy="110" r="9" fill="#3d4451" />
      <circle cx="110" cy="110" r="3.5" fill="#e53935" />
    </svg>
  );
};

const StatusCard = ({ deviceId, position, onClose, disableActions, desktopPadding = 0 }) => {
  const { classes } = useStyles({ desktopPadding });
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const t = useTranslation();

  const readonly = useRestriction('readonly');
  const deviceReadonly = useDeviceReadonly();

  const shareDisabled = useSelector((state) => state.session.server.attributes.disableShare);
  const user = useSelector((state) => state.session.user);
  const device = useSelector((state) => state.devices.items[deviceId]);

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
  const [showAll, setShowAll] = useState(false);
  const [settingsAnchor, setSettingsAnchor] = useState(null);
  const [sections, setSections] = useState(() => ({
    speedo: true, sensores: true, resposta: true, conect: true, perfil: true, params: true,
    ...JSON.parse(localStorage.getItem('lsCardSections') || '{}'),
  }));
  const toggleSection = (key) => {
    const next = { ...sections, [key]: !sections[key] };
    setSections(next);
    localStorage.setItem('lsCardSections', JSON.stringify(next));
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
    await fetchOrThrow('/api/commands/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, type }),
    });
  });

  return (
    <>
      <div className={classes.root}>
        {device && (
          <Rnd
            default={{ x: savedPos.x, y: savedPos.y, width: savedSize.w || 360, height: savedSize.h || Math.min(window.innerHeight - 200, 940) }}
            onDragStop={(e, d) => localStorage.setItem('lsCardPos', JSON.stringify({ x: d.x, y: d.y }))}
            onResizeStop={(e, dir, ref) => localStorage.setItem('lsCardSize3', JSON.stringify({ w: ref.offsetWidth, h: ref.offsetHeight }))}
            minHeight={230}
            minWidth={300}
            maxWidth={620}
            enableResizing={{ bottom: true, right: true, bottomRight: true }}
            dragHandleClassName="draggable-header"
            style={{ position: 'relative', pointerEvents: 'auto' }}
          >
            <Card elevation={3} className={classes.card}>
              <div className="draggable-header" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 8px 0 16px', cursor: 'move' }}>
                <Avatar
                  src={deviceImage ? `/api/media/${device.uniqueId}/${deviceImage}` : undefined}
                  style={{ width: 56, height: 56, backgroundColor: '#eef2f8', border: '2px solid #c9d3e0' }}
                >
                  <img style={{ width: 34, height: 34 }} src={mapIcons[mapIconKey(device.category)]} alt="" />
                </Avatar>
                <div style={{ minWidth: 0, flexGrow: 1 }}>
                  <Typography variant="body1" noWrap style={{ fontWeight: 600, lineHeight: 1.2 }}>
                    {device.name}
                  </Typography>
                  <Typography variant="caption" style={{ display: 'block', fontWeight: 600, color: device.status === 'online' ? '#2e7d32' : '#d32f2f' }}>
                    {device.status === 'online' ? 'Conectado' : 'Desconectado'}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" noWrap style={{ display: 'block' }}>
                    {position && position.attributes.totalDistance != null ? `${Math.round(position.attributes.totalDistance / 1000).toLocaleString('pt-BR')} km` : ''}
                  </Typography>
                </div>
                <IconButton size="small" onClick={(e) => setSettingsAnchor(e.currentTarget)} style={{ alignSelf: 'flex-start' }}>
                  <SettingsIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={onClose} onTouchStart={onClose} style={{ alignSelf: 'flex-start' }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </div>
              {position && (
                <CardContent className={classes.content}>
                  {sections.speedo && <Speedometer speed={position.speed * 1.852} />}
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
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={2} className={classes.cell}>
                          <Typography variant="body2">
                            <Link component={RouterLink} to={`/position/${position.id}`}>
                              {t('sharedShowDetails')}
                            </Link>
                            {' · '}
                            <Link component="button" type="button" onClick={() => setShowAll(!showAll)}>
                              {showAll ? 'Ocultar ficha ▲' : 'Ficha completa ▼'}
                            </Link>
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                  {showAll && (
                    <>
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
                          <Typography variant="body2" color="textSecondary" style={{ wordBreak: 'break-word' }}>
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
                          <StatusRow name="Última comunicação" content={formatTime(device.lastUpdate, 'seconds')} />
                          <StatusRow name="Status" content={device.status === 'online' ? 'Conectado' : device.status === 'offline' ? 'Desconectado' : 'Desconhecido'} />
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
                          <StatusRow name="Velocidade" content={`${Math.round(position.speed * 1.852)} km/h`} />
                          <StatusRow name="Direção" content={`${Math.round(position.course)}°`} />
                          {position.accuracy > 0 && (
                            <StatusRow name="Precisão" content={`${Math.round(position.accuracy)} m`} />
                          )}
                          {Object.keys(position.attributes).sort().map((k) => (
                            <StatusRow key={k} name={k} content={rawValue(position.attributes[k])} />
                          ))}
                        </TableBody>
                      </Table>
                      </>
                      )}
                    </>
                  )}
                </CardContent>
              )}
              <CardActions className={classes.actions} disableSpacing>
                <Tooltip title={t('sharedExtra')}>
                  <IconButton
                    color="secondary"
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    disabled={!position}
                  >
                    <PendingIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('reportReplay')}>
                  <IconButton
                    onClick={() => navigate(`/replay?deviceId=${deviceId}`)}
                    disabled={disableActions || !position}
                  >
                    <RouteIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Bloquear">
                  <IconButton color="error" onClick={() => sendCommand('engineStop')} disabled={disableActions || !position}>
                    <LockIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Desbloquear">
                  <IconButton color="success" onClick={() => sendCommand('engineResume')} disabled={disableActions || !position}>
                    <LockOpenIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('commandTitle')}>
                  <IconButton
                    onClick={() => navigate(`/settings/device/${deviceId}/command`)}
                    disabled={disableActions}
                  >
                    <SendIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('sharedEdit')}>
                  <IconButton
                    onClick={() => navigate(`/settings/device/${deviceId}`)}
                    disabled={disableActions || deviceReadonly}
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('sharedRemove')}>
                  <IconButton
                    color="error"
                    onClick={() => setRemoving(true)}
                    disabled={disableActions || deviceReadonly}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </CardActions>
            </Card>
          </Rnd>
        )}
      </div>
      <Menu anchorEl={settingsAnchor} open={Boolean(settingsAnchor)} onClose={() => setSettingsAnchor(null)}>
        {[['speedo', 'Velocímetro'], ['sensores', 'Sensores'], ['resposta', 'Última resposta'], ['conect', 'Conectividade'], ['perfil', 'Perfil'], ['params', 'Parâmetros recebidos']].map(([key, label]) => (
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
          {!shareDisabled && !user.temporary && (
            <MenuItem onClick={() => navigate(`/settings/device/${deviceId}/share`)}>
              <Typography color="secondary">{t('sharedShare')}</Typography>
            </MenuItem>
          )}
        </Menu>
      )}
      <RemoveDialog
        open={removing}
        endpoint="devices"
        itemId={deviceId}
        onResult={(removed) => handleRemove(removed)}
      />
    </>
  );
};

export default StatusCard;
