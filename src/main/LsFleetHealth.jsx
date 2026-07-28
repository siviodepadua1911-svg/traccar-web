import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import BoltIcon from '@mui/icons-material/Bolt';
import SatelliteAltIcon from '@mui/icons-material/SatelliteAlt';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

dayjs.extend(relativeTime);

const RED = '#E24B4A';
const ORANGE = '#EF9F27';
const PURPLE = '#8A5CD6';

const useStyles = makeStyles()((theme) => ({
  root: {
    background: theme.palette.background.paper,
    borderRadius: 12,
    marginBottom: theme.spacing(2),
    overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(0,0,0,.08)',
  },
  head: {
    background: '#0F1E45',
    color: '#fff',
    padding: '12px 15px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  hic: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'rgba(255,255,255,.16)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cards: { display: 'flex', gap: 9, padding: 12, flexWrap: 'wrap' },
  card: {
    flex: 1,
    minWidth: 90,
    background: theme.palette.action.hover,
    borderRadius: 10,
    padding: '10px 8px',
    textAlign: 'center',
    borderTop: '3px solid',
  },
  num: { fontSize: 23, fontWeight: 800, lineHeight: 1 },
  lab: {
    fontSize: 10,
    color: theme.palette.text.secondary,
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: '.02em',
  },
  body: { padding: '0 13px 13px' },
  sec: {
    fontSize: 11,
    fontWeight: 700,
    color: theme.palette.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: '.04em',
    margin: '10px 2px 6px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    background: theme.palette.action.hover,
    borderRadius: 10,
    padding: '9px 12px',
    marginBottom: 7,
    cursor: 'pointer',
  },
  ico: {
    width: 32,
    height: 32,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 'none',
    color: '#fff',
  },
  name: { fontSize: 13.5, fontWeight: 600, color: theme.palette.text.primary },
  sub: { fontSize: 11, color: theme.palette.text.secondary },
  ok: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '14px 4px',
    color: '#1D9E75',
    fontWeight: 600,
    fontSize: 13.5,
  },
}));

const LsFleetHealth = ({ onOpen }) => {
  const { classes } = useStyles();
  const devices = useSelector((s) => s.devices.items);
  const positions = useSelector((s) => s.session.positions);

  const health = useMemo(() => {
    const list = Object.values(devices);
    let online = 0;
    const offline = [];
    const battery = [];
    const gps = [];
    list.forEach((d) => {
      const on = d.status === 'online';
      if (on) online += 1;
      if (!on) {
        offline.push(d);
        return;
      }
      const p = positions[d.id];
      if (!p) return;
      const at = p.attributes || {};
      if (at.power != null) {
        const v = Number(at.power);
        const sys24 = v > 18;
        const low = sys24 ? v < 23.5 : v < 11.8 && v > 5;
        if (low) battery.push({ d, info: `${v.toFixed(1)} V` });
      } else if (at.batteryLevel != null && Number(at.batteryLevel) < 20) {
        battery.push({ d, info: `${Math.round(Number(at.batteryLevel))}%` });
      }
      const satLow = at.sat != null && Number(at.sat) < 4;
      let rssiLow = false;
      if (at.rssi != null) {
        const rv = Number(at.rssi);
        rssiLow = Math.round((rv / (rv > 5 ? 31 : 5)) * 100) < 30;
      }
      if (satLow || rssiLow) {
        const bits = [];
        if (at.sat != null) bits.push(`${at.sat} sat`);
        gps.push({ d, info: bits.join(' · ') || 'sinal fraco' });
      }
    });
    return { total: list.length, online, offline, battery, gps };
  }, [devices, positions]);

  const problemas = health.offline.length + health.battery.length + health.gps.length;

  const renderRow = (d, icon, color, info) => (
    <div key={d.id} className={classes.row} onClick={() => onOpen && onOpen(d.id)}>
      <div className={classes.ico} style={{ background: color }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className={classes.name}>
          {d.name}
          {d.attributes && d.attributes.placa ? ` · ${d.attributes.placa}` : ''}
        </div>
        <div className={classes.sub}>{info}</div>
      </div>
      <ChevronRightIcon style={{ color: '#9aa4b2' }} />
    </div>
  );

  return (
    <div className={classes.root}>
      <div className={classes.head}>
        <div className={classes.hic}>
          <WarningAmberIcon fontSize="small" />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Saúde da frota</div>
          <div style={{ fontSize: 11, color: '#a9c4e8' }}>Veículos que precisam de atenção</div>
        </div>
      </div>

      <div className={classes.cards}>
        <div className={classes.card} style={{ borderTopColor: '#1C7ED6' }}>
          <div className={classes.num} style={{ color: '#1C7ED6' }}>
            {health.total}
          </div>
          <div className={classes.lab}>Total</div>
        </div>
        <div className={classes.card} style={{ borderTopColor: '#1D9E75' }}>
          <div className={classes.num} style={{ color: '#1D9E75' }}>
            {health.online}
          </div>
          <div className={classes.lab}>Online</div>
        </div>
        <div className={classes.card} style={{ borderTopColor: RED }}>
          <div className={classes.num} style={{ color: RED }}>
            {health.offline.length}
          </div>
          <div className={classes.lab}>Sem reportar</div>
        </div>
        <div className={classes.card} style={{ borderTopColor: ORANGE }}>
          <div className={classes.num} style={{ color: ORANGE }}>
            {health.battery.length}
          </div>
          <div className={classes.lab}>Bateria fraca</div>
        </div>
        <div className={classes.card} style={{ borderTopColor: PURPLE }}>
          <div className={classes.num} style={{ color: PURPLE }}>
            {health.gps.length}
          </div>
          <div className={classes.lab}>Sinal/GPS</div>
        </div>
      </div>

      <div className={classes.body}>
        {problemas === 0 && (
          <div className={classes.ok}>
            <CheckCircleIcon /> Tudo certo! Nenhum veículo precisa de atenção.
          </div>
        )}
        {health.offline.length > 0 && (
          <>
            <div className={classes.sec}>Sem reportar (offline)</div>
            {health.offline.map((d) =>
              renderRow(
                d,
                <WifiOffIcon fontSize="small" />,
                RED,
                `Última comunicação ${d.lastUpdate ? dayjs(d.lastUpdate).fromNow() : 'desconhecida'}`,
              ),
            )}
          </>
        )}
        {health.battery.length > 0 && (
          <>
            <div className={classes.sec}>Bateria fraca</div>
            {health.battery.map(({ d, info }) =>
              renderRow(d, <BoltIcon fontSize="small" />, ORANGE, `${info} — abaixo do normal`),
            )}
          </>
        )}
        {health.gps.length > 0 && (
          <>
            <div className={classes.sec}>Sinal / GPS ruim</div>
            {health.gps.map(({ d, info }) =>
              renderRow(d, <SatelliteAltIcon fontSize="small" />, PURPLE, info),
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LsFleetHealth;
