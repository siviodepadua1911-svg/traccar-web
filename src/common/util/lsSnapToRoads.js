const OSRM_URL = 'https://router.project-osrm.org/match/v1/driving/';

const downsample = (positions, max) => {
  if (positions.length <= max) return positions;
  const step = (positions.length - 1) / (max - 1);
  const out = [];
  for (let i = 0; i < max; i += 1) {
    out.push(positions[Math.round(i * step)]);
  }
  return out;
};

export const snapPositions = async (positions) => {
  const sample = downsample(positions, 480).filter((p, i, arr) => {
    if (i === 0) return true;
    return new Date(p.fixTime).getTime() > new Date(arr[i - 1].fixTime).getTime();
  });
  const coords = [];
  const chunkSize = 96;
  for (let start = 0; start < sample.length - 1; start += chunkSize - 1) {
    const chunk = sample.slice(start, start + chunkSize);
    if (chunk.length < 2) break;
    const points = chunk.map((p) => `${p.longitude.toFixed(6)},${p.latitude.toFixed(6)}`).join(';');
    const timestamps = chunk.map((p) => Math.round(new Date(p.fixTime).getTime() / 1000)).join(';');
    const radiuses = chunk.map(() => 30).join(';');
    const url = `${OSRM_URL}${points}?overview=full&geometries=geojson&timestamps=${timestamps}&radiuses=${radiuses}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Serviço de suavização indisponível agora — tente de novo em instantes');
    }
    const data = await response.json();
    if (data.code !== 'Ok' || !data.matchings || !data.matchings.length) {
      throw new Error('Não foi possível suavizar este trajeto');
    }
    data.matchings.forEach((m) => {
      m.geometry.coordinates.forEach((c) => coords.push(c));
    });
    await new Promise((resolve) => { setTimeout(resolve, 250); });
  }
  if (coords.length < 2) {
    throw new Error('Não foi possível suavizar este trajeto');
  }
  return coords;
};

export default snapPositions;
