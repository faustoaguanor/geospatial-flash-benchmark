/**
 * Análisis topológico entre predios: superposiciones con área positiva,
 * contacto por borde y contacto por vértice.
 *
 * Compartir un borde o un vértice NO se clasifica como superposición.
 *
 * Metodología y tolerancias (documentadas):
 *  - Rechazo rápido por bounding box antes de calcular intersecciones.
 *  - Si dos geometrías son idénticas (misma firma), se omite el análisis del par:
 *    ya se reporta mediante GEOM_DUPLICADA y no se duplica como solapamiento.
 *  - Superposición: la intersección geométrica (turf.intersect) produce un
 *    polígono con área > OVERLAP_EPS_M2 (0.01 m²).
 *  - Contacto por borde: los límites comparten un tramo de línea
 *    (turf.lineOverlap con tolerancia 1e-7 grados).
 *  - Contacto por vértice: los límites se cruzan solo en puntos
 *    (turf.lineIntersect).
 *  - Si Turf falla al procesar un par (geometrías degeneradas), el par se
 *    omite y la omisión queda registrada en `skippedPairs`.
 *
 * Complejidad: O(n²) sobre el número de predios. Documentado como limitación
 * de rendimiento para colecciones muy grandes (ver README).
 */
import turfArea from '@turf/area';
import turfIntersect from '@turf/intersect';
import { featureCollection } from '@turf/helpers';
import turfPolygonToLine from '@turf/polygon-to-line';
import turfLineOverlap from '@turf/line-overlap';
import turfLineIntersect from '@turf/line-intersect';
import { createIncident } from './incidentModel.js';
import { geometrySignature } from './geometricQuality.js';

const OVERLAP_EPS_M2 = 0.01;
const LINE_TOLERANCE_DEG = 1e-7;

function bboxOf(geometry) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const walk = (node) => {
    if (!Array.isArray(node)) return;
    if (node.length >= 2 && typeof node[0] === 'number' && typeof node[1] === 'number') {
      if (node[0] < minX) minX = node[0];
      if (node[0] > maxX) maxX = node[0];
      if (node[1] < minY) minY = node[1];
      if (node[1] > maxY) maxY = node[1];
      return;
    }
    node.forEach(walk);
  };
  walk(geometry.coordinates);
  if (minX === Infinity) return null;
  return [minX, minY, maxX, maxY];
}

function bboxesIntersect(a, b, eps = 1e-12) {
  return !(a[2] < b[0] - eps || b[2] < a[0] - eps || a[3] < b[1] - eps || b[3] < a[1] - eps);
}

function idOf(feature, fallback) {
  return feature.properties?.id_predio ?? fallback;
}

/**
 * Evalúa la topología entre pares de predios.
 * Devuelve { incidents, skippedPairs }.
 */
export function evaluateTopology(features) {
  const incidents = [];
  let skippedPairs = 0;

  const items = features.map((feature, index) => ({
    feature,
    id: idOf(feature, `feature[${index}]`),
    bbox: bboxOf(feature.geometry),
    signature: geometrySignature(feature.geometry)
  }));

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];

      if (!a.bbox || !b.bbox || !bboxesIntersect(a.bbox, b.bbox)) continue;
      // geometrías idénticas: ya reportadas por GEOM_DUPLICADA
      if (a.signature === b.signature) continue;

      let inter = null;
      let failed = false;
      try {
        // Turf v7: intersect recibe un FeatureCollection de geometrías
        inter = turfIntersect(featureCollection([a.feature, b.feature]));
      } catch {
        failed = true;
      }

      if (!failed && inter) {
        const area = turfArea(inter);
        if (area > OVERLAP_EPS_M2) {
          incidents.push(createIncident({
            ruleCode: 'TOPO_SOLAPAMIENTO',
            predioId: b.id,
            dimension: 'consistencia_logica',
            severity: 'error',
            description: 'Superposición entre predios con superficie positiva.',
            observedValue: `área de intersección ≈ ${area.toFixed(2)} m²`,
            criterion: `Dos predios no pueden superponerse (tolerancia: ${OVERLAP_EPS_M2} m² del experimento).`,
            relatedPredioIds: [a.id, b.id]
          }));
          continue;
        }
        // intersección de relleno despreciable: tratar como contacto
      } else if (failed) {
        // turf.intersect puede fallar con geometrías degeneradas o contactos
        // exactos; se intenta clasificar el contacto antes de omitir el par.
        const contact = classifyContact(a.feature, b.feature);
        if (contact === 'borde') {
          incidents.push(createIncident({
            ruleCode: 'TOPO_CONTACTO_BORDE',
            predioId: b.id,
            dimension: 'consistencia_logica',
            severity: 'info',
            description: 'Los predios comparten un borde sin superponerse (topológicamente válido).',
            observedValue: 'límites con tramo compartido',
            criterion: 'Compartir borde no constituye superposición.'
          }));
        } else if (contact === 'vertice') {
          incidents.push(createIncident({
            ruleCode: 'TOPO_CONTACTO_VERTICE',
            predioId: b.id,
            dimension: 'consistencia_logica',
            severity: 'info',
            description: 'Los predios se tocan en un vértice sin superponerse (topológicamente válido).',
            observedValue: 'límites con punto de contacto',
            criterion: 'Compartir vértice no constituye superposición.'
          }));
        } else {
          skippedPairs++;
        }
        continue;
      }

      // contacto: borde o vértice
      const contact = classifyContact(a.feature, b.feature);
      if (contact === 'borde') {
        incidents.push(createIncident({
          ruleCode: 'TOPO_CONTACTO_BORDE',
          predioId: b.id,
          dimension: 'consistencia_logica',
          severity: 'info',
          description: 'Los predios comparten un borde sin superponerse (topológicamente válido).',
          observedValue: 'límites con tramo compartido',
          criterion: 'Compartir borde no constituye superposición.'
        }));
      } else if (contact === 'vertice') {
        incidents.push(createIncident({
          ruleCode: 'TOPO_CONTACTO_VERTICE',
          predioId: b.id,
          dimension: 'consistencia_logica',
          severity: 'info',
          description: 'Los predios se tocan en un vértice sin superponerse (topológicamente válido).',
          observedValue: 'límites con punto de contacto',
          criterion: 'Compartir vértice no constituye superposición.'
        }));
      }
    }
  }

  return { incidents, skippedPairs };
}

function classifyContact(featureA, featureB) {
  try {
    const lineA = turfPolygonToLine(featureA);
    const lineB = turfPolygonToLine(featureB);
    const overlapLines = turfLineOverlap(lineA, lineB, { tolerance: LINE_TOLERANCE_DEG });
    if (overlapLines && overlapLines.features.length > 0) return 'borde';
    const points = turfLineIntersect(lineA, lineB);
    if (points && points.features.length > 0) return 'vertice';
  } catch {
    return null;
  }
  return null;
}
