import { useDispatch, useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';
import {
  Tooltip,
  Avatar,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Typography,
} from '@mui/material';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';
import ErrorIcon from '@mui/icons-material/Error';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import KeyIcon from '@mui/icons-material/Key';
import BoltIcon from '@mui/icons-material/Bolt';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import SatelliteAltIcon from '@mui/icons-material/SatelliteAlt';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { devicesActions } from '../store';
import { formatAlarm, formatStatus, getStatusColor } from '../common/util/formatter';
import { useTranslation } from '../common/components/LocalizationProvider';
import { mapIconKey, mapIcons } from '../map/core/preloadImages';
import { useAdministrator } from '../common/util/permissions';
import { useAttributePreference } from '../common/util/preferences';
import GeofencesValue from '../common/components/GeofencesValue';
import DriverValue from '../common/components/DriverValue';
import MotionBar from './components/MotionBar';

dayjs.extend(relativeTime);

const useStyles = makeStyles()((theme) => ({
  icon: {
    width: '30px',
    height: '30px',
  },
  avatar: {
    backgroundColor: '#eef2f8',
  },
  statusLine: {
    display: 'block',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  success: {
    color: theme.palette.success.main,
  },
  warning: {
    color: theme.palette.warning.main,
  },
  error: {
    color: theme.palette.error.main,
  },
  neutral: {
    color: theme.palette.neutral.main,
  },
  selected: {
    backgroundColor: '#eaf2fd !important',
    boxShadow: 'inset 3px 0 0 #1C7ED6',
  },
  blocked: {
    boxShadow: 'inset 4px 0 0 #d32f2f',
  },
}));

const I = { fontSize: 18 };
const C = {
  ok: '#2e7d32',
  warn: '#ed6c02',
  bad: '#d32f2f',
  off: '#90a4ae',
  amber: '#f9a825',
  blue: '#1e88e5',
};

const DeviceRow = ({ devices, index, style }) => {
  const { classes } = useStyles();
  const dispatch = useDispatch();
  const t = useTranslation();

  const admin = useAdministrator();
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);

  const item = devices[index];
  const position = useSelector((state) => state.session.positions[item.id]);

  const devicePrimary = useAttributePreference('devicePrimary', 'name');
  const deviceSecondary = useAttributePreference('deviceSecondary', '');

  const resolveFieldValue = (field) => {
    if (field === 'geofenceIds') {
      const geofenceIds = position?.geofenceIds;
      return geofenceIds?.length ? <GeofencesValue geofenceIds={geofenceIds} /> : null;
    }
    if (field === 'driverUniqueId') {
      const driverUniqueId = position?.attributes?.driverUniqueId;
      return driverUniqueId ? <DriverValue driverUniqueId={driverUniqueId} /> : null;
    }
    if (field === 'motion') {
      return <MotionBar deviceId={item.id} />;
    }
    return item[field];
  };

  const primaryValue = resolveFieldValue(devicePrimary);
  const secondaryValue = resolveFieldValue(deviceSecondary);

  const secondaryText = () => {
    let status;
    if (item.status === 'online' || !item.lastUpdate) {
      status = formatStatus(item.status, t);
    } else {
      status = dayjs(item.lastUpdate).fromNow();
    }
    return (
      <span className={classes.statusLine}>
        {secondaryValue && (
          <>
            {secondaryValue}
            {' • '}
          </>
        )}
        <span className={classes[getStatusColor(item.status)]}>{status}</span>
      </span>
    );
  };

  const a = position ? position.attributes : {};
  const kmh = position ? Math.round((position.speed || 0) * 1.852) : 0;
  const blocked = Boolean(a.blocked);

  return (
    <div style={style}>
      <ListItemButton
        key={item.id}
        onClick={() => dispatch(devicesActions.selectId(item.id))}
        disabled={!admin && item.disabled}
        selected={selectedDeviceId === item.id}
        className={
          selectedDeviceId === item.id
            ? classes.selected
            : blocked
              ? classes.blocked
              : null
        }
      >
        <ListItemAvatar>
          <Avatar className={classes.avatar}>
            <img className={classes.icon} src={mapIcons[mapIconKey(item.category)]} alt="" />
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={primaryValue}
          secondary={secondaryText()}
          slots={{
            primary: Typography,
            secondary: Typography,
          }}
          slotProps={{
            primary: { noWrap: true },
            secondary: { component: 'div' },
          }}
        />
        {position && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <Tooltip title={`Conexão: ${formatStatus(item.status, t)}`}>
              {item.status === 'online' ? (
                <WifiIcon style={{ ...I, color: C.ok }} />
              ) : (
                <WifiOffIcon style={{ ...I, color: C.bad }} />
              )}
            </Tooltip>
            {a.hasOwnProperty('ignition') && (
              <Tooltip title={`Ignição: ${a.ignition ? 'Ligada' : 'Desligada'}`}>
                <KeyIcon style={{ ...I, color: a.ignition ? C.amber : C.off }} />
              </Tooltip>
            )}
            {a.hasOwnProperty('motion') && (
              <Tooltip title={`Movimento: ${a.motion ? 'Em movimento' : 'Parado'} • ${kmh} km/h`}>
                <DirectionsRunIcon style={{ ...I, color: a.motion ? C.blue : C.off }} />
              </Tooltip>
            )}
            {a.hasOwnProperty('blocked') &&
              (a.blocked ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    background: C.bad,
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 11,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <LockIcon style={{ fontSize: 13 }} />
                  Bloqueado
                </span>
              ) : (
                <Tooltip title="Bloqueio: Liberado">
                  <LockOpenIcon style={{ ...I, color: C.ok }} />
                </Tooltip>
              ))}
            {a.power != null && (
              <Tooltip title={`Bateria do veículo: ${Number(a.power).toFixed(1)}V`}>
                <BoltIcon
                  style={{
                    ...I,
                    color:
                      Number(a.power) >= 12.5 ? C.ok : Number(a.power) >= 11.5 ? C.warn : C.bad,
                  }}
                />
              </Tooltip>
            )}
            {a.batteryLevel != null && (
              <Tooltip title={`Bateria interna: ${Math.round(Number(a.batteryLevel))}%`}>
                <BatteryFullIcon
                  style={{
                    ...I,
                    color:
                      Number(a.batteryLevel) >= 60
                        ? C.ok
                        : Number(a.batteryLevel) >= 20
                          ? C.warn
                          : C.bad,
                  }}
                />
              </Tooltip>
            )}
            {a.rssi != null &&
              (() => {
                const v = Number(a.rssi);
                const pct = Math.round((v / (v > 5 ? 31 : 5)) * 100);
                const cor = pct >= 70 ? C.ok : pct >= 40 ? C.warn : C.bad;
                const rotulo = pct >= 70 ? 'Forte' : pct >= 40 ? 'Médio' : 'Fraco';
                return (
                  <Tooltip title={`Sinal GSM: ${rotulo} (${pct}%)`}>
                    <SignalCellularAltIcon style={{ ...I, color: cor }} />
                  </Tooltip>
                );
              })()}
            {a.sat != null && (
              <Tooltip title={`Satélites GPS: ${a.sat}`}>
                <SatelliteAltIcon
                  style={{
                    ...I,
                    color: Number(a.sat) >= 5 ? C.ok : Number(a.sat) >= 3 ? C.warn : C.bad,
                  }}
                />
              </Tooltip>
            )}
            {a.hasOwnProperty('alarm') && (
              <Tooltip title={`${t('eventAlarm')}: ${formatAlarm(a.alarm, t)}`}>
                <ErrorIcon style={{ ...I, color: C.bad }} />
              </Tooltip>
            )}
          </span>
        )}
      </ListItemButton>
    </div>
  );
};

export default DeviceRow;
