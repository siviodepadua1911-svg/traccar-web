import { useId, useCallback, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import maplibregl from 'maplibre-gl';
import { map } from './core/MapView';
import { formatTime, getStatusColor } from '../common/util/formatter';
import { mapIconKey } from './core/preloadImages';
import { useAttributePreference } from '../common/util/preferences';
import { useCatchCallback } from '../reactHelper';
import { findFonts } from './core/mapUtil';
import useLsGlidePositions from './lsUseGlidePositions';

const buildHoverHtml = (p, lat, lon) => {
  const rows = [];
  const row = (label, value) =>
    `<tr><td style="padding:2px 10px 2px 0;color:#607d8b;font-size:12px;white-space:nowrap;">${label}</td><td style="padding:2px 0;font-size:12px;font-weight:600;color:#263238;">${value}</td></tr>`;
  if (p.fixTime) rows.push(row('Hora', p.fixTime));
  if (p.speed !== undefined) rows.push(row('Velocidade', `${p.speed} km/h`));
  if (p.ignition !== undefined)
    rows.push(
      row(
        'Igni&ccedil;&atilde;o',
        p.ignition
          ? '<span style="color:#2e7d32;">Ligada</span>'
          : '<span style="color:#c62828;">Desligada</span>',
      ),
    );
  if (p.blocked !== undefined)
    rows.push(
      row(
        'Bloqueio',
        p.blocked
          ? '<span style="color:#c62828;font-weight:700;">BLOQUEADO</span>'
          : '<span style="color:#2e7d32;">Liberado</span>',
      ),
    );
  if (p.batteryLevel !== undefined) rows.push(row('Bateria', `${p.batteryLevel}%`));
  if (p.power !== undefined) rows.push(row('Voltagem', `${Number(p.power).toFixed(1)} V`));
  if (p.sat !== undefined) rows.push(row('Sat&eacute;lites', p.sat));
  if (p.rssi !== undefined) rows.push(row('Sinal GSM', p.rssi));
  if (p.totalDistance !== undefined)
    rows.push(row('Hod&ocirc;metro', `${Number(p.totalDistance).toLocaleString('pt-BR')} km`));
  if (p.address && p.address !== 'undefined') rows.push(row('Endere&ccedil;o', p.address));
  return `<div style="font-family:Inter,Roboto,Arial,sans-serif;min-width:210px;">
    <div style="font-weight:700;font-size:13px;color:#0d2a5c;border-bottom:2px solid #00b0ff;padding-bottom:4px;margin-bottom:6px;">${p.name || ''}</div>
    <table style="border-collapse:collapse;">${rows.join('')}</table>
    <div style="display:flex;gap:4px;margin-top:8px;">
      <button onclick="window.lsMaps(${lat},${lon})" style="flex:1;cursor:pointer;border:1px solid #cfd8dc;background:#f5f8fc;border-radius:6px;padding:6px 2px;font-size:10.5px;color:#0d47a1;font-family:inherit;">Google Maps</button>
      <button onclick="window.lsStreet(${lat},${lon})" style="flex:1;cursor:pointer;border:1px solid #cfd8dc;background:#f5f8fc;border-radius:6px;padding:6px 2px;font-size:10.5px;color:#0d47a1;font-family:inherit;">Street View</button>
      <button onclick="window.lsShare(${lat},${lon},'${(p.name || '').replace(/'/g, '')}')" style="flex:1;cursor:pointer;border:1px solid #cfd8dc;background:#f5f8fc;border-radius:6px;padding:6px 2px;font-size:10.5px;color:#0d47a1;font-family:inherit;">Compartilhar</button>
    </div>
    ${
      p.blocked !== undefined
        ? `<div style="display:flex;gap:4px;margin-top:4px;">
      <button onclick="window.lsCmd(${p.deviceId},'engineStop')" style="flex:1;cursor:pointer;border:none;background:#c62828;border-radius:6px;padding:7px 2px;font-size:11px;color:#fff;font-weight:700;font-family:inherit;">Bloquear</button>
      <button onclick="window.lsCmd(${p.deviceId},'engineResume')" style="flex:1;cursor:pointer;border:none;background:#2e7d32;border-radius:6px;padding:7px 2px;font-size:11px;color:#fff;font-weight:700;font-family:inherit;">Desbloquear</button>
    </div>`
        : ''
    }
  </div>`;
};

const MapPositions = ({
  positions,
  onMapClick,
  onMarkerClick,
  showStatus,
  selectedPosition,
  titleField,
  disabled,
  glide,
}) => {
  const id = useId();
  const shownPositions = useLsGlidePositions(positions, Boolean(glide));
  const clusters = `${id}-clusters`;
  const selected = `${id}-selected`;

  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const iconScale = useAttributePreference('iconScale', desktop ? 0.75 : 1);

  const devices = useSelector((state) => state.devices.items);
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);

  const mapCluster = useAttributePreference('mapCluster', true);
  const directionType = useAttributePreference('mapDirection', 'selected');

  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const hoverPopupRef = useRef(null);
  if (!hoverPopupRef.current) {
    hoverPopupRef.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 60 * iconScale,
      maxWidth: '320px',
    });
  }

  const closeTimerRef = useRef(null);
  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };
  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => hoverPopupRef.current.remove(), 260);
  };

  useEffect(() => {
    window.lsMaps = (la, lo) => window.open(`https://www.google.com/maps?q=${la},${lo}`, '_blank');
    window.lsStreet = (la, lo) =>
      window.open(`https://www.google.com/maps?q=&layer=c&cbll=${la},${lo}`, '_blank');
    window.lsShare = (la, lo, name) => {
      const url = `https://www.google.com/maps?q=${la},${lo}`;
      if (navigator.share) {
        navigator.share({ title: name, text: `${name} - localizacao`, url }).catch(() => {});
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(`${name}: ${url}`)}`, '_blank');
      }
    };
    window.lsCmd = async (deviceId, type) => {
      const acao = type === 'engineStop' ? 'BLOQUEAR' : 'DESBLOQUEAR';
      if (!window.confirm(`Confirma ${acao} este veiculo?`)) return;
      try {
        window.localStorage.setItem('lsExpectResultUntil', String(Date.now() + 180000));
        const r = await fetch(`/api/commands/send?deviceId=${deviceId}`, {
          headers: { Accept: 'application/json' },
        });
        let body = { deviceId, type };
        if (r.ok) {
          const avail = await r.json();
          const saved = (avail || []).find((c) => c.type === type);
          if (saved) body = { id: saved.id, deviceId };
        }
        const send = await fetch('/api/commands/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!send.ok) throw new Error('falha');
        window.alert('Comando enviado! Aguarde a confirmacao no veiculo.');
      } catch {
        window.alert(
          'Nao foi possivel enviar. O comando pode nao estar liberado para este veiculo.',
        );
      }
    };
  }, []);

  const createFeature = useCallback(
    (devices, position, selectedPositionId) => {
      const device = devices[position.deviceId];
      let showDirection;
      switch (directionType) {
        case 'none':
          showDirection = false;
          break;
        case 'all':
          showDirection = position.course > 0;
          break;
        default:
          showDirection = selectedPositionId === position.id && position.course > 0;
          break;
      }
      return {
        id: position.id,
        deviceId: position.deviceId,
        name: device.name,
        fixTime: formatTime(position.fixTime, 'seconds'),
        category: mapIconKey(device.category),
        color: showStatus ? position.attributes.color || getStatusColor(device.status) : 'neutral',
        rotation: position.course,
        direction: showDirection,
        speed: Math.round((position.speed || 0) * 1.852),
        ignition: position.attributes.ignition,
        blocked: position.attributes.blocked,
        batteryLevel: position.attributes.batteryLevel,
        power: position.attributes.power,
        sat: position.attributes.sat,
        rssi: position.attributes.rssi,
        totalDistance:
          position.attributes.totalDistance !== undefined
            ? Math.round(position.attributes.totalDistance / 1000)
            : undefined,
        address: position.address || undefined,
      };
    },
    [directionType, showStatus],
  );

  const onMouseEnter = (event) => {
    clearCloseTimer();
    map.getCanvas().style.cursor = 'pointer';
    const feature = event.features && event.features[0];
    if (feature) {
      const [lo, la] = feature.geometry.coordinates;
      hoverPopupRef.current
        .setLngLat(feature.geometry.coordinates)
        .setHTML(buildHoverHtml(feature.properties, la, lo))
        .addTo(map);
      const el = hoverPopupRef.current.getElement();
      if (el) {
        el.onmouseenter = clearCloseTimer;
        el.onmouseleave = scheduleClose;
      }
    }
  };
  const onMouseLeave = () => {
    map.getCanvas().style.cursor = '';
    scheduleClose();
  };
  const onClusterEnter = () => (map.getCanvas().style.cursor = 'pointer');

  const onMapClickCallback = useCallback(
    (event) => {
      if (!event.defaultPrevented && onMapClick) {
        onMapClick(event.lngLat.lat, event.lngLat.lng);
      }
    },
    [onMapClick],
  );

  const onMarkerClickCallback = useCallback(
    (event) => {
      if (disabledRef.current) return;
      event.preventDefault();
      const feature = event.features[0];
      if (onMarkerClick) {
        onMarkerClick(feature.properties.id, feature.properties.deviceId);
      }
    },
    [onMarkerClick],
  );

  const onClusterClick = useCatchCallback(
    async (event) => {
      if (disabledRef.current) return;
      event.preventDefault();
      const features = map.queryRenderedFeatures(event.point, {
        layers: [clusters],
      });
      const clusterId = features[0].properties.cluster_id;
      const zoom = await map.getSource(id).getClusterExpansionZoom(clusterId);
      map.easeTo({
        center: features[0].geometry.coordinates,
        zoom,
      });
    },
    [clusters, id],
  );

  useEffect(() => {
    map.addSource(id, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
      cluster: mapCluster,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });
    map.addSource(selected, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });
    [id, selected].forEach((source) => {
      map.addLayer({
        id: source,
        type: 'symbol',
        source,
        filter: ['!has', 'point_count'],
        layout: {
          'icon-image': '{category}-{color}',
          'icon-anchor': 'bottom',
          'icon-size': iconScale,
          'icon-allow-overlap': true,
          'text-field': `{${titleField || 'name'}}`,
          'text-allow-overlap': true,
          'text-anchor': 'bottom',
          'text-offset': [0, -3.4 * iconScale],
          'text-font': findFonts(map),
          'text-size': 12,
          'symbol-sort-key': ['get', 'id'],
        },
        paint: {
          'text-halo-color': 'white',
          'text-halo-width': 1,
        },
      });
      map.addLayer({
        id: `direction-${source}`,
        type: 'symbol',
        source,
        filter: ['all', ['!has', 'point_count'], ['==', 'direction', true]],
        layout: {
          'icon-image': 'direction',
          'icon-size': iconScale,
          'icon-allow-overlap': true,
          'icon-rotate': ['get', 'rotation'],
          'icon-rotation-alignment': 'map',
        },
      });

      if (desktop) {
        map.on('mouseenter', source, onMouseEnter);
        map.on('mouseleave', source, onMouseLeave);
      }
      map.on('click', source, onMarkerClickCallback);
    });
    map.addLayer({
      id: clusters,
      type: 'symbol',
      source: id,
      filter: ['has', 'point_count'],
      layout: {
        'icon-image': 'background',
        'icon-size': iconScale,
        'text-field': '{point_count_abbreviated}',
        'text-font': findFonts(map),
        'text-size': 14,
      },
    });

    map.on('mouseenter', clusters, onClusterEnter);
    map.on('mouseleave', clusters, onMouseLeave);
    map.on('click', clusters, onClusterClick);
    map.on('click', onMapClickCallback);

    return () => {
      hoverPopupRef.current.remove();
      map.off('mouseenter', clusters, onClusterEnter);
      map.off('mouseleave', clusters, onMouseLeave);
      map.off('click', clusters, onClusterClick);
      map.off('click', onMapClickCallback);

      if (map.getLayer(clusters)) {
        map.removeLayer(clusters);
      }

      [id, selected].forEach((source) => {
        if (desktop) {
          map.off('mouseenter', source, onMouseEnter);
          map.off('mouseleave', source, onMouseLeave);
        }
        map.off('click', source, onMarkerClickCallback);

        if (map.getLayer(source)) {
          map.removeLayer(source);
        }
        if (map.getLayer(`direction-${source}`)) {
          map.removeLayer(`direction-${source}`);
        }
        if (map.getSource(source)) {
          map.removeSource(source);
        }
      });
    };
  }, [
    mapCluster,
    clusters,
    onMarkerClickCallback,
    onClusterClick,
    onMapClickCallback,
    iconScale,
    id,
    selected,
    titleField,
    desktop,
  ]);

  useEffect(() => {
    [id, selected].forEach((source) => {
      map.getSource(source)?.setData({
        type: 'FeatureCollection',
        features: shownPositions
          .filter((it) => devices.hasOwnProperty(it.deviceId))
          .filter((it) =>
            source === id ? it.deviceId !== selectedDeviceId : it.deviceId === selectedDeviceId,
          )
          .map((position) => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [position.longitude, position.latitude],
            },
            properties: createFeature(devices, position, selectedPosition && selectedPosition.id),
          })),
      });
    });
  }, [
    mapCluster,
    clusters,
    onMarkerClick,
    onClusterClick,
    devices,
    shownPositions,
    selectedPosition,
    createFeature,
    id,
    selected,
    selectedDeviceId,
  ]);

  return null;
};

export default MapPositions;
