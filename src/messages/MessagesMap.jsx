import { useEffect, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import MapView, { map } from '../map/core/MapView';
import MapGeofence from '../map/MapGeofence';
import MapRoutePath from '../map/MapRoutePath';
import MapRoutePoints from '../map/MapRoutePoints';
import MapPositions from '../map/MapPositions';
import MapScale from '../map/MapScale';
import { hasCoordinates, messageTime } from './messagesUtil';

// A parked unit sends every message from the same spot. Without a limit the
// map would zoom in until there is no imagery left.
const FIT_MAX_ZOOM = 16;
const UNIT_ZOOM = 14;

// This interface is based on Traccar Web 6.14.4, where every map layer uses
// plain [longitude, latitude]. From 6.14.5 on there is a helper with this same
// name in map/core/mapUtil that also converts to the map's coordinate system;
// after such an update, import that one and delete this line.
const toMapCoordinates = (longitude, latitude) => [longitude, latitude];

// Frames the whole result, or the unit itself while there is nothing to frame.
const MapFit = ({ positions, unitPosition }) => {
  useEffect(() => {
    if (positions.length) {
      const coordinates = positions.map((item) => toMapCoordinates(item.longitude, item.latitude));
      const bounds = coordinates.reduce(
        (result, item) => result.extend(item),
        new maplibregl.LngLatBounds(coordinates[0], coordinates[0]),
      );
      // Room for the marker and its time label, which sit above the last point
      // and would be cut off at the edge of a small map. The marker of this
      // interface is a pin that stands on the point, so most of the room goes
      // to the top.
      const { clientWidth, clientHeight } = map.getContainer();
      const side = Math.min(76, clientWidth * 0.2);
      map.fitBounds(bounds, {
        padding: {
          top: Math.min(88, clientHeight * 0.3),
          bottom: Math.min(28, clientHeight * 0.12),
          left: side,
          right: side,
        },
        maxZoom: FIT_MAX_ZOOM,
        duration: 0,
      });
    } else if (hasCoordinates(unitPosition)) {
      map.jumpTo({
        center: toMapCoordinates(unitPosition.longitude, unitPosition.latitude),
        zoom: UNIT_ZOOM,
      });
    }
  }, [positions, unitPosition]);

  return null;
};

// Brings the selected message into view without changing the zoom, and only
// when it is outside the visible area, so the map does not jump on every click.
const MapFocus = ({ position }) => {
  useEffect(() => {
    if (hasCoordinates(position)) {
      const point = toMapCoordinates(position.longitude, position.latitude);
      if (!map.getBounds().contains(point)) {
        map.easeTo({ center: point });
      }
    }
  }, [position]);

  return null;
};

const MessagesMap = ({
  track,
  fitPositions,
  selectedPosition,
  endPosition,
  unitPosition,
  onPointClick,
}) => {
  // The marker label shows the message time (device time), like the table.
  const messageMarker = useMemo(() => {
    const source = selectedPosition || endPosition;
    return hasCoordinates(source) ? [{ ...source, fixTime: messageTime(source) }] : null;
  }, [selectedPosition, endPosition]);

  // Without a message to point at, the unit is shown where it is now.
  const unitMarker = useMemo(
    () => (hasCoordinates(unitPosition) ? [unitPosition] : null),
    [unitPosition],
  );

  return (
    <>
      <MapView>
        <MapGeofence />
        {track.length > 0 && (
          <>
            <MapRoutePath positions={track} />
            <MapRoutePoints positions={track} onClick={onPointClick} />
          </>
        )}
        {messageMarker && (
          <MapPositions key="message" positions={messageMarker} titleField="fixTime" />
        )}
        {!messageMarker && unitMarker && (
          <MapPositions key="unit" positions={unitMarker} showStatus />
        )}
      </MapView>
      <MapScale />
      <MapFit positions={fitPositions} unitPosition={unitPosition} />
      <MapFocus position={selectedPosition} />
    </>
  );
};

export default MessagesMap;
