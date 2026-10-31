import { area as turfArea, feature as turfFeature, kinks } from '@turf/turf';
import {
  bboxOfGeometry,
  getAllRings,
  getPolygonSets,
  isPosition,
  forEachPosition
} from './geojson.js';
import { TOLERANCES } from './constants.js';

/**
 * Inspección estructural de la geometría. Devuelve banderas y detalles;
 * la creación de incidencias se hace en structure.js / engine.js.
 */
export function inspectGeometry(geometry) {
  const result = {
    empty: true,
    polygons: 0,
    rings: 0,
    badRings: 0,
    unclosedRings: 0,
    outOfRangeCount: 0,
    invalidPositionCount: 0,
    firstInvalidPosition: null,
    bbox: null,
    issues: []
  };

  const polygonSets = getPolygonSets(geometry);
  if (polygonSets.length === 0) {
    result.issues.push({
      code: 'GEO-002',
      descripcion: 'La geometría no contiene polígonos utilizables.'
    });
    return result;
  }

  result.polygons = polygonSets.length;

  for (const rings of polygonSets) {
    if (!Array.isArray(rings) || rings.length === 0) continue;
    for (const ring of rings) {
      if (!Array.isArray(ring)) {
        result.badRings += 1;
        continue;
      }
      if (ring.length === 0) continue;
      result.empty = false;
      result.rings += 1;

      if (ring.length < 4) {
        result.badRings += 1;
      }

      const first = ring[0];
      const last = ring[ring.length - 1];
      const closed =
        isPosition(first) &&
        isPosition(last) &&
        Math.abs(first[0] - last[0]) <= TOLERANCES.coordinateEpsilon &&
        Math.abs(first[1] - last[1]) <= TOLERANCES.coordinateEpsilon;
      if (!closed) result.unclosedRings += 1;

      for (const position of ring) {
        if (!isPosition(position)) {
          result.invalidPositionCount += 1;
          if (!result.firstInvalidPosition) result.firstInvalidPosition = position;
          continue;
        }
        const [lon, lat] = position;
        if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
          result.outOfRangeCount += 1;
          if (!result.firstInvalidPosition) result.firstInvalidPosition = position;
        }
      }
    }
  }

  if (result.empty) {
    result.issues.push({
      code: 'GEO-002',
      descripcion: 'La geometría no contiene coordenadas utilizables.'
    });
    return result;
  }

  if (result.badRings > 0) {
    result.issues.push({
      code: 'GEO-009',
      descripcion: `La geometría contiene ${result.badRings} anillo(s) con menos de 4 posiciones o con estructura inválida.`,
      valorObservado: `${result.badRings} anillo(s)`
    });
  }

  if (result.unclosedRings > 0) {
    result.issues.push({
      code: 'GEO-003',
      descripcion: `La geometría contiene ${result.unclosedRings} anillo(s) cuyo primer y último par ordenado no coinciden.`,
      valorObservado: `${result.unclosedRings} anillo(s) no cerrado(s)`
    });
  }

  const invalidCoordinates = result.outOfRangeCount + result.invalidPositionCount;
  if (invalidCoordinates > 0) {
    result.issues.push({
      code: 'GEO-001',
      descripcion: `La geometría contiene ${invalidCoordinates} posición(es) fuera del rango geográfico válido o no numérica(s).`,
      valorObservado: JSON.stringify(result.firstInvalidPosition)
    });
  }

  result.bbox = bboxOfGeometry(geometry);
  return result;
}

/** Área geodésica en m² usando Turf (no es un cálculo planar sobre grados). */
export function computeAreaM2(geometry) {
  if (!geometry || !Array.isArray(geometry.coordinates)) return null;
  try {
    const value = turfArea(turfFeature(geometry));
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * Detecta autointersecciones con turf.kinks sobre cada polígono.
 * Devuelve {detectado, puntos, error}. Si Turf falla, se informa el error
 * en lugar de asumir que la geometría es válida.
 */
export function detectSelfIntersection(geometry) {
  const polygonSets = getPolygonSets(geometry);
  if (polygonSets.length === 0) return { detectado: false, puntos: 0, error: null };

  let total = 0;
  for (const rings of polygonSets) {
    if (!Array.isArray(rings) || rings.length === 0) continue;
    try {
      const polygonFeature = turfFeature({ type: 'Polygon', coordinates: rings });
      const found = kinks(polygonFeature);
      total += found.features.length;
    } catch (error) {
      return { detectado: false, puntos: total, error: error.message };
    }
  }
  return { detectado: total > 0, puntos: total, error: null };
}

export function isZeroArea(areaM2) {
  return areaM2 !== null && areaM2 <= TOLERANCES.zeroAreaM2;
}

export function geometryIsEmpty(geometry) {
  const rings = getAllRings(geometry);
  return !rings.some((ring) => Array.isArray(ring) && ring.length > 0);
}

export function coordinatesOutOfRange(geometry) {
  let invalid = 0;
  forEachPosition(geometry, (position) => {
    if (!isPosition(position)) {
      invalid += 1;
      return;
    }
    const [lon, lat] = position;
    if (lon < -180 || lon > 180 || lat < -90 || lat > 90) invalid += 1;
  });
  return invalid;
}
