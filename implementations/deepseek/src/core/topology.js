import {
  area as turfArea,
  booleanPointOnLine,
  feature as turfFeature,
  featureCollection,
  intersect as turfIntersect,
  lineString,
  point as turfPoint
} from '@turf/turf';
import { bboxOfGeometry, bboxesIntersect, getPolygonSets } from './geojson.js';
import { makeIssue } from './issue.js';
import { TOLERANCES } from './constants.js';

function extractGeometry(value) {
  if (!value) return null;
  if (value.type === 'Polygon' || value.type === 'MultiPolygon') return value;
  return value.geometry ?? null;
}

function ringLines(geometry) {
  const lines = [];
  for (const rings of getPolygonSets(geometry)) {
    if (!Array.isArray(rings)) continue;
    for (const ring of rings) {
      if (!Array.isArray(ring) || ring.length < 2) continue;
      const positions = ring.filter(
        (position) =>
          Array.isArray(position) && Number.isFinite(position[0]) && Number.isFinite(position[1])
      );
      if (positions.length >= 2) lines.push(lineString(positions));
    }
  }
  return lines;
}

function ringEdges(geometry) {
  const edges = [];
  for (const rings of getPolygonSets(geometry)) {
    if (!Array.isArray(rings)) continue;
    for (const ring of rings) {
      if (!Array.isArray(ring) || ring.length < 2) continue;
      for (let i = 0; i < ring.length - 1; i += 1) {
        const start = ring[i];
        const end = ring[i + 1];
        if (
          Array.isArray(start) &&
          Array.isArray(end) &&
          Number.isFinite(start[0]) &&
          Number.isFinite(start[1]) &&
          Number.isFinite(end[0]) &&
          Number.isFinite(end[1])
        ) {
          edges.push([start, end]);
        }
      }
    }
  }
  return edges;
}

function allVertices(geometry) {
  const vertices = [];
  for (const rings of getPolygonSets(geometry)) {
    if (!Array.isArray(rings)) continue;
    for (const ring of rings) {
      if (!Array.isArray(ring)) continue;
      for (const position of ring) {
        if (
          Array.isArray(position) &&
          Number.isFinite(position[0]) &&
          Number.isFinite(position[1])
        ) {
          vertices.push(position);
        }
      }
    }
  }
  return vertices;
}

function pointOnAnyLine(position, lines, epsilon) {
  const pt = turfPoint(position);
  return lines.some((line) => {
    try {
      return booleanPointOnLine(pt, line, { epsilon });
    } catch {
      return false;
    }
  });
}

function midpoint(start, end) {
  return [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
}

function sharesEdge(geomA, geomB, epsilon) {
  const linesB = ringLines(geomB);
  if (linesB.length > 0) {
    for (const [start, end] of ringEdges(geomA)) {
      if (pointOnAnyLine(midpoint(start, end), linesB, epsilon)) return true;
    }
  }
  const linesA = ringLines(geomA);
  if (linesA.length > 0) {
    for (const [start, end] of ringEdges(geomB)) {
      if (pointOnAnyLine(midpoint(start, end), linesA, epsilon)) return true;
    }
  }
  return false;
}

function touchesAtVertex(geomA, geomB, epsilon) {
  const verticesA = allVertices(geomA);
  const verticesB = allVertices(geomB);
  const epsSq = epsilon * epsilon;
  for (const a of verticesA) {
    for (const b of verticesB) {
      const dx = a[0] - b[0];
      const dy = a[1] - b[1];
      if (dx * dx + dy * dy <= epsSq) return true;
    }
  }
  const linesB = ringLines(geomB);
  if (linesB.length > 0) {
    for (const vertex of verticesA) {
      if (pointOnAnyLine(vertex, linesB, epsilon)) return true;
    }
  }
  const linesA = ringLines(geomA);
  if (linesA.length > 0) {
    for (const vertex of verticesB) {
      if (pointOnAnyLine(vertex, linesA, epsilon)) return true;
    }
  }
  return false;
}

/**
 * Clasifica la relación espacial entre dos polígonos.
 * tipo: 'solape' | 'borde' | 'vertice' | 'disjunto' | 'error'
 * Una superposición exige área de intersección positiva mayor que la
 * tolerancia; compartir borde o vértice nunca se clasifica como solape.
 */
export function classifyPair(valueA, valueB, options = {}) {
  const geometryA = extractGeometry(valueA);
  const geometryB = extractGeometry(valueB);
  const toleranceM2 = options.toleranceM2 ?? TOLERANCES.overlapAreaM2;
  const epsilon = options.epsilon ?? TOLERANCES.coordinateEpsilon;

  if (!geometryA || !geometryB) {
    return { tipo: 'error', areaM2: 0, error: 'Geometría ausente' };
  }

  const bboxA = bboxOfGeometry(geometryA);
  const bboxB = bboxOfGeometry(geometryB);
  if (!bboxA || !bboxB || !bboxesIntersect(bboxA, bboxB)) {
    return { tipo: 'disjunto', areaM2: 0, error: null };
  }

  let intersection = null;
  try {
    // Turf v7 recibe una FeatureCollection con dos o más geometrías.
    intersection = turfIntersect(
      featureCollection([turfFeature(geometryA), turfFeature(geometryB)])
    );
  } catch (error) {
    return { tipo: 'error', areaM2: 0, error: error.message };
  }

  if (intersection && intersection.geometry) {
    const type = intersection.geometry.type;
    if (type === 'Polygon' || type === 'MultiPolygon') {
      let overlapArea = 0;
      try {
        overlapArea = turfArea(intersection);
      } catch {
        overlapArea = 0;
      }
      if (overlapArea > toleranceM2) {
        return { tipo: 'solape', areaM2: overlapArea, error: null };
      }
    }
  }

  try {
    if (sharesEdge(geometryA, geometryB, epsilon)) {
      return { tipo: 'borde', areaM2: 0, error: null };
    }
    if (touchesAtVertex(geometryA, geometryB, epsilon)) {
      return { tipo: 'vertice', areaM2: 0, error: null };
    }
  } catch (error) {
    return { tipo: 'error', areaM2: 0, error: error.message };
  }

  return { tipo: 'disjunto', areaM2: 0, error: null };
}

/**
 * Analiza todos los pares de predios con pre-filtro de bounding box.
 * Genera dos incidencias por cada superposición (una por predio).
 */
export function analyzeTopology(features, options = {}) {
  const toleranceM2 = options.toleranceM2 ?? TOLERANCES.overlapAreaM2;
  const epsilon = options.epsilon ?? TOLERANCES.coordinateEpsilon;
  const maxFeatures = options.maxFeatures ?? TOLERANCES.maxTopologyFeatures;
  const issues = [];
  const contactSummary = { borde: 0, vertice: 0, disjunto: 0, error: 0 };

  const evaluable = features.filter(
    (item) => item.geometry && !item.geometryEmpty && item.geometry.type
  );

  if (evaluable.length > maxFeatures) {
    return {
      issues,
      pairsChecked: 0,
      overlaps: 0,
      contacts: contactSummary,
      skipped: true,
      reason: `El análisis topológico O(n²) se omite con más de ${maxFeatures} predios evaluables.`
    };
  }

  const prepared = evaluable.map((item) => ({
    item,
    bbox: bboxOfGeometry(item.geometry)
  }));

  let pairsChecked = 0;
  let overlaps = 0;

  for (let i = 0; i < prepared.length; i += 1) {
    for (let j = i + 1; j < prepared.length; j += 1) {
      const a = prepared[i];
      const b = prepared[j];
      if (!bboxesIntersect(a.bbox, b.bbox)) continue;
      pairsChecked += 1;

      const result = classifyPair(a.item, b.item, { toleranceM2, epsilon });
      if (result.tipo === 'solape') {
        overlaps += 1;
        const percentageA =
          a.item.inspection?.areaM2 > 0 ? (result.areaM2 / a.item.inspection.areaM2) * 100 : null;
        const percentageB =
          b.item.inspection?.areaM2 > 0 ? (result.areaM2 / b.item.inspection.areaM2) * 100 : null;
        const areaText = result.areaM2.toFixed(2);
        const percentTextA = Number.isFinite(percentageA) ? percentageA.toFixed(1) : 'n/d';
        const percentTextB = Number.isFinite(percentageB) ? percentageB.toFixed(1) : 'n/d';

        issues.push(
          makeIssue('GEO-007', {
            predioId: a.item.predioId,
            entidadId: a.item.entidadId,
            sector: a.item.sector,
            descripcion: `El predio se superpone con "${b.item.predioId}" en ${areaText} m² (${percentTextA} % de este predio).`,
            valorObservado: `superposición=${areaText} m²; otro_predio=${b.item.predioId}`
          }),
          makeIssue('GEO-007', {
            predioId: b.item.predioId,
            entidadId: b.item.entidadId,
            sector: b.item.sector,
            descripcion: `El predio se superpone con "${a.item.predioId}" en ${areaText} m² (${percentTextB} % de este predio).`,
            valorObservado: `superposición=${areaText} m²; otro_predio=${a.item.predioId}`
          })
        );
      } else if (result.tipo === 'borde') {
        contactSummary.borde += 1;
      } else if (result.tipo === 'vertice') {
        contactSummary.vertice += 1;
      } else if (result.tipo === 'disjunto') {
        contactSummary.disjunto += 1;
      } else {
        contactSummary.error += 1;
      }
    }
  }

  return {
    issues,
    pairsChecked,
    overlaps,
    contacts: contactSummary,
    skipped: false,
    reason: null
  };
}
