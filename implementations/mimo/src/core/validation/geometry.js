/**
 * Validación geométrica de predios (Polygon/MultiPolygon).
 * Ejecutable sin DOM ni MapLibre.
 */
import { kinks, area as turfArea } from '@turf/turf';
import { makeIncident, featureRef } from '../dataLoader.js';
import { DEFAULT_CONFIG } from '../../config/constants.js';

const GEO_TYPES = new Set(['Polygon', 'MultiPolygon']);

export function isEvaluatableGeometry(geometry) {
  return Boolean(geometry) && GEO_TYPES.has(geometry.type) && Array.isArray(geometry.coordinates) && geometry.coordinates.length > 0;
}

function ringsOf(geometry) {
  if (geometry.type === 'Polygon') return geometry.coordinates;
  return geometry.coordinates.flat(); // MultiPolygon
}

/** Recorre todos los anillos y aplica visitor(ring, ringIndex). */
function forEachRing(geometry, visitor) {
  if (geometry.type === 'Polygon') {
    geometry.coordinates.forEach((ring, i) => visitor(ring, i));
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach((poly, pi) => poly.forEach((ring, i) => visitor(ring, `${pi}-${i}`)));
  }
}

/**
 * Ejecuta las reglas geométricas sobre una feature.
 * @returns {{ incidents: object[], geometryOk: boolean }}
 */
export function validateGeometry(feature, index, config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const incidents = [];
  const ref = featureRef(feature, index);
  const geometry = feature?.geometry ?? null;

  if (geometry === null || geometry === undefined) {
    incidents.push(makeIncident({
      ruleCode: 'STR-005',
      featureRef: ref,
      description: 'La feature no tiene geometría (geometry=null).',
      observedValue: 'null',
      criterion: 'Todo predio catastral debe tener una geometría para su evaluación.',
    }));
    return { incidents, geometryOk: false };
  }

  if (typeof geometry !== 'object' || !GEO_TYPES.has(geometry.type)) {
    incidents.push(makeIncident({
      ruleCode: 'STR-006',
      featureRef: ref,
      description: `Tipo de geometría no admitido para evaluación predial: ${geometry?.type ?? 'desconocido'}.`,
      observedValue: geometry?.type ?? typeof geometry,
      criterion: 'Se evalúan únicamente Polygon y MultiPolygon; otras geometrías se excluyen del análisis métrico.',
    }));
    return { incidents, geometryOk: false };
  }

  if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) {
    incidents.push(makeIncident({
      ruleCode: 'GEO-002',
      featureRef: ref,
      description: 'La geometría no contiene coordenadas (geometría vacía).',
      observedValue: 'coordinates=[]',
      criterion: 'Una geometría admisible debe contener al menos un anillo con 4 posiciones.',
    }));
    return { incidents, geometryOk: false };
  }

  let rangeOk = true;
  let closedOk = true;
  let shortRing = false;

  forEachRing(geometry, (ring, ringIndex) => {
    if (!Array.isArray(ring) || ring.length < 4) {
      shortRing = true;
      return;
    }
    for (const pos of ring) {
      if (!Array.isArray(pos) || pos.length < 2
        || !Number.isFinite(pos[0]) || !Number.isFinite(pos[1])
        || pos[0] < -180 || pos[0] > 180 || pos[1] < -90 || pos[1] > 90) {
        rangeOk = false;
        break;
      }
    }
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (!Array.isArray(first) || !Array.isArray(last) || first[0] !== last[0] || first[1] !== last[1]) {
      closedOk = false;
    }
  });

  if (shortRing) {
    incidents.push(makeIncident({
      ruleCode: 'GEO-002',
      featureRef: ref,
      description: 'Un anillo contiene menos de 4 posiciones: geometría insuficiente.',
      observedValue: 'anillo con < 4 posiciones',
      criterion: 'RFC 7946: un anillo de polígono debe tener al menos 4 posiciones y estar cerrado.',
    }));
  }

  if (!rangeOk) {
    incidents.push(makeIncident({
      ruleCode: 'GEO-001',
      featureRef: ref,
      description: 'Coordenadas fuera de rango: longitud fuera de [-180,180], latitud fuera de [-90,90] o valores no finitos.',
      observedValue: 'posición inválida en coordinates',
      criterion: 'RFC 7946: posiciones WGS84 en orden [longitud, latitud] dentro de rango.',
    }));
  }

  if (!closedOk) {
    incidents.push(makeIncident({
      ruleCode: 'GEO-003',
      featureRef: ref,
      description: 'Anillo de polígono no cerrado: la primera y la última posición no coinciden.',
      observedValue: 'primera posición != última posición',
      criterion: 'RFC 7946: los anillos deben estar cerrados (primera posición repetida al final).',
    }));
  }

  const structurallyDrawable = rangeOk && closedOk && !shortRing;

  if (structurallyDrawable) {
    let selfIntersects = false;
    try {
      const k = kinks(geometry);
      selfIntersects = Boolean(k?.features?.length);
    } catch {
      selfIntersects = false; // kinks no pudo evaluar: GEO-004 queda no evaluado
    }
    if (selfIntersects) {
      incidents.push(makeIncident({
        ruleCode: 'GEO-004',
        featureRef: ref,
        description: 'La geometría del predio se autointerseca (no es un polígono simple).',
        observedValue: `${kinks(geometry).features.length} punto(s) de autointersección`,
        criterion: 'Un polígono catastral válido no debe tener autointersecciones en sus anillos.',
      }));
    }

    let computedArea = 0;
    try {
      computedArea = turfArea(geometry);
    } catch {
      computedArea = 0;
    }
    if (computedArea < cfg.zeroAreaM2) {
      incidents.push(makeIncident({
        ruleCode: 'GEO-006',
        featureRef: ref,
        description: `El polígono tiene área geodésica prácticamente cero (${computedArea.toFixed(4)} m²).`,
        observedValue: computedArea,
        criterion: `Área geodésica menor que ${cfg.zeroAreaM2} m².`,
      }));
    }
  }

  const geometryOk = structurallyDrawable
    && !incidents.some((i) => ['GEO-004', 'GEO-006'].includes(i.rule_code));

  return { incidents, geometryOk };
}

/** Serialización estable para detectar geometrías idénticas (limitación: igualdad exacta). */
export function geometryKey(geometry) {
  try {
    return JSON.stringify(geometry.coordinates);
  } catch {
    return null;
  }
}

export { ringsOf };
