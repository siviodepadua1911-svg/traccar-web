import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Chip } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import GpsOffIcon from '@mui/icons-material/GpsOff';
import { map } from '../core/MapView';
import { useAttributePreference } from '../../common/util/preferences';

const useStyles = makeStyles()((theme) => ({
  chip: {
    position: 'fixed',
    zIndex: 1250,
    top: theme.spacing(1),
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: theme.palette.warning.main,
    color: '#000',
    fontWeight: 600,
    boxShadow: theme.shadows[3],
  },
}));

const MapFollowAlert = () => {
  const { classes } = useStyles();

  const selectedId = useSelector((state) => state.devices.selectedId);
  const position = useSelector((state) => state.session.positions[selectedId]);
  const mapFollow = useAttributePreference('mapFollow', false);

  const [outOfView, setOutOfView] = useState(false);

  useEffect(() => {
    if (!selectedId || !position || mapFollow) {
      setOutOfView(false);
      return undefined;
    }
    const check = () => {
      const bounds = map.getBounds();
      setOutOfView(!bounds.contains([position.longitude, position.latitude]));
    };
    check();
    map.on('moveend', check);
    return () => map.off('moveend', check);
  }, [selectedId, position, mapFollow]);

  if (!outOfView) {
    return null;
  }

  const handleReturn = () => {
    map.easeTo({ center: [position.longitude, position.latitude] });
  };

  return (
    <Chip
      className={classes.chip}
      icon={<GpsOffIcon style={{ color: '#000' }} />}
      label="Veículo fora da tela — toque para voltar"
      onClick={handleReturn}
      clickable
    />
  );
};

export default MapFollowAlert;
