// Limpeza visual do rastro (rastro ao vivo e Replay) - so mexe na EXIBICAO,
// nunca nos dados guardados no banco (o servidor continua salvando tudo).

// Abaixo disso (em nos, unidade que o Traccar usa p/ speed) conta como "parado".
// 1 no ~ 1.85 km/h.
export const STOPPED_SPEED_KNOTS = 1;

// Um "parado" com menos que isso (ex: sinal fechado rapido) nao ganha marcador,
// pra nao poluir o mapa com paradas de poucos segundos.
export const MIN_STOP_DURATION_MS = 60 * 1000;

// Douglas-Peucker: quanto maior, mais pontos redundantes a linha perde (e mais leve fica).
export const SIMPLIFY_TOLERANCE_METERS = 12;

const toRad = (deg) => (deg * Math.PI) / 180;

const distanceMeters = (a, b) => {
  const R = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

// Junta sequencias de posicoes quase paradas (velocidade abaixo do limiar) num unico
// ponto representativo, guardando por quanto tempo o veiculo ficou parado ali
// (lsStopped/lsStopDurationMs) - e assim mata a "aranha" de deriva de GPS parado.
export const collapseStops = (positions, stoppedSpeedKnots = STOPPED_SPEED_KNOTS) => {
  const result = [];
  let i = 0;
  while (i < positions.length) {
    const position = positions[i];
    if ((position.speed || 0) > stoppedSpeedKnots) {
      result.push(position);
      i += 1;
    } else {
      let j = i;
      while (j + 1 < positions.length && (positions[j + 1].speed || 0) <= stoppedSpeedKnots) {
        j += 1;
      }
      if (j > i) {
        const from = new Date(position.fixTime).getTime();
        const to = new Date(positions[j].fixTime).getTime();
        result.push({ ...position, lsStopped: true, lsStopDurationMs: to - from });
      } else {
        result.push(position);
      }
      i = j + 1;
    }
  }
  return result;
};

// Distancia perpendicular (em metros) do ponto ate a reta lineStart-lineEnd,
// usando projecao equiretangular local (precisa o bastante pra tolerancias pequenas).
const perpendicularDistanceMeters = (point, lineStart, lineEnd) => {
  if (lineStart.longitude === lineEnd.longitude && lineStart.latitude === lineEnd.latitude) {
    return distanceMeters(point, lineStart);
  }
  const lat0 = toRad(lineStart.latitude);
  const scaleX = Math.cos(lat0) * 111320;
  const scaleY = 110540;
  const toXY = (p) => [
    (p.longitude - lineStart.longitude) * scaleX,
    (p.latitude - lineStart.latitude) * scaleY,
  ];
  const [x, y] = toXY(point);
  const [ex, ey] = toXY(lineEnd);
  const lenSq = ex * ex + ey * ey;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, (x * ex + y * ey) / lenSq));
  return Math.hypot(x - ex * t, y - ey * t);
};

const douglasPeucker = (points, toleranceMeters) => {
  if (points.length < 3) {
    return points;
  }
  let maxDist = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const dist = perpendicularDistanceMeters(points[i], points[0], points[points.length - 1]);
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }
  if (maxDist > toleranceMeters) {
    const left = douglasPeucker(points.slice(0, index + 1), toleranceMeters);
    const right = douglasPeucker(points.slice(index), toleranceMeters);
    return [...left.slice(0, -1), ...right];
  }
  return [points[0], points[points.length - 1]];
};

// Simplifica um trajeto (array de posicoes com latitude/longitude) removendo pontos
// redundantes mas mantendo o formato do rastro.
export const simplifyPositions = (positions, toleranceMeters = SIMPLIFY_TOLERANCE_METERS) =>
  positions.length < 3 ? positions : douglasPeucker(positions, toleranceMeters);

// Mesma simplificacao, mas para coordenadas cruas [lon, lat] (usado no rastro ao vivo).
export const simplifyCoordinates = (coords, toleranceMeters = SIMPLIFY_TOLERANCE_METERS) => {
  if (coords.length < 3) {
    return coords;
  }
  const positions = coords.map(([longitude, latitude]) => ({ longitude, latitude }));
  return douglasPeucker(positions, toleranceMeters).map((p) => [p.longitude, p.latitude]);
};
