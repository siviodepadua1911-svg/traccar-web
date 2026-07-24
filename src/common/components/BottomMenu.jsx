import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { Paper, Badge, useMediaQuery } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import MapIcon from '@mui/icons-material/Map';
import RouteIcon from '@mui/icons-material/Route';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DescriptionIcon from '@mui/icons-material/Description';
import FenceIcon from '@mui/icons-material/Fence';
import MenuIcon from '@mui/icons-material/Menu';
import { useRestriction } from '../util/permissions';
import { lsCardColors } from '../theme/lsCardColors';
import LsAlertsDialog from './LsAlertsDialog';

const useStyles = makeStyles()(() => ({
  scroll: {
    display: 'flex',
    overflowX: 'auto',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    WebkitOverflowScrolling: 'touch',
    '&::-webkit-scrollbar': { display: 'none' },
  },
  item: {
    flex: '0 0 auto',
    minWidth: 70,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    padding: '7px 12px 6px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    borderTop: '2px solid transparent',
    fontFamily: 'inherit',
    transition: 'color .15s',
  },
  label: { fontSize: 10.5, whiteSpace: 'nowrap', lineHeight: 1.1 },
  fade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 22,
    pointerEvents: 'none',
  },
}));

const BottomMenu = () => {
  const { classes } = useStyles();
  const navigate = useNavigate();
  const location = useLocation();

  const readonly = useRestriction('readonly');
  const disableReports = useRestriction('disableReports');
  const devices = useSelector((state) => state.devices.items);
  const user = useSelector((state) => state.session.user);
  const server = useSelector((state) => state.session.server);
  const socket = useSelector((state) => state.session.socket);
  const events = useSelector((state) => state.events.items);
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);
  const device = devices[selectedDeviceId];

  const [alertsOpen, setAlertsOpen] = useState(false);

  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const dark =
    user?.attributes?.darkMode !== undefined
      ? user.attributes.darkMode
      : server?.attributes?.darkMode !== undefined
        ? server.attributes.darkMode
        : prefersDark;
  const c = lsCardColors(dark);
  const ACTIVE = '#85B7EB';

  const current = (() => {
    const p = location.pathname;
    if (p.startsWith('/settings/notification')) return 'alerts';
    if (p.startsWith('/reports')) return 'reports';
    if (p.startsWith('/geofence')) return 'cerca';
    if (p.startsWith('/replay')) return 'replay';
    if (p.startsWith('/settings')) return 'menu';
    if (p === '/') return 'map';
    return null;
  })();

  const replayTarget = () => {
    let id = selectedDeviceId;
    if (id == null) {
      const ids = Object.keys(devices);
      if (ids.length === 1) id = ids[0];
    }
    return id != null ? `/replay?deviceId=${id}` : '/replay';
  };

  const openAlertas = () => setAlertsOpen(true);

  const items = [
    {
      key: 'map',
      label: 'Mapa',
      icon: <MapIcon />,
      go: () => navigate('/'),
      dot: socket === false,
    },
    !disableReports && {
      key: 'replay',
      label: 'Trajeto',
      icon: <RouteIcon />,
      go: () => navigate(replayTarget()),
    },
    {
      key: 'alerts',
      label: 'Alertas',
      icon: <NotificationsIcon />,
      go: openAlertas,
      dot: events.length > 0 && current !== 'alerts' && !alertsOpen,
    },
    !disableReports && {
      key: 'reports',
      label: 'Relatorios',
      icon: <DescriptionIcon />,
      go: () => navigate('/reports'),
    },
    !readonly && {
      key: 'cerca',
      label: 'Criar cerca',
      icon: <FenceIcon />,
      go: () => navigate('/geofences'),
    },
    {
      key: 'menu',
      label: readonly ? 'Conta' : 'Menu',
      icon: <MenuIcon />,
      go: () => navigate('/settings/preferences?menu=true'),
    },
  ].filter(Boolean);

  return (
    <>
      <Paper
        square
        elevation={3}
        style={{ position: 'relative', background: c.surface, borderTop: `1px solid ${c.border}` }}
      >
        <div className={classes.scroll}>
          {items.map((it) => {
            const on = current === it.key;
            return (
              <button
                key={it.key}
                type="button"
                className={classes.item}
                onClick={it.go}
                style={{
                  color: on ? ACTIVE : c.textSecondary,
                  borderTopColor: on ? ACTIVE : 'transparent',
                }}
              >
                <Badge color="error" variant="dot" overlap="circular" invisible={!it.dot}>
                  {it.icon}
                </Badge>
                <span className={classes.label} style={{ fontWeight: on ? 700 : 500 }}>
                  {it.label}
                </span>
              </button>
            );
          })}
        </div>
        <div
          className={classes.fade}
          style={{ background: `linear-gradient(to right, ${c.surface}00, ${c.surface})` }}
        />
      </Paper>
      {alertsOpen && (
        <LsAlertsDialog
          deviceId={selectedDeviceId}
          deviceName={device ? device.name : ''}
          device={device}
          onClose={() => setAlertsOpen(false)}
        />
      )}
    </>
  );
};

export default BottomMenu;
