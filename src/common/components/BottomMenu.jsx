import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { Paper, BottomNavigation, BottomNavigationAction, Badge } from '@mui/material';

import RouteIcon from '@mui/icons-material/Route';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon from '@mui/icons-material/Settings';
import MapIcon from '@mui/icons-material/Map';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';

import { sessionActions } from '../../store';
import { useTranslation } from './LocalizationProvider';
import { useRestriction } from '../util/permissions';
import { nativePostMessage } from './NativeInterface';

const BottomMenu = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const t = useTranslation();

  const readonly = useRestriction('readonly');
  const disableReports = useRestriction('disableReports');
  const devices = useSelector((state) => state.devices.items);
  const user = useSelector((state) => state.session.user);
  const socket = useSelector((state) => state.session.socket);
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);

  const currentSelection = () => {
    if (location.pathname.startsWith('/settings/notification')) {
      return 'alerts';
    }
    if (location.pathname.startsWith('/settings')) {
      return 'settings';
    }
    if (location.pathname.startsWith('/replay')) {
      return 'replay';
    }
    if (location.pathname === '/') {
      return 'map';
    }
    return null;
  };

  const handleLogout = async () => {
    const notificationToken = window.localStorage.getItem('notificationToken');
    if (notificationToken && !user.readonly) {
      window.localStorage.removeItem('notificationToken');
      const tokens = user.attributes.notificationTokens?.split(',') || [];
      if (tokens.includes(notificationToken)) {
        const updatedUser = {
          ...user,
          attributes: {
            ...user.attributes,
            notificationTokens:
              tokens.length > 1
                ? tokens.filter((it) => it !== notificationToken).join(',')
                : undefined,
          },
        };
        await fetch(`/api/users/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedUser),
        });
      }
    }

    await fetch('/api/session', { method: 'DELETE' });
    nativePostMessage('logout');
    navigate('/login');
    dispatch(sessionActions.updateUser(null));
  };

  const handleSelection = (event, value) => {
    switch (value) {
      case 'map':
        navigate('/');
        break;
      case 'replay': {
        let id = selectedDeviceId;
        if (id == null) {
          const deviceIds = Object.keys(devices);
          if (deviceIds.length === 1) {
            id = deviceIds[0];
          }
        }

        navigate(id != null ? `/replay?deviceId=${id}` : '/replay');
        break;
      }
      case 'alerts':
        navigate('/settings/notifications');
        break;
      case 'settings':
        navigate('/settings/preferences?menu=true');
        break;
      case 'logout':
        handleLogout();
        break;
      default:
        break;
    }
  };

  return (
    <Paper square elevation={3}>
      <BottomNavigation value={currentSelection()} onChange={handleSelection} showLabels>
        <BottomNavigationAction
          label={t('mapTitle')}
          icon={
            <Badge color="error" variant="dot" overlap="circular" invisible={socket !== false}>
              <MapIcon />
            </Badge>
          }
          value="map"
        />
        {!disableReports && (
          <BottomNavigationAction label={t('reportReplay')} icon={<RouteIcon />} value="replay" />
        )}
        {!readonly && (
          <BottomNavigationAction
            label={t('sharedNotifications')}
            icon={<NotificationsIcon />}
            value="alerts"
          />
        )}
        {!readonly && (
          <BottomNavigationAction
            label={t('settingsTitle')}
            icon={<SettingsIcon />}
            value="settings"
          />
        )}
        {readonly && (
          <BottomNavigationAction
            label={t('loginLogout')}
            icon={<ExitToAppIcon />}
            value="logout"
          />
        )}
      </BottomNavigation>
    </Paper>
  );
};

export default BottomMenu;
