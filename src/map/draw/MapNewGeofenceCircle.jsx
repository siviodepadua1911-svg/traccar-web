import { useEffect, useRef } from 'react';
import turfCircle from '@turf/circle';
import { map } from '../core/MapView';

const SOURCE_ID = 'ls-new-geofence-circle';
const FILL_ID = `${SOURCE_ID}-fill`;
const LINE_ID = `${SOURCE_ID}-line`;

const circlePolygon = (center, radius) =>
  turfCircle([center.lng, center.lat], Math.max(radius, 1), { steps: 64, units: 'meters' });

// Desenha um circulo ao vivo centrado no meio do mapa (o pino fica fixo na
// tela, quem "arrasta" e o mapa por baixo dele) e avisa o pai da posicao
// atual quando o usuario para de arrastar.
const MapNewGeofenceCircle = ({ radius, onCenterChange }) => {
  const radiusRef = useRef(radius);
  radiusRef.current = radius;

  useEffect(() => {
    const initialCenter = map.getCenter();
    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: circlePolygon(initialCenter, radiusRef.current),
    });
    map.addLayer({
      id: FILL_ID,
      type: 'fill',
      source: SOURCE_ID,
      paint: { 'fill-color': '#1C7ED6', 'fill-opacity': 0.15 },
    });
    map.addLayer({
      id: LINE_ID,
      type: 'line',
      source: SOURCE_ID,
      paint: { 'line-color': '#1C7ED6', 'line-width': 2 },
    });

    onCenterChange(initialCenter);

    const redraw = () => {
      const source = map.getSource(SOURCE_ID);
      if (source) {
        source.setData(circlePolygon(map.getCenter(), radiusRef.current));
      }
    };
    const onMoveEnd = () => onCenterChange(map.getCenter());

    map.on('move', redraw);
    map.on('moveend', onMoveEnd);

    return () => {
      map.off('move', redraw);
      map.off('moveend', onMoveEnd);
      if (map.getLayer(FILL_ID)) map.removeLayer(FILL_ID);
      if (map.getLayer(LINE_ID)) map.removeLayer(LINE_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    };
    // eslint-disable-next-line @eslint-react/exhaustive-deps
  }, []);

  useEffect(() => {
    const source = map.getSource(SOURCE_ID);
    if (source) {
      source.setData(circlePolygon(map.getCenter(), radius));
    }
  }, [radius]);

  return null;
};

export default MapNewGeofenceCircle;
