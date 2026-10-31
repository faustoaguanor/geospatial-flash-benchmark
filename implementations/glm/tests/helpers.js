/** Utilidades compartidas para construir features de prueba. */
import turfArea from '@turf/area';

export const QUITO = { lon: -78.4875, lat: -0.1795 };
export const M_PER_DEG_LAT = 110574;
export const mPerDegLon = (lat) => 111320 * Math.cos((lat * Math.PI) / 180);

/** Anillo rectangular cerrado de w×d metros centrado en (lon, lat), sin rotación. */
export function squareRing(lon, lat, w = 10, d = 10) {
  const mLon = mPerDegLon(lat);
  const c = (dx, dy) => [
    Number((lon + dx / mLon).toFixed(7)),
    Number((lat + dy / M_PER_DEG_LAT).toFixed(7))
  ];
  return [
    c(-w / 2, -d / 2), c(w / 2, -d / 2), c(w / 2, d / 2), c(-w / 2, d / 2), c(-w / 2, -d / 2)
  ];
}

/** Predio sintético válido con área registrada coherente con su geometría. */
export function makeFeature({
  id = 'P-0001',
  clave = 'SIM-90-TEST-00001',
  ring = squareRing(QUITO.lon, QUITO.lat),
  geom = null,
  overrides = {}
} = {}) {
  const geometry = geom || { type: 'Polygon', coordinates: [ring] };
  const area = Number(turfArea({ type: 'Feature', properties: {}, geometry }).toFixed(2));
  return {
    type: 'Feature',
    properties: {
      id_predio: id,
      clave_catastral: clave,
      sector: 'La Carolina',
      direccion: 'Calle de prueba 123',
      area_terreno_m2: area,
      area_construida_m2: Number((area * 2 * 0.7).toFixed(2)),
      num_pisos: 2,
      ano_construccion: 2000,
      uso_suelo: 'Residencial',
      estado_conservacion: 'Bueno',
      ...overrides
    },
    geometry
  };
}

/** Anillo rectangular cerrado desplazado dxM, dyM metros desde el centro base.
 *  Usa la misma conversión y redondeo que squareRing, de modo que bordes
 *  coincidentes sean EXACTAMENTE iguales (para pruebas de contacto). */
export function squareAtOffset(dxM, dyM, w = 10, d = 10) {
  return squareRing(
    QUITO.lon + dxM / mPerDegLon(QUITO.lat),
    QUITO.lat + dyM / M_PER_DEG_LAT,
    w, d
  );
}

export function fc(...features) {
  return { type: 'FeatureCollection', features };
}

export function ruleCounts(incidents) {
  const counts = {};
  for (const inc of incidents) counts[inc.codigo_regla] = (counts[inc.codigo_regla] || 0) + 1;
  return counts;
}
