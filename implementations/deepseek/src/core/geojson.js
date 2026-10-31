/** Utilidades GeoJSON puras, sin dependencias del DOM. */

export function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function getProperties(feature) {
  return isPlainObject(feature?.properties) ? feature.properties : {};
}

export function getGeometry(feature) {
  return feature?.geometry ?? null;
}

/**
 * Identificador de presentación del predio. No garantiza unicidad: la
 * unicidad se valida con la regla ALF-001.
 */
export function resolvePredioId(feature, index) {
  const raw = getProperties(feature).id;
  if (typeof raw === 'string' && raw.trim() !== '') return raw.trim();
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
  return `SIN-ID-${index + 1}`;
}

/** Clave interna única por posición en el arreglo, para conteos sin doble conteo. */
export function makeEntityId(index) {
  return `F-${index + 1}`;
}

export function isPosition(value) {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  );
}

/**
 * Devuelve los polígonos de una geometría como [anilloExterior, ...huecos].
 * Polygon -> [coords]; MultiPolygon -> coords.
 */
export function getPolygonSets(geometry) {
  if (!isPlainObject(geometry)) return [];
  if (geometry.type === 'Polygon' && Array.isArray(geometry.coordinates)) {
    return [geometry.coordinates];
  }
  if (geometry.type === 'MultiPolygon' && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates;
  }
  return [];
}

export function getAllRings(geometry) {
  return getPolygonSets(geometry).flatMap((rings) => (Array.isArray(rings) ? rings : []));
}

export function forEachPosition(geometry, callback) {
  for (const ring of getAllRings(geometry)) {
    if (!Array.isArray(ring)) continue;
    for (const position of ring) {
      callback(position);
    }
  }
}

/** Clave canónica para detectar geometrías duplicadas. */
export function geometryKey(geometry, decimals = 7) {
  if (!isPlainObject(geometry) || !Array.isArray(geometry.coordinates)) return null;
  const factor = 10 ** decimals;
  const round = (value) =>
    Array.isArray(value)
      ? value.map(round)
      : typeof value === 'number'
        ? Math.round(value * factor) / factor
        : value;
  return `${geometry.type}:${JSON.stringify(round(geometry.coordinates))}`;
}

export function bboxOfGeometry(geometry) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  forEachPosition(geometry, ([x, y]) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  });
  if (!Number.isFinite(minX)) return null;
  return [minX, minY, maxX, maxY];
}

export function bboxesIntersect(a, b) {
  if (!a || !b) return false;
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}

export function unionBboxes(boxes) {
  const valid = boxes.filter(Boolean);
  if (valid.length === 0) return null;
  return valid.reduce(
    (acc, box) => [
      Math.min(acc[0], box[0]),
      Math.min(acc[1], box[1]),
      Math.max(acc[2], box[2]),
      Math.max(acc[3], box[3])
    ],
    [Infinity, Infinity, -Infinity, -Infinity]
  );
}

/** Formato legible para valores observados. */
export function formatObserved(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NaN';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}
