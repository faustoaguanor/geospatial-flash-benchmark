/**
 * Calidad geométrica: coordenadas fuera de rango, geometrías vacías,
 * anillos no cerrados, autointersecciones, geometrías duplicadas y área cero.
 *
 * Tolerancias y limitaciones (documentadas):
 *  - Cierre de anillo: se exige coincidencia exacta (RFC 7946) con tolerancia
 *    de 1e-9 grados para absorber ruido de serialización.
 *  - Autointersección: intersección estricta (orientaciones opuestas) entre
 *    segmentos no adyacentes del mismo anillo. Los contactos colineales
 *    superpuestos entre segmentos no adyacentes no se detectan (limitación).
 *  - Área cero: área geodésica < 0.01 m².
 *  - Duplicidad: comparación por firma canónica de coordenadas (exacta).
 */
import turfArea from '@turf/area';
import { createIncident } from './incidentModel.js';

const RING_CLOSURE_EPS = 1e-9;
const ZERO_AREA_EPS_M2 = 0.01;

/** Itera todos los anillos de una geometría Polygon/MultiPolygon. */
export function* iterateRings(geometry) {
  if (!geometry) return;
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  for (const poly of polys) {
    if (!Array.isArray(poly)) continue;
    for (const ring of poly) {
      if (Array.isArray(ring)) yield ring;
    }
  }
}

/**
 * Detecta si un anillo cerrado se autointerseca.
 * Devuelve true si algún par de segmentos NO adyacentes se cruza.
 */
export function ringIsSelfIntersecting(ring) {
  const n = ring.length;
  if (n < 4) return false; // un anillo cerrado mínimo tiene 4 posiciones
  const segCount = n - 1; // asumiendo anillo cerrado (first == last)
  for (let i = 0; i < segCount; i++) {
    if (segmentLength(ring[i], ring[i + 1]) === 0) continue;
    for (let j = i + 1; j < segCount; j++) {
      // adyacencia: segmentos consecutivos y el par último-primero
      if (j === i + 1) continue;
      if (i === 0 && j === segCount - 1) continue;
      if (segmentLength(ring[j], ring[j + 1]) === 0) continue;
      if (segmentsProperlyIntersect(ring[i], ring[i + 1], ring[j], ring[j + 1])) {
        return true;
      }
    }
  }
  return false;
}

function segmentLength(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.sqrt(dx * dx + dy * dy);
}

/** Test de intersección estricta (cruce) entre dos segmentos. */
export function segmentsProperlyIntersect(p1, p2, p3, p4) {
  const d1 = crossOrientation(p3, p4, p1);
  const d2 = crossOrientation(p3, p4, p2);
  const d3 = crossOrientation(p1, p2, p3);
  const d4 = crossOrientation(p1, p2, p4);
  const EPS = 1e-12;
  const s1 = Math.sign(d1 > EPS ? 1 : d1 < -EPS ? -1 : 0);
  const s2 = Math.sign(d2 > EPS ? 1 : d2 < -EPS ? -1 : 0);
  const s3 = Math.sign(d3 > EPS ? 1 : d3 < -EPS ? -1 : 0);
  const s4 = Math.sign(d4 > EPS ? 1 : d4 < -EPS ? -1 : 0);
  return (s1 * s2 < 0) && (s3 * s4 < 0);
}

function crossOrientation(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

/** Firma canónica exacta de una geometría (para detectar duplicadas). */
export function geometrySignature(geometry) {
  return JSON.stringify(roundCoordinates(geometry.coordinates));
}

function roundCoordinates(node, depth = 0) {
  if (!Array.isArray(node)) return node;
  if (depth >= 2 && typeof node[0] === 'number') {
    return node.map((v) => Number(v.toFixed(9)));
  }
  return node.map((child) => roundCoordinates(child, depth + 1));
}

/**
 * Evalúa la calidad geométrica de todos los features (Polygon/MultiPolygon).
 */
export function evaluateGeometry(features) {
  const incidents = [];

  for (const feature of features) {
    const props = feature.properties || {};
    const predioId = props.id_predio ?? 'sin-id';
    const geometry = feature.geometry;
    const coordinates = geometry?.coordinates;

    // Geometría vacía / sin posiciones
    const hasPositions = countPositions(coordinates) > 0;
    if (!hasPositions) {
      incidents.push(createIncident({
        ruleCode: 'GEOM_VACIA',
        predioId,
        dimension: 'completitud',
        severity: 'error',
        description: 'Geometría vacía o sin posiciones.',
        observedValue: `geometry.type = ${geometry.type}, sin coordenadas utilizables`,
        criterion: 'Un polígono debe tener al menos un anillo con 4 posiciones (cerrado).'
      }));
      continue;
    }

    // Coordenadas fuera de rango
    const badCoord = findOutOfRangeCoordinate(coordinates);
    if (badCoord) {
      incidents.push(createIncident({
        ruleCode: 'GEOM_COORD_FUERA_RANGO',
        predioId,
        dimension: 'consistencia_logica',
        severity: 'error',
        description: 'Coordenada fuera del rango WGS84 válido o no finita.',
        observedValue: `coordenada [${badCoord[0]}, ${badCoord[1]}]`,
        criterion: 'RFC 7946: long ∈ [-180, 180], lat ∈ [-90, 90], valores finitos.'
      }));
    }

    // Anillos no cerrados
    for (const ring of iterateRings(geometry)) {
      if (ring.length >= 2 && !ringIsClosed(ring)) {
        incidents.push(createIncident({
          ruleCode: 'GEOM_ANILLO_NO_CERRADO',
          predioId,
          dimension: 'consistencia_logica',
          severity: 'error',
          description: 'Anillo de polígono no cerrado (primera y última posición distintas).',
          observedValue: `primero = [${ring[0]}], último = [${ring[ring.length - 1]}]`,
          criterion: 'RFC 7946: el primer y último punto de cada anillo deben coincidir.'
        }));
      }
    }

    // Autointersección
    for (const ring of iterateRings(geometry)) {
      if (ringIsSelfIntersecting(ring)) {
        incidents.push(createIncident({
          ruleCode: 'GEOM_AUTOINTERSECCION',
          predioId,
          dimension: 'consistencia_logica',
          severity: 'error',
          description: 'El anillo del polígono se autointerseca (no es un anillo simple).',
          observedValue: `anillo con ${ring.length - 1} vértices autointersecado`,
          criterion: 'Los anillos de un polígono deben ser simples (sin autointersecciones).'
        }));
        break; // una sola incidencia por predio
      }
    }

    // Área (casi) cero
    let area = null;
    try {
      area = turfArea(feature);
    } catch {
      area = null;
    }
    if (area !== null && area < ZERO_AREA_EPS_M2) {
      incidents.push(createIncident({
        ruleCode: 'GEOM_AREA_CERO',
        predioId,
        dimension: 'consistencia_logica',
        severity: 'error',
        description: 'Polígono con área (casi) cero.',
        observedValue: `área geodésica = ${area} m²`,
        criterion: `Área mínima esperada: ${ZERO_AREA_EPS_M2} m² (tolerancia del experimento).`
      }));
    }
  }

  // Geometrías duplicadas
  const seen = new Map();
  for (const feature of features) {
    const predioId = feature.properties?.id_predio ?? 'sin-id';
    const sig = geometrySignature(feature.geometry);
    if (!seen.has(sig)) {
      seen.set(sig, predioId);
      continue;
    }
    const firstId = seen.get(sig);
    incidents.push(createIncident({
      ruleCode: 'GEOM_DUPLICADA',
      predioId,
      dimension: 'consistencia_logica',
      severity: 'error',
      description: 'Geometría idéntica a la de otro predio.',
      observedValue: `misma firma de coordenadas que ${firstId}`,
      criterion: 'Cada predio debe tener una geometría propia; dos predios no pueden ocupar exactamente el mismo polígono.',
      relatedPredioIds: [firstId, predioId]
    }));
  }

  return incidents;
}

function ringIsClosed(ring) {
  const first = ring[0];
  const last = ring[ring.length - 1];
  return Math.abs(first[0] - last[0]) <= RING_CLOSURE_EPS &&
         Math.abs(first[1] - last[1]) <= RING_CLOSURE_EPS;
}

function countPositions(node) {
  if (!Array.isArray(node)) return 0;
  if (node.length >= 2 && typeof node[0] === 'number' && typeof node[1] === 'number') return 1;
  let count = 0;
  for (const child of node) count += countPositions(child);
  return count;
}

function findOutOfRangeCoordinate(node) {
  if (!Array.isArray(node)) return null;
  if (node.length >= 2 && typeof node[0] === 'number' && typeof node[1] === 'number') {
    const [lon, lat] = node;
    if (!Number.isFinite(lon) || !Number.isFinite(lat) ||
        lon < -180 || lon > 180 || lat < -90 || lat > 90) {
      return node;
    }
    return null;
  }
  for (const child of node) {
    const found = findOutOfRangeCoordinate(child);
    if (found) return found;
  }
  return null;
}
