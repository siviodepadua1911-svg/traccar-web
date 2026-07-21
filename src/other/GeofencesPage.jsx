import { useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Divider,
  Typography,
  IconButton,
  Toolbar,
  Paper,
  Fab,
  Slider,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  CircularProgress,
} from '@mui/material';
import Tooltip from '@mui/material/Tooltip';
import { makeStyles } from 'tss-react/mui';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AddIcon from '@mui/icons-material/Add';
import RoomIcon from '@mui/icons-material/Room';
import { useNavigate } from 'react-router-dom';
import MapView from '../map/core/MapView';
import MapCurrentLocation from '../map/MapCurrentLocation';
import MapDefaultCamera from '../map/main/MapDefaultCamera';
import MapGeofenceEdit from '../map/draw/MapGeofenceEdit';
import MapNewGeofenceCircle from '../map/draw/MapNewGeofenceCircle';
import GeofencesList from './GeofencesList';
import { useTranslation } from '../common/components/LocalizationProvider';
import MapGeocoder from '../map/control/MapGeocoder';
import { errorsActions, geofencesActions } from '../store';
import MapScale from '../map/MapScale';
import BackIcon from '../common/components/BackIcon';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { useCatchCallback } from '../reactHelper';
import { useDeviceReadonly } from '../common/util/permissions';

const MIN_RADIUS = 100;
const MAX_RADIUS = 5000;
const DEFAULT_RADIUS = 300;

const formatRadius = (r) => (r < 1000 ? `${Math.round(r)} m` : `${(r / 1000).toFixed(1)} km`);

const useStyles = makeStyles()((theme) => ({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  content: {
    flexGrow: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'row',
    [theme.breakpoints.down('sm')]: {
      flexDirection: 'column-reverse',
    },
  },
  drawer: {
    display: 'flex',
    flexDirection: 'column',
    [theme.breakpoints.up('sm')]: {
      width: theme.dimensions.drawerWidthDesktop,
    },
    [theme.breakpoints.down('sm')]: {
      height: theme.dimensions.drawerHeightPhone,
    },
  },
  mapContainer: {
    flexGrow: 1,
    position: 'relative',
  },
  title: {
    flexGrow: 1,
  },
  fileInput: {
    display: 'none',
  },
  fab: {
    position: 'absolute',
    right: theme.spacing(3),
    bottom: theme.spacing(3),
    zIndex: 5,
  },
  centerPin: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -100%)',
    pointerEvents: 'none',
    zIndex: 4,
    color: '#c62828',
    fontSize: 44,
    filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
    padding: theme.spacing(2),
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    overflow: 'auto',
    [theme.breakpoints.up('sm')]: {
      left: 'auto',
      right: theme.spacing(3),
      bottom: theme.spacing(3),
      width: 360,
      borderRadius: 16,
    },
  },
  sheetTitle: {
    fontWeight: 600,
    fontSize: 16,
    marginBottom: theme.spacing(1.5),
  },
  sheetRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: theme.spacing(1),
    marginTop: theme.spacing(2),
  },
}));

const GeofencesPage = () => {
  const { classes } = useStyles();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const t = useTranslation();
  const deviceReadonly = useDeviceReadonly();
  const userId = useSelector((state) => state.session.user.id);
  const devices = useSelector((state) => state.devices.items);
  const deviceList = useMemo(() => Object.values(devices), [devices]);

  const [selectedGeofenceId, setSelectedGeofenceId] = useState();

  const [creating, setCreating] = useState(false);
  const [center, setCenter] = useState(null);
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const [name, setName] = useState('');
  const [notifyEnter, setNotifyEnter] = useState(true);
  const [notifyExit, setNotifyExit] = useState(true);
  const [saving, setSaving] = useState(false);

  const startCreating = () => {
    setCenter(null);
    setRadius(DEFAULT_RADIUS);
    setName('');
    setNotifyEnter(true);
    setNotifyExit(true);
    setCreating(true);
  };

  const linkNotification = useCallback(
    async (type) => {
      const allResponse = await fetchOrThrow('/api/notifications');
      const all = await allResponse.json();
      let notification = all.find(
        (n) => n.type === type && !n.always && n.attributes && n.attributes.ls,
      );
      if (!notification) {
        const created = await fetchOrThrow('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            always: false,
            notificators: 'web',
            calendarId: 0,
            attributes: { ls: true },
          }),
        });
        notification = await created.json();
      }
      const links = deviceReadonly
        ? [{ userId, notificationId: notification.id }]
        : deviceList.map((d) => ({ deviceId: d.id, notificationId: notification.id }));
      await Promise.all(
        links.map((body) =>
          fetchOrThrow('/api/permissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }).catch(() => {}),
        ),
      );
    },
    [deviceReadonly, userId, deviceList],
  );

  const saveNewGeofence = useCatchCallback(async () => {
    if (!center || !name.trim()) return;
    setSaving(true);
    try {
      const area = `CIRCLE (${center.lat} ${center.lng}, ${Math.round(radius)})`;
      const response = await fetchOrThrow('/api/geofences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), area, attributes: {} }),
      });
      const geofence = await response.json();

      await Promise.all(
        deviceList.map((d) =>
          fetchOrThrow('/api/permissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId: d.id, geofenceId: geofence.id }),
          }),
        ),
      );

      if (notifyEnter) await linkNotification('geofenceEnter');
      if (notifyExit) await linkNotification('geofenceExit');

      dispatch(geofencesActions.update([geofence]));
      setCreating(false);
    } finally {
      setSaving(false);
    }
  }, [center, name, radius, notifyEnter, notifyExit, deviceList, dispatch, linkNotification]);

  const handleFile = (event) => {
    const files = Array.from(event.target.files);
    const [file] = files;
    const reader = new FileReader();
    reader.onload = async () => {
      const xml = new DOMParser().parseFromString(reader.result, 'text/xml');
      const segment = xml.getElementsByTagName('trkseg')[0];
      const coordinates = Array.from(segment.getElementsByTagName('trkpt'))
        .map((point) => `${point.getAttribute('lat')} ${point.getAttribute('lon')}`)
        .join(', ');
      const area = `LINESTRING (${coordinates})`;
      const newItem = { name: t('sharedGeofence'), area };
      try {
        const response = await fetchOrThrow('/api/geofences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newItem),
        });
        const item = await response.json();
        navigate(`/settings/geofence/${item.id}`);
      } catch (error) {
        dispatch(errorsActions.push(error.message));
      }
    };
    reader.onerror = (event) => {
      dispatch(errorsActions.push(event.target.error));
    };
    reader.readAsText(file);
  };

  return (
    <div className={classes.root}>
      <div className={classes.content}>
        <Paper square className={classes.drawer}>
          <Toolbar>
            <IconButton edge="start" sx={{ mr: 2 }} onClick={() => navigate(-1)}>
              <BackIcon />
            </IconButton>
            <Typography variant="h6" className={classes.title}>
              {t('sharedGeofences')}
            </Typography>
            <label htmlFor="upload-gpx">
              <input
                accept=".gpx"
                id="upload-gpx"
                type="file"
                className={classes.fileInput}
                onChange={handleFile}
              />
              <IconButton edge="end" component="span" onClick={() => {}}>
                <Tooltip title={t('sharedUpload')}>
                  <UploadFileIcon />
                </Tooltip>
              </IconButton>
            </label>
          </Toolbar>
          <Divider />
          <GeofencesList onGeofenceSelected={setSelectedGeofenceId} />
        </Paper>
        <div className={classes.mapContainer}>
          <MapView>
            {creating ? (
              <MapNewGeofenceCircle radius={radius} onCenterChange={setCenter} />
            ) : (
              <MapGeofenceEdit selectedGeofenceId={selectedGeofenceId} />
            )}
            <MapDefaultCamera />
          </MapView>
          <MapScale />
          <MapCurrentLocation />
          <MapGeocoder />

          {creating && <RoomIcon className={classes.centerPin} />}

          {!creating && (
            <Tooltip title="Nova cerca">
              <Fab color="primary" className={classes.fab} onClick={startCreating}>
                <AddIcon />
              </Fab>
            </Tooltip>
          )}

          {creating && (
            <Paper elevation={4} className={classes.sheet}>
              <Typography className={classes.sheetTitle}>Nova cerca</Typography>
              <TextField
                autoFocus
                fullWidth
                size="small"
                label="Nome da cerca"
                value={name}
                onChange={(e) => setName(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Typography variant="body2" color="textSecondary">
                {`Raio: ${formatRadius(radius)} — arraste o mapa pra posicionar o pino, ou use a busca (lupa) pra achar o endereço`}
              </Typography>
              <Slider
                value={radius}
                onChange={(_, v) => setRadius(v)}
                min={MIN_RADIUS}
                max={MAX_RADIUS}
                step={50}
                sx={{ mt: 1 }}
              />
              <div className={classes.sheetRow}>
                <Typography variant="body2">Avisar quando entrar</Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notifyEnter}
                      onChange={(e) => setNotifyEnter(e.target.checked)}
                    />
                  }
                  label=""
                  sx={{ m: 0 }}
                />
              </div>
              <div className={classes.sheetRow}>
                <Typography variant="body2">Avisar quando sair</Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notifyExit}
                      onChange={(e) => setNotifyExit(e.target.checked)}
                    />
                  }
                  label=""
                  sx={{ m: 0 }}
                />
              </div>
              <div className={classes.sheetActions}>
                <Button onClick={() => setCreating(false)} disabled={saving}>
                  Cancelar
                </Button>
                <Button
                  variant="contained"
                  onClick={saveNewGeofence}
                  disabled={saving || !name.trim() || !center}
                >
                  {saving ? <CircularProgress size={18} /> : 'Salvar'}
                </Button>
              </div>
            </Paper>
          )}
        </div>
      </div>
    </div>
  );
};

export default GeofencesPage;
