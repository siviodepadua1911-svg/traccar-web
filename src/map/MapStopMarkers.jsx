import { useId, useEffect } from 'react';
import { map } from './core/MapView';
import { findFonts } from './core/mapUtil';
import { MIN_STOP_DURATION_MS, PARK_DURATION_MS } from '../common/util/lsRouteCleanup';
import { formatDurationShort } from '../common/util/formatter';

// Marcadores de parada/estacionamento no Replay, no estilo Wialon:
//   - P (azul)       = estacionamento: veiculo parado >= PARK_DURATION_MS
//   - STOP (laranja) = parada curta:   >= MIN_STOP_DURATION_MS e < PARK_DURATION_MS
// O tempo parado aparece no rotulo embaixo de cada marcador.
const PARK_COLOR = '#1565c0';
const STOP_COLOR = '#ef6c00';

const MapStopMarkers = ({ positions }) => {
  const id = useId();

  useEffect(() => {
    map.addSource(id, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
    // circulo de fundo (azul p/ estacionamento, laranja p/ parada curta)
    map.addLayer({
      id: `${id}-circle`,
      type: 'circle',
      source: id,
      paint: {
        'circle-radius': ['case', ['==', ['get', 'kind'], 'park'], 12, 9],
        'circle-color': ['get', 'color'],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });
    // letra dentro do circulo do estacionamento (P)
    map.addLayer({
      id: `${id}-glyph`,
      type: 'symbol',
      source: id,
      layout: {
        'text-font': findFonts(map),
        'text-field': ['get', 'glyph'],
        'text-size': 14,
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: {
        'text-color': '#ffffff',
      },
    });
    // rotulo com o tempo parado
    map.addLayer({
      id,
      type: 'symbol',
      source: id,
      layout: {
        'text-font': findFonts(map),
        'text-field': ['get', 'label'],
        'text-size': 12,
        'text-anchor': 'top',
        'text-offset': [0, 1.1],
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#000000b3',
        'text-halo-width': 1.5,
      },
    });

    return () => {
      [`${id}-circle`, `${id}-glyph`, id].forEach((layer) => {
        if (map.getLayer(layer)) {
          map.removeLayer(layer);
        }
      });
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
      features: stops.map((position) => {
        const park = position.lsStopDurationMs >= PARK_DURATION_MS;
        const dur = formatDurationShort(position.lsStopDurationMs);
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [position.longitude, position.latitude],
          },
          properties: {
            kind: park ? 'park' : 'stop',
            color: park ? PARK_COLOR : STOP_COLOR,
            glyph: park ? 'P' : '',
            label: (park ? 'Estacionado ' : 'STOP ') + dur,
          },
        };
      }),
    });
  }, [positions, id]);

  return null;
};

export default MapStopMarkers;
