import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { usePreference } from '../util/preferences';
import fetchOrThrow from '../util/fetchOrThrow';
import { formatAddress } from '../util/formatter';

// Mostra o endereco do local. Como o geocoder e sob demanda (ignorePositions),
// busca em /api/server/geocode quando precisa, com cache local pra nao repetir.
const LsAddress = ({ position, color, style }) => {
  const geocoderEnabled = useSelector((state) => state.session.server.geocoderEnabled);
  const coordinateFormat = usePreference('coordinateFormat');
  const [address, setAddress] = useState(position.address || null);
  const cacheRef = useRef(new Map());

  useEffect(() => {
    if (position.address) {
      setAddress(position.address);
      return undefined;
    }
    if (!geocoderEnabled) {
      setAddress(null);
      return undefined;
    }
    const key = `${position.latitude.toFixed(4)},${position.longitude.toFixed(4)}`;
    if (cacheRef.current.has(key)) {
      setAddress(cacheRef.current.get(key));
      return undefined;
    }
    let cancelled = false;
    const query = new URLSearchParams({
      latitude: position.latitude,
      longitude: position.longitude,
    });
    fetchOrThrow(`/api/server/geocode?${query.toString()}`)
      .then((response) => response.text())
      .then((text) => {
        if (!cancelled) {
          cacheRef.current.set(key, text);
          setAddress(text);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAddress(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [position.latitude, position.longitude, position.address, geocoderEnabled]);

  return (
    <div style={{ color, ...style }}>
      {address ||
        formatAddress(
          { latitude: position.latitude, longitude: position.longitude },
          coordinateFormat,
        )}
    </div>
  );
};

export default LsAddress;
