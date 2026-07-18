import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { makeStyles } from 'tss-react/mui';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import NavigationIcon from '@mui/icons-material/Navigation';
import LocalParkingIcon from '@mui/icons-material/LocalParking';
import LockIcon from '@mui/icons-material/Lock';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import MapView, { map } from '../map/core/MapView';
import MapPositions from '../map/MapPositions';
import MapDefaultCamera from '../map/main/MapDefaultCamera';
import { devicesActions } from '../store';
import { formatTime } from '../common/util/formatter';

const EVENT_INFO = {
  deviceOverspeed: ['Excesso de velocidade', '#c62828'],
  deviceMoving: ['Comecou a se mover', '#1C7ED6'],
  deviceStopped: ['Parou', '#607d8b'],
  ignitionOn: ['Ignicao ligada', '#f08c00'],
  ignitionOff: ['Ignicao desligada', '#607d8b'],
  geofenceEnter: ['Entrou na cerca', '#1C7ED6'],
  geofenceExit: ['Saiu da cerca', '#1C7ED6'],
  deviceOnline: ['Conectou', '#2e7d32'],
  deviceOffline: ['Desconectou', '#90a4ae'],
  deviceInactive: ['Sem comunicacao', '#90a4ae'],
  deviceUnknown: ['Status desconhecido', '#90a4ae'],
  alarm: ['Alarme', '#c62828'],
  maintenance: ['Manutencao', '#f08c00'],
  deviceFuelDrop: ['Queda de combustivel', '#c62828'],
  commandResult: ['Resposta de comando', '#607d8b'],
  driverChanged: ['Troca de motorista', '#607d8b'],
};
const eventInfo = (type) => EVENT_INFO[type] || [type, '#607d8b'];

const useStyles = makeStyles()((theme) => ({
  root: {
    minHeight: '100%',
    boxSizing: 'border-box',
    padding: theme.spacing(2),
    background: '#f4f6f9',
    fontFamily: 'Inter, Roboto, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: theme.spacing(1.5),
  },
  title: { fontSize: 20, fontWeight: 600, color: '#0d2a5c' },
  sub: { fontSize: 12, color: '#90a4ae', textTransform: 'capitalize' },
  cards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: theme.spacing(1.25),
    marginBottom: theme.spacing(1.5),
    [theme.breakpoints.down('lg')]: { gridTemplateColumns: 'repeat(3, 1fr)' },
    [theme.breakpoints.down('sm')]: { gridTemplateColumns: 'repeat(2, 1fr)' },
  },
  card: {
    background: '#fff',
    border: '1px solid #e3e8ef',
    borderRadius: 12,
    padding: theme.spacing(1.25, 1.5),
  },
  cardLabel: { display: 'flex', alignItems: 'center', gap: 6, color: '#607d8b', fontSize: 12 },
  cardValue: { fontSize: 26, fontWeight: 700, color: '#0d2a5c', marginTop: 4, lineHeight: 1 },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 1fr',
    gap: theme.spacing(1.5),
    alignItems: 'start',
    [theme.breakpoints.down('md')]: { gridTemplateColumns: '1fr' },
  },
  panel: {
    background: '#fff',
    border: '1px solid #e3e8ef',
    borderRadius: 12,
    padding: theme.spacing(1.5, 1.75),
  },
  panelTitle: {
    fontWeight: 600,
    fontSize: 14,
    color: '#0d2a5c',
    marginBottom: 6,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mapBox: {
    position: 'relative',
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    border: '1px solid #e3e8ef',
    marginBottom: theme.spacing(1.5),
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: theme.spacing(1, 0),
    borderTop: '1px solid #eef1f5',
    cursor: 'pointer',
  },
  dot: { width: 9, height: 9, borderRadius: '50%', flex: 'none' },
  name: { fontSize: 13, color: '#263238', fontWeight: 500 },
  muted: { fontSize: 11, color: '#90a4ae' },
  badge: {
    background: '#c62828',
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 20,
    padding: '1px 8px',
  },
  empty: { color: '#90a4ae', fontSize: 13, padding: theme.spacing(2, 0), textAlign: 'center' },
}));

// Mesmo colapso/anti-eco dos toasts: respostas de comando iguais em sequência
// do mesmo aparelho viram 1 só (a mais recente) com um contador "×N".
const collapseRepeatedCommandResults = (list) => {
  const out = [];
  list.forEach((e) => {
    const last = out[out.length - 1];
    const sameAsLast =
      last &&
      e.type === 'commandResult' &&
      last.type === 'commandResult' &&
      last.deviceId === e.deviceId &&
      (last.attributes?.result || '') === (e.attributes?.result || '');
    if (sameAsLast) {
      last.repeatCount = (last.repeatCount || 1) + 1;
    } else {
      out.push({ ...e, repeatCount: 1 });
    }
  });
  return out;
};

const kmh = (p) => Math.round(((p && p.speed) || 0) * 1.852);
const isMoving = (p) => !!(p && (p.attributes.motion === true || kmh(p) > 3));
const hhmm = (v) => new Date(v).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const DashboardPage = () => {
  const { classes } = useStyles();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const devices = useSelector((state) => state.devices.items);
  const positions = useSelector((state) => state.session.positions);

  const deviceList = useMemo(() => Object.values(devices), [devices]);
  const fleetPositions = useMemo(() => Object.values(positions), [positions]);
  const deviceCount = deviceList.length;

  const stats = useMemo(() => {
    let online = 0;
    let movimento = 0;
    let parados = 0;
    let bloqueados = 0;
    let semSinal = 0;
    deviceList.forEach((d) => {
      const p = positions[d.id];
      if (d.status === 'online') {
        online += 1;
        if (isMoving(p)) movimento += 1;
        else parados += 1;
      } else {
        semSinal += 1;
      }
      if (p && p.attributes && p.attributes.blocked) bloqueados += 1;
    });
    return { total: deviceList.length, online, movimento, parados, bloqueados, semSinal };
  }, [deviceList, positions]);

  const [events, setEvents] = useState([]);
  useEffect(() => {
    if (!deviceCount) return;
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const params = new URLSearchParams();
    params.append('from', from.toISOString());
    params.append('to', new Date().toISOString());
    deviceList.forEach((d) => params.append('deviceId', d.id));
    params.append('type', 'allEvents');
    fetch(`/api/reports/events?${params.toString()}`, { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const reversed = Array.isArray(data) ? data.slice().reverse() : [];
        setEvents(collapseRepeatedCommandResults(reversed).slice(0, 15));
      })
      .catch(() => {});
  }, [deviceCount]);

  const mapBoxRef = useRef(null);
  useEffect(() => {
    const resize = () => {
      try {
        map.resize();
      } catch {
        /* noop */
      }
    };
    const t1 = setTimeout(resize, 250);
    const t2 = setTimeout(resize, 700);
    let ro;
    if (mapBoxRef.current && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(resize);
      ro.observe(mapBoxRef.current);
    }
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (ro) ro.disconnect();
    };
  }, []);

  const openDevice = useCallback(
    (id) => {
      dispatch(devicesActions.selectId(id));
      navigate('/');
    },
    [dispatch, navigate],
  );
  const onMarkerClick = useCallback((_, deviceId) => openDevice(deviceId), [openDevice]);

  const statusOf = (d) => {
    const p = positions[d.id];
    if (d.status !== 'online') return ['#90a4ae', 'Offline', '--'];
    if (p && p.attributes && p.attributes.blocked)
      return ['#c62828', 'Bloqueado', `${kmh(p)} km/h`];
    if (isMoving(p)) return ['#1C7ED6', 'Movimento', `${kmh(p)} km/h`];
    return ['#2e7d32', 'Parado', '0 km/h'];
  };

  const sorted = useMemo(() => {
    const rank = (d) => {
      const p = positions[d.id];
      if (d.status !== 'online') return 3;
      if (p && p.attributes && p.attributes.blocked) return 0;
      if (isMoving(p)) return 1;
      return 2;
    };
    return [...deviceList].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  }, [deviceList, positions]);

  const cards = [
    [DirectionsCarIcon, '#1C7ED6', 'Veiculos', stats.total],
    [WifiIcon, '#2e7d32', 'Online', stats.online],
    [NavigationIcon, '#1C7ED6', 'Movimento', stats.movimento],
    [LocalParkingIcon, '#f08c00', 'Parados', stats.parados],
    [LockIcon, '#c62828', 'Bloqueados', stats.bloqueados],
    [WifiOffIcon, '#90a4ae', 'Sem sinal', stats.semSinal],
  ];

  const dataStr = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div className={classes.root}>
      <div className={classes.header}>
        <div className={classes.title}>Painel</div>
        <div className={classes.sub}>{dataStr}</div>
      </div>

      <div className={classes.cards}>
        {cards.map(([Icon, color, label, value]) => (
          <div className={classes.card} key={label}>
            <div className={classes.cardLabel}>
              <Icon sx={{ color, fontSize: 18 }} />
              {label}
            </div>
            <div className={classes.cardValue}>{value}</div>
          </div>
        ))}
      </div>

      <div className={classes.grid}>
        <div>
          <div className={classes.mapBox} ref={mapBoxRef}>
            <MapView>
              <MapPositions positions={fleetPositions} onMarkerClick={onMarkerClick} showStatus />
              <MapDefaultCamera filteredPositions={fleetPositions} />
            </MapView>
          </div>

          <div className={classes.panel}>
            <div className={classes.panelTitle}>
              Frota
              <span
                style={{ fontSize: 11, color: '#1C7ED6', fontWeight: 500 }}
              >{`${deviceCount} veiculo(s)`}</span>
            </div>
            {sorted.length === 0 && <div className={classes.empty}>Nenhum veiculo cadastrado</div>}
            {sorted.map((d) => {
              const [dot, label, extra] = statusOf(d);
              const p = positions[d.id];
              return (
                <div className={classes.row} key={d.id} onClick={() => openDevice(d.id)}>
                  <span className={classes.dot} style={{ background: dot }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={classes.name}>{d.name}</div>
                    <div className={classes.muted}>
                      {p ? formatTime(p.fixTime, 'seconds') : 'sem posicao'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: '#455a64' }}>{extra}</div>
                    <div style={{ fontSize: 10.5, color: dot }}>{label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={classes.panel}>
          <div className={classes.panelTitle}>
            Alertas de hoje
            {events.length > 0 && <span className={classes.badge}>{events.length}</span>}
          </div>
          {events.length === 0 && <div className={classes.empty}>Nenhum alerta hoje</div>}
          {events.map((e) => {
            const [label, color] = eventInfo(e.type);
            const dev = devices[e.deviceId];
            return (
              <div className={classes.row} key={e.id} onClick={() => openDevice(e.deviceId)}>
                <NotificationsNoneIcon sx={{ color, fontSize: 18 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: '#263238' }}>
                    {label}
                    {e.repeatCount > 1 && (
                      <span
                        style={{ marginLeft: 6, fontSize: 11, color: '#90a4ae', fontWeight: 600 }}
                      >
                        {`×${e.repeatCount}`}
                      </span>
                    )}
                  </div>
                  <div className={classes.muted}>{dev ? dev.name : ''}</div>
                </div>
                <div className={classes.muted}>{hhmm(e.eventTime)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
