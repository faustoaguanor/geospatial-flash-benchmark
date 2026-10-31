/**
 * Análisis topológico entre predios: superposiciones vs contactos.
 *
 * Clasificación de la intersección de dos polígonos:
 *  - Sin geometría de intersección y sin vértices compartidos: disjuntos.
 *  - Intersección puntual o vértice sobre borde: contacto en vértice.
 *  - Intersección lineal (borde compartido): contacto en borde.
 *  - Intersección poligonal con área > tolerancia: superposición (TOP-001).
 *
 * Limitaciones documentadas:
 *  - La detección usa turf.intersect (polygon-clipping). Para geometrías
 *    inválidas puede lanzar error: esos pares quedan como NO EVALUADOS.
 *  - El umbral overlapMinAreaM2 (0.01 m²) absorbe ruido de punto flotante;
 *    contactos reales producen intersecciones de área ~0 y no se marcan.
 *  - La búsqueda es O(n²) con prefiltro por bounding box.
 */
import { intersect, bbox, booleanPointOnLine, point, lineString, area as turfArea } from '@turf/turf';
import { makeIncident, featureRef } from '../dataLoader.js';
import { DEFAULT_CONFIG } from '../../config/constants.js';

function bboxesIntersect(b1, b2) {
  return b1[0] <= b2[2] && b2[0] <= b1[2] && b1[1] <= b2[3] && b2[1] <= b1[3];
}

function ringsOf(geometry) {
  if (geometry.type === 'Polygon') return geometry.coordinates;
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat();
  return [];
}

/** ¿El punto está sobre alguna arista del anillo? (precisión: 7 decimales ≈ 1 cm) */
function pointOnRings(coord, rings) {
  const p = point(coord);
  for (const ring of rings) {
    for (let i = 0; i < ring.length - 1; i++) {
      const seg = lineString([ring[i], ring[i + 1]]);
      if (booleanPointOnLine(p, seg, { precision: 7 })) return true;
    }
  }
  return false;
}

function anyVertexContact(ringsA, ringsB) {
  for (const ring of ringsA) {
    for (const v of ring) {
      if (pointOnRings(v, ringsB)) return true;
    }
  }
  return false;
}

/**
 * Analiza todas las parejas de predios evaluables.
 * @returns {{ incidents: object[], notEvaluated: object[], contacts: object[] }}
 */
export function analyzeTopology(features, evaluableFlags, config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const incidents = [];
  const notEvaluated = [];
  const contacts = [];

  const items = [];
  features.forEach((f, i) => {
    if (!evaluableFlags[i]) return;
    let bb;
    try {
      bb = bbox(f);
    } catch {
      return;
    }
    items.push({ index: i, ref: featureRef(f, i), feature: f, bbox: bb, rings: ringsOf(f.geometry) });
  });

  for (let a = 0; a < items.length; a++) {
    for (let b = a + 1; b < items.length; b++) {
      const A = items[a];
      const B = items[b];
      if (!bboxesIntersect(A.bbox, B.bbox)) continue;

      let inter = null;
      let threw = false;
      try {
        // turf v7: intersect recibe una FeatureCollection con las dos geometrías
        inter = intersect({ type: 'FeatureCollection', features: [A.feature, B.feature] });
      } catch {
        threw = true;
      }

      if (threw) {
        notEvaluated.push({
          rule_code: 'TOP-001',
          feature_ref: `${A.ref} / ${B.ref}`,
          reason: 'Par no evaluado: la intersección falló por geometrías inválidas.',
        });
        continue;
      }

      const interType = inter?.geometry?.type ?? inter?.type ?? null;

      if (interType && interType.includes('Polygon')) {
        const interArea = turfArea(inter);
        if (interArea > cfg.overlapMinAreaM2) {
          for (const [self, other] of [[A, B], [B, A]]) {
            incidents.push(makeIncident({
              ruleCode: 'TOP-001',
              featureRef: self.ref,
              description: `El predio se superpone con ${other.ref} en ${interArea.toFixed(2)} m².`,
              observedValue: interArea,
              criterion: `Superposición con área de intersección mayor que ${cfg.overlapMinAreaM2} m². El contacto en borde o vértice no se clasifica como superposición.`,
            }));
          }
          continue;
        }
      }

      if (interType === 'Point' || interType === 'MultiPoint') {
        contacts.push({ a: A.ref, b: B.ref, kind: 'vértice' });
        continue;
      }
      if (interType === 'LineString' || interType === 'MultiLineString') {
        contacts.push({ a: A.ref, b: B.ref, kind: 'borde' });
        continue;
      }

      // turf.intersect puede devolver null aunque los polígonos se toquen:
      // verificamos contacto por vértices sobre borde (en ambas direcciones).
      if (anyVertexContact(A.rings, B.rings) || anyVertexContact(B.rings, A.rings)) {
        contacts.push({ a: A.ref, b: B.ref, kind: 'borde/vértice (detección por vértices)' });
      }
    }
  }

  return { incidents, notEvaluated, contacts };
}

