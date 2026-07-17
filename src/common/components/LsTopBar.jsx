import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Button, Menu, MenuItem, Typography, Avatar } from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DescriptionIcon from '@mui/icons-material/Description';
import DrawIcon from '@mui/icons-material/Draw';
import PersonIcon from '@mui/icons-material/Person';
import NotificationsIcon from '@mui/icons-material/Notifications';
import BadgeIcon from '@mui/icons-material/Badge';
import DnsIcon from '@mui/icons-material/Dns';
import SettingsIcon from '@mui/icons-material/Settings';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { sessionActions } from '../../store';
import { useRestriction, useAdministrator, useManager } from '../util/permissions';
import useFeatures from '../util/useFeatures';
import { nativePostMessage } from './NativeInterface';

const AZUL = '#0F1E45';

const LsTopBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const user = useSelector((state) => state.session.user);
  const lsMenu = user.attributes ? user.attributes.lsMenu : '';
  const supportLink = useSelector((state) => state.session.server.attributes.support);
  const readonly = useRestriction('readonly');
  const disableReports = useRestriction('disableReports');
  const admin = useAdministrator();
  const manager = useManager();
  const features = useFeatures();

  const [menu, setMenu] = useState({ el: null, key: null });
  const open = (event, key) => setMenu({ el: event.currentTarget, key });
  const close = () => setMenu({ el: null, key: null });
  const go = (path) => {
    close();
    navigate(path);
  };

  const at = (prefix) => location.pathname.startsWith(prefix);

  const handleLogout = async () => {
    close();
    await fetch('/api/session', { method: 'DELETE' });
    nativePostMessage('logout');
    navigate('/login');
    dispatch(sessionActions.updateUser(null));
  };

  const items = [
    {
      k: 'dash',
      label: 'Dashboard',
      icon: <DashboardIcon />,
      onClick: () => go('/dashboard'),
      active: location.pathname === '/dashboard',
    },
    {
      k: 'map',
      label: 'Monitoramento',
      icon: <MapIcon />,
      onClick: () => go('/'),
      active: location.pathname === '/',
    },
    !disableReports && {
      k: 'rel',
      label: 'Relatórios',
      icon: <DescriptionIcon />,
      onClick: (e) => open(e, 'rel'),
      active: at('/reports') || location.pathname === '/replay',
      menu: true,
    },
    !readonly && {
      k: 'geo',
      label: 'Cercas eletrônicas',
      icon: <DrawIcon />,
      onClick: () => go('/geofences'),
      active: at('/geofence'),
    },
    !readonly &&
      !features.disableDrivers && {
        k: 'drv',
        label: 'Motoristas',
        icon: <PersonIcon />,
        onClick: () => go('/settings/drivers'),
        active: at('/settings/driver'),
      },
    !readonly && {
      k: 'not',
      label: 'Alertas',
      icon: <NotificationsIcon />,
      onClick: () => go('/settings/notifications'),
      active: at('/settings/notification'),
    },
    manager && {
      k: 'cli',
      label: 'Clientes',
      icon: <BadgeIcon />,
      onClick: () => go('/settings/clients'),
      active: at('/settings/client'),
    },
    !readonly && {
      k: 'dev',
      label: 'Dispositivos',
      icon: <DnsIcon />,
      onClick: (e) => open(e, 'disp'),
      active: at('/settings/device') || at('/settings/group'),
      menu: true,
    },
    {
      k: 'cfg',
      label: 'Configurações',
      icon: <SettingsIcon />,
      onClick: (e) => open(e, 'cfg'),
      active: at('/settings/preferences') || at('/settings/server'),
      menu: true,
    },
  ]
    .filter(Boolean)
    .filter(
      (it) =>
        manager ||
        !lsMenu ||
        it.k === 'map' ||
        it.k === 'dash' ||
        String(lsMenu).split(',').includes(it.k),
    );

  return (
    <Box
      sx={{
        backgroundColor: AZUL,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: 0.25,
        px: 2,
        height: 50,
        flexShrink: 0,
        zIndex: 6,
        '@media print': { display: 'none' },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mr: 1.5,
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        <img
          src="https://i.postimg.cc/R03xyFTD/logo-png.jpg"
          alt="LS"
          style={{ height: 28, borderRadius: '50%' }}
        />
        <span>LS Autotruck</span>
      </Box>

      {items.map((it) => (
        <Button
          key={it.k}
          onClick={it.onClick}
          startIcon={it.icon}
          endIcon={it.menu ? <ExpandMoreIcon /> : null}
          sx={{
            color: it.active ? '#fff' : '#c4d3ee',
            textTransform: 'none',
            fontSize: 13.5,
            fontWeight: it.active ? 700 : 500,
            px: 1.1,
            minWidth: 'auto',
            whiteSpace: 'nowrap',
            backgroundColor: it.active ? 'rgba(255,255,255,0.14)' : 'transparent',
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.09)' },
          }}
        >
          {it.label}
        </Button>
      ))}

      <Box sx={{ flexGrow: 1 }} />

      <Button
        onClick={(e) => open(e, 'acc')}
        startIcon={
          <Avatar sx={{ width: 26, height: 26, bgcolor: '#1C7ED6', fontSize: 13 }}>
            {(user.name || 'U').charAt(0).toUpperCase()}
          </Avatar>
        }
        sx={{ color: '#dbe6f7', textTransform: 'none', fontSize: 13.5, whiteSpace: 'nowrap' }}
      >
        {user.name}
      </Button>

      <Menu anchorEl={menu.el} open={menu.key === 'rel'} onClose={close}>
        <MenuItem onClick={() => go('/reports/combined')}>Combinado</MenuItem>
        <MenuItem onClick={() => go('/reports/events')}>Eventos</MenuItem>
        <MenuItem onClick={() => go('/reports/trips')}>Viagens</MenuItem>
        <MenuItem onClick={() => go('/reports/stops')}>Paradas</MenuItem>
        <MenuItem onClick={() => go('/reports/summary')}>Resumo</MenuItem>
        <MenuItem onClick={() => go('/reports/chart')}>Gráfico</MenuItem>
        <MenuItem onClick={() => go('/reports/route')}>Rota / posições</MenuItem>
        <MenuItem onClick={() => go('/replay')}>Reprodução</MenuItem>
        <MenuItem onClick={() => go('/reports/statistics')}>Estatísticas</MenuItem>
        {admin && <MenuItem onClick={() => go('/reports/scheduled')}>Agendados</MenuItem>}
        {admin && <MenuItem onClick={() => go('/reports/logs')}>Registros</MenuItem>}
        {admin && <MenuItem onClick={() => go('/reports/audit')}>Auditoria</MenuItem>}
      </Menu>

      <Menu anchorEl={menu.el} open={menu.key === 'disp'} onClose={close}>
        <MenuItem onClick={() => go('/settings/devices')}>Dispositivos</MenuItem>
        {!features.disableGroups && (
          <MenuItem onClick={() => go('/settings/groups')}>Grupos</MenuItem>
        )}
        {!features.disableSavedCommands && (
          <MenuItem onClick={() => go('/settings/commands')}>Comandos</MenuItem>
        )}
        {!features.disableMaintenance && (
          <MenuItem onClick={() => go('/settings/maintenances')}>Manutenção</MenuItem>
        )}
        {!features.disableComputedAttributes && (
          <MenuItem onClick={() => go('/settings/attributes')}>Atributos computados</MenuItem>
        )}
        {!features.disableCalendars && (
          <MenuItem onClick={() => go('/settings/calendars')}>Calendários</MenuItem>
        )}
      </Menu>

      <Menu anchorEl={menu.el} open={menu.key === 'cfg'} onClose={close}>
        <MenuItem onClick={() => go('/settings/preferences')}>Preferências</MenuItem>
        {manager && <MenuItem onClick={() => go('/settings/users')}>Usuários</MenuItem>}
        {admin && <MenuItem onClick={() => go('/settings/server')}>Servidor</MenuItem>}
        {manager && <MenuItem onClick={() => go('/settings/announcement')}>Comunicado</MenuItem>}
        <MenuItem onClick={() => go(`/settings/user/${user.id}`)}>Minha conta</MenuItem>
        {supportLink && (
          <MenuItem
            onClick={() => {
              close();
              window.open(supportLink, '_blank');
            }}
          >
            Suporte
          </MenuItem>
        )}
      </Menu>

      <Menu anchorEl={menu.el} open={menu.key === 'acc'} onClose={close}>
        <MenuItem onClick={() => go(`/settings/user/${user.id}`)}>Minha conta</MenuItem>
        <MenuItem onClick={handleLogout}>
          <Typography color="error">Sair</Typography>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default LsTopBar;
