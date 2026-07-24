import { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { makeStyles } from 'tss-react/mui';
import { Select, MenuItem, FormControl } from '@mui/material';
import dayjs from 'dayjs';
import RouteIcon from '@mui/icons-material/Route';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SpeedIcon from '@mui/icons-material/Speed';
import NotificationsIcon from '@mui/icons-material/Notifications';
import FenceIcon from '@mui/icons-material/Fence';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import VisibilityIcon from '@mui/icons-material/Visibility';

const TYPES = [
  ['combined', 'Percurso', 'Onde o veiculo andou', RouteIcon, null],
  ['trips', 'Viagens', 'Saida, chegada, distancia', AltRouteIcon, null],
  ['stops', 'Paradas', 'Onde parou e quanto tempo', PauseCircleIcon, null],
  ['summary', 'Resumo', 'Km e velocidade maxima', AssessmentIcon, null],
  ['chart', 'Velocidade', 'Velocidade ao longo do dia', SpeedIcon, 'speed'],
  ['events', 'Alertas', 'Historico de avisos', NotificationsIcon, null],
  ['geofences', 'Cercas', 'Entradas e saidas', FenceIcon, null],
  ['chart', 'Grafico', 'Velocidade / altitude', ShowChartIcon, null],
];

const PERIODS = [
  ['today', 'Hoje'],
  ['yesterday', 'Ontem'],
  ['last7', '7 dias'],
  ['thisMonth', 'Este mes'],
  ['custom', 'Datas'],
];

const range = (period) => {
  switch (period) {
    case 'today':
      return [dayjs().startOf('day'), dayjs().endOf('day')];
    case 'yesterday':
      return [dayjs().subtract(1, 'day').startOf('day'), dayjs().subtract(1, 'day').endOf('day')];
    case 'last7':
      return [dayjs().subtract(6, 'day').startOf('day'), dayjs().endOf('day')];
    case 'thisMonth':
      return [dayjs().startOf('month'), dayjs().endOf('month')];
    default:
      return null;
  }
};

const useStyles = makeStyles()((theme) => ({
  root: {
    minHeight: '100%',
    boxSizing: 'border-box',
    padding: theme.spacing(2),
    background: '#f4f6f9',
    fontFamily: 'Inter, Roboto, sans-serif',
  },
  title: { fontSize: 20, fontWeight: 600, color: '#0d2a5c', marginBottom: theme.spacing(1) },
  lab: {
    fontSize: 11.5,
    fontWeight: 700,
    color: '#0d2a5c',
    margin: theme.spacing(2, 0, 1),
    textTransform: 'uppercase',
    letterSpacing: '.03em',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 10,
    [theme.breakpoints.down('md')]: { gridTemplateColumns: 'repeat(2, 1fr)' },
  },
  card: {
    background: '#fff',
    border: '1.5px solid #e6eaf0',
    borderRadius: 13,
    padding: theme.spacing(1.5, 1.25),
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    transition: 'all .12s',
  },
  cardOn: { borderColor: '#1C7ED6', background: '#f2f8ff' },
  cardName: { fontSize: 13.5, fontWeight: 600, color: '#16233a' },
  cardDesc: { fontSize: 10.5, color: '#90a4ae', lineHeight: 1.25 },
  chips: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  chip: {
    fontSize: 12.5,
    padding: theme.spacing(1, 1.75),
    borderRadius: 22,
    background: '#fff',
    color: '#5b6b82',
    border: '1.5px solid #e1e7f0',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  },
  chipOn: { background: '#0d2a5c', color: '#fff', borderColor: '#0d2a5c', fontWeight: 600 },
  go: {
    marginTop: theme.spacing(2.5),
    background: '#0d2a5c',
    color: '#fff',
    textAlign: 'center',
    borderRadius: 12,
    padding: theme.spacing(1.75),
    fontWeight: 700,
    fontSize: 15,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    border: 'none',
    width: '100%',
    fontFamily: 'inherit',
    '&:disabled': { opacity: 0.5, cursor: 'default' },
  },
  device: { background: '#fff', borderRadius: 10 },
}));

const ReportsHomePage = () => {
  const { classes, cx } = useStyles();
  const navigate = useNavigate();
  const devices = useSelector((state) => state.devices.items);
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);
  const deviceList = useMemo(() => Object.values(devices), [devices]);

  const [deviceId, setDeviceId] = useState(
    selectedDeviceId || (deviceList[0] && deviceList[0].id) || '',
  );
  const [typeIdx, setTypeIdx] = useState(0);
  const [period, setPeriod] = useState('today');

  const handleGo = () => {
    const route = TYPES[typeIdx][0];
    const extra = TYPES[typeIdx][4];
    const params = new URLSearchParams();
    if (deviceId) params.append('deviceId', String(deviceId));
    const r = range(period);
    if (r) {
      params.set('from', r[0].toISOString());
      params.set('to', r[1].toISOString());
    }
    if (extra) params.set('type', extra);
    navigate(`/reports/${route}?${params.toString()}`);
  };

  return (
    <div className={classes.root}>
      <div className={classes.title}>Relatorios</div>

      <div className={classes.lab}>Veiculo</div>
      <FormControl fullWidth size="small">
        <Select
          className={classes.device}
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          displayEmpty
        >
          {deviceList.length === 0 && <MenuItem value="">Nenhum veiculo</MenuItem>}
          {deviceList.map((d) => (
            <MenuItem key={d.id} value={d.id}>
              {d.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <div className={classes.lab}>O que voce quer ver?</div>
      <div className={classes.grid}>
        {TYPES.map((it, i) => {
          const Icon = it[3];
          return (
            <div
              key={it[1]}
              className={cx(classes.card, i === typeIdx && classes.cardOn)}
              onClick={() => setTypeIdx(i)}
            >
              <Icon sx={{ color: '#1C7ED6', fontSize: 22 }} />
              <div className={classes.cardName}>{it[1]}</div>
              <div className={classes.cardDesc}>{it[2]}</div>
            </div>
          );
        })}
      </div>

      <div className={classes.lab}>Periodo</div>
      <div className={classes.chips}>
        {PERIODS.map(([key, label]) => (
          <div
            key={key}
            className={cx(classes.chip, period === key && classes.chipOn)}
            onClick={() => setPeriod(key)}
          >
            {key === 'custom' && <CalendarMonthIcon sx={{ fontSize: 15 }} />}
            {label}
          </div>
        ))}
      </div>

      <button type="button" className={classes.go} onClick={handleGo} disabled={!deviceId}>
        <VisibilityIcon sx={{ fontSize: 20 }} />
        Ver relatorio
      </button>
    </div>
  );
};

export default ReportsHomePage;
