import { useId, useEffect } from 'react';
import { map } from './core/MapView';
import { findFonts } from './core/mapUtil';
import { MIN_STOP_DURATION_MS } from '../common/util/lsRouteCleanup';
import { formatDurationShort } from '../common/util/formatter';

// Marcador "Parado aqui por X" nos trechos do Replay onde o veiculo ficou parado -
// so aparece pra paradas de verdade (MIN_STOP_DURATION_MS), nao pra sinal fechado rapido.
const MapStopMarkers = ({ positions }) => {
  const id = useId();

  useEffect(() => {
    map.addSource(id, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
    map.addLayer({
      id: `${id}-dot`,
      type: 'circle',
      source: id,
      paint: {
        'circle-radius': 6,
        'circle-color': '#455a64',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });
    map.addLayer({
      id,
      type: 'symbol',
      source: id,
      layout: {
        'text-font': findFonts(map),
        'text-field': ['get', 'label'],
        'text-size': 12,
        'text-anchor': 'top',
        'text-offset': [0, 0.8],
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#000000b3',
        'text-halo-width': 1.5,
      },
    });

    return () => {
      if (map.getLayer(id)) {
        map.removeLayer(id);
      }
      if (map.getLayer(`${id}-dot`)) {
        map.removeLayer(`${id}-dot`);
      }
      if (map.getSource(id)) {
        map.removeSource(id);
      }
    };
  }, [id]);

  useEffect(() => {
    const stops = positions.filter(
      (position) => position.lsStopped && position.lsStopDurationMs >= MIN_STOP_DURATION_MS,
    );
    map.getSource(id)?.setData({
      type: 'FeatureCollection',
      features: stops.map((position) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [position.longitude, position.latitude],
        },
        properties: {
          label: `Parado ${formatDurationShort(position.lsStopDurationMs)}`,
        },
      })),
    });
  }, [positions, id]);

  return null;
};

export default MapStopMarkers;
