import { Divider, List } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import DrawIcon from '@mui/icons-material/Draw';
import NotificationsIcon from '@mui/icons-material/Notifications';
import FolderIcon from '@mui/icons-material/Folder';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import BuildIcon from '@mui/icons-material/Build';
import PeopleIcon from '@mui/icons-material/People';
import BadgeIcon from '@mui/icons-material/Badge';
import TodayIcon from '@mui/icons-material/Today';
import SendIcon from '@mui/icons-material/Send';
import DnsIcon from '@mui/icons-material/Dns';
import HelpIcon from '@mui/icons-material/Help';
import PaymentIcon from '@mui/icons-material/Payment';
import CampaignIcon from '@mui/icons-material/Campaign';
import CalculateIcon from '@mui/icons-material/Calculate';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { useAdministrator, useManager, useRestriction } from '../../common/util/permissions';
import useFeatures from '../../common/util/useFeatures';
import MenuItem from '../../common/components/MenuItem';

const SettingsMenu = () => {
  const t = useTranslation();
  const location = useLocation();

  const readonly = useRestriction('readonly');
  const admin = useAdministrator();
  const manager = useManager();
  const userId = useSelector((state) => state.session.user.id);
  const supportLink = useSelector((state) => state.session.server.attributes.support);
  const billingLink = useSelector((state) => state.session.user.attributes.billingLink);

  const features = useFeatures();

  return (
    <>
      <List>
        <MenuItem
          title={t('sharedPreferences')}
          link="/settings/preferences"
          icon={<TuneIcon sx={{ color: '#1976d2' }} />}
          selected={location.pathname === '/settings/preferences'}
        />
        {!readonly && (
          <>
            <MenuItem
              title={t('sharedNotifications')}
              link="/settings/notifications"
              icon={<NotificationsIcon sx={{ color: '#f9a825' }} />}
              selected={location.pathname.startsWith('/settings/notification')}
            />
            <MenuItem
              title={t('settingsUser')}
              link={`/settings/user/${userId}`}
              icon={<PersonIcon sx={{ color: '#00897b' }} />}
              selected={location.pathname === `/settings/user/${userId}`}
            />
            <MenuItem
              title={t('deviceTitle')}
              link="/settings/devices"
              icon={<DnsIcon sx={{ color: '#3949ab' }} />}
              selected={location.pathname.startsWith('/settings/device')}
            />
            <MenuItem
              title={t('sharedGeofences')}
              link="/geofences"
              icon={<DrawIcon sx={{ color: '#43a047' }} />}
              selected={location.pathname.startsWith('/settings/geofence')}
            />
            {!features.disableGroups && (
              <MenuItem
                title={t('settingsGroups')}
                link="/settings/groups"
                icon={<FolderIcon sx={{ color: '#fb8c00' }} />}
                selected={location.pathname.startsWith('/settings/group')}
              />
            )}
            {!features.disableDrivers && (
              <MenuItem
                title={t('sharedDrivers')}
                link="/settings/drivers"
                icon={<PersonIcon sx={{ color: '#8e24aa' }} />}
                selected={location.pathname.startsWith('/settings/driver')}
              />
            )}
            {!features.disableCalendars && (
              <MenuItem
                title={t('sharedCalendars')}
                link="/settings/calendars"
                icon={<TodayIcon sx={{ color: '#e53935' }} />}
                selected={location.pathname.startsWith('/settings/calendar')}
              />
            )}
            {!features.disableComputedAttributes && (
              <MenuItem
                title={t('sharedComputedAttributes')}
                link="/settings/attributes"
                icon={<CalculateIcon sx={{ color: '#00acc1' }} />}
                selected={location.pathname.startsWith('/settings/attribute')}
              />
            )}
            {!features.disableMaintenance && (
              <MenuItem
                title={t('sharedMaintenance')}
                link="/settings/maintenances"
                icon={<BuildIcon sx={{ color: '#6d4c41' }} />}
                selected={location.pathname.startsWith('/settings/maintenance')}
              />
            )}
            {!features.disableSavedCommands && (
              <MenuItem
                title={t('sharedSavedCommands')}
                link="/settings/commands"
                icon={<SendIcon sx={{ color: '#00838f' }} />}
                selected={location.pathname.startsWith('/settings/command')}
              />
            )}
          </>
        )}
        {billingLink && (
          <MenuItem
            title={t('userBilling')}
            link={billingLink}
            icon={<PaymentIcon sx={{ color: '#2e7d32' }} />}
          />
        )}
        {supportLink && (
          <MenuItem
            title={t('settingsSupport')}
            link={supportLink}
            icon={<HelpIcon sx={{ color: '#5e35b1' }} />}
          />
        )}
      </List>
      {manager && (
        <>
          <Divider />
          <List>
            <MenuItem
              title={t('serverAnnouncement')}
              link="/settings/announcement"
              icon={<CampaignIcon sx={{ color: '#d81b60' }} />}
              selected={location.pathname === '/settings/announcement'}
            />
            <MenuItem
              title="Clientes"
              link="/settings/clients"
              icon={<BadgeIcon sx={{ color: '#f4511e' }} />}
              selected={location.pathname.startsWith('/settings/client')}
            />
            {admin && (
              <MenuItem
                title={t('settingsServer')}
                link="/settings/server"
                icon={<SettingsIcon sx={{ color: '#455a64' }} />}
                selected={location.pathname === '/settings/server'}
              />
            )}
            <MenuItem
              title={t('settingsUsers')}
              link="/settings/users"
              icon={<PeopleIcon sx={{ color: '#039be5' }} />}
              selected={
                location.pathname.startsWith('/settings/user') &&
                location.pathname !== `/settings/user/${userId}`
              }
            />
          </List>
        </>
      )}
    </>
  );
};

export default SettingsMenu;
