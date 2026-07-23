import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { createRoot } from 'react-dom/client';
import NearMeIcon from '@mui/icons-material/NearMe';
import { map } from '../core/MapView';
import { sessionActions } from '../../store';
import { useAttributePreference } from '../../common/util/preferences';
import fetchOrThrow from '../../common/util/fetchOrThrow';
import { useCatch } from '../../reactHelper';

const useStyles = makeStyles()((theme) => ({
  button: {
    '&&': {
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#333',
    },
    '&&.visible': {
      display: 'flex',
    },
    '&&.active': {
      color: theme.palette.error.main,
    },
  },
}));

const MapFollowButton = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { classes } = useStyles();

  const user = useSelector((state) => state.session.user);
  const selectedId = useSelector((state) => state.devices.selectedId);
  const mapFollow = useAttributePreference('mapFollow', false);

  const buttonRef = useRef(null);

  const toggleFollow = useCatch(async () => {
    const updatedUser = {
      ...user,
      attributes: { ...user.attributes, mapFollow: !mapFollow },
    };
    const response = await fetchOrThrow(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedUser),
    });
    dispatch(sessionActions.updateUser(await response.json()));
  });

  const toggleRef = useRef(toggleFollow);
  toggleRef.current = toggleFollow;

  useEffect(() => {
    let container;
    let root;
    const control = {
      onAdd: () => {
        container = document.createElement('div');
        container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
        const button = document.createElement('button');
        button.type = 'button';
        button.title = 'Seguir veículo selecionado';
        button.className = `maplibregl-ctrl-icon ${classes.button}`;
        button.onclick = () => toggleRef.current();
        container.appendChild(button);
        root = createRoot(button);
        root.render(<NearMeIcon fontSize="small" />);
        buttonRef.current = button;
        return container;
      },
      onRemove: () => {
        queueMicrotask(() => root.unmount());
        container.remove();
      },
    };
    map.addControl(control, theme.direction === 'rtl' ? 'top-left' : 'top-right');
    return () => map.removeControl(control);
  }, [theme.direction, classes.button]);

  useEffect(() => {
    buttonRef.current?.classList.toggle('visible', !!selectedId);
    buttonRef.current?.classList.toggle('active', mapFollow);
  }, [selectedId, mapFollow]);

  return null;
};

export default MapFollowButton;
