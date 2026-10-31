import {
  DEFAULT_SURFACE_TOLERANCE_PCT,
  MAX_SURFACE_TOLERANCE_PCT,
  MIN_SURFACE_TOLERANCE_PCT,
  RULES,
  TOLERANCES,
  TOGGLEABLE_RULES
} from './constants.js';
import { evaluateAttributes } from './attributes.js';
import { computeAreaM2, detectSelfIntersection, isZeroArea } from './geometry.js';
import { geometryKey } from './geojson.js';
import { computeIndicators } from './indicators.js';
import { finalizeIssues, makeIssue } from './issue.js';
import { evaluateSurface } from './surface.js';
import { validateStructure } from './structure.js';
import { analyzeTopology } from './topology.js';

const STRUCTURAL_PREFIX = 'STR-';

export function normalizeTolerance(value) {
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(numeric) || numeric < MIN_SURFACE_TOLERANCE_PCT) {
    return DEFAULT_SURFACE_TOLERANCE_PCT;
  }
  return Math.min(MAX_SURFACE_TOLERANCE_PCT, numeric);
}

function emptyTopology() {
  return {
    issues: [],
    pairsChecked: 0,
    overlaps: 0,
    contacts: { borde: 0, vertice: 0, disjunto: 0, error: 0 },
    skipped: false,
    reason: null
  };
}

function buildNotEvaluated(enabledRules, extraReasons = []) {
  const entries = [];

  for (const rule of RULES.filter((item) => !item.evaluable)) {
    entries.push({
      codigoRegla: rule.code,
      nombre: rule.nombre,
      dimension: rule.dimension,
      motivo: rule.descripcion
    });
  }

  for (const rule of TOGGLEABLE_RULES) {
    if (enabledRules[rule.code] === false) {
      entries.push({
        codigoRegla: rule.code,
        nombre: rule.nombre,
        dimension: rule.dimension,
        motivo: 'Regla desactivada por el usuario.'
      });
    }
  }

  for (const extra of extraReasons) {
    entries.push(extra);
  }

  return entries;
}

/**
 * Ejecuta el motor completo sobre un objeto GeoJSON ya parseado.
 * Esta función es pura respecto al DOM y a MapLibre.
 */
export function evaluateCollection(collection, options = {}) {
  const enabledRules = { ...(options.enabledRules ?? {}) };
  const tolerancePct = normalizeTolerance(options.tolerancePct);
  const isRuleEnabled = (code) => {
    if (code.startsWith(STRUCTURAL_PREFIX)) return true;
    return enabledRules[code] !== false;
  };

  const structural = validateStructure(collection, { isRuleEnabled });
  const features = structural.features;
  const issues = [...structural.issues];
  const extraNotEvaluated = [];

  // Atributos alfanuméricos (se evalúan una vez sobre el conjunto)
  issues.push(...evaluateAttributes(features, { isRuleEnabled }));

  // Geometría individual y superficies
  const surfaces = [];
  for (const item of features) {
    const area = item.geometryEmpty ? null : computeAreaM2(item.geometry);
    item.areaM2 = area;
    item.inspection.areaM2 = area;

    if (!item.geometryEmpty && isRuleEnabled('GEO-004')) {
      const selfIntersection = detectSelfIntersection(item.geometry);
      item.selfIntersection = selfIntersection;
      if (selfIntersection.error) {
        extraNotEvaluated.push({
          codigoRegla: 'GEO-004',
          nombre: 'Autointersección',
          dimension: 'consistencia_logica',
          motivo: `No fue posible verificar el predio ${item.predioId}: ${selfIntersection.error}`
        });
      } else if (selfIntersection.detectado) {
        issues.push(
          makeIssue('GEO-004', {
            predioId: item.predioId,
            entidadId: item.entidadId,
            sector: item.sector,
            descripcion: `La geometría se autointersecta en ${selfIntersection.puntos} punto(s).`,
            valorObservado: `${selfIntersection.puntos} cruce(s)`
          })
        );
      }
    }

    if (area !== null && isZeroArea(area) && isRuleEnabled('GEO-006')) {
      issues.push(
        makeIssue('GEO-006', {
          predioId: item.predioId,
          entidadId: item.entidadId,
          sector: item.sector,
          descripcion: 'El área geométrica del polígono es cero o despreciable.',
          valorObservado: `${area} m²`
        })
      );
    }

    const surface = evaluateSurface(item, {
      isRuleEnabled,
      tolerancePct,
      geometryArea: area
    });
    surfaces.push(surface.analysis);
    issues.push(...surface.issues);
  }

  // Geometrías duplicadas
  if (isRuleEnabled('GEO-005')) {
    const groups = new Map();
    for (const item of features) {
      if (item.geometryEmpty) continue;
      const key = geometryKey(item.geometry, TOLERANCES.duplicateGeometryDecimals);
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    }
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      for (const item of group) {
        const others = group
          .filter((other) => other !== item)
          .map((other) => other.predioId)
          .slice(0, 5);
        issues.push(
          makeIssue('GEO-005', {
            predioId: item.predioId,
            entidadId: item.entidadId,
            sector: item.sector,
            descripcion: `La geometría es idéntica a la de ${group.length - 1} predio(s): ${others.join(', ')}.`,
            valorObservado: others.join(', ')
          })
        );
      }
    }
  }

  // Topología entre pares
  let topology = emptyTopology();
  if (isRuleEnabled('GEO-007')) {
    topology = analyzeTopology(features, {
      toleranceM2: TOLERANCES.overlapAreaM2,
      epsilon: TOLERANCES.coordinateEpsilon,
      maxFeatures: TOLERANCES.maxTopologyFeatures
    });
    issues.push(...topology.issues);
    if (topology.skipped) {
      extraNotEvaluated.push({
        codigoRegla: 'GEO-007',
        nombre: 'Superposición entre predios',
        dimension: 'consistencia_logica',
        motivo: topology.reason ?? 'Análisis topológico omitido por tamaño del conjunto.'
      });
    }
  } else {
    topology = { ...emptyTopology(), disabled: true };
  }

  const finalized = finalizeIssues(issues);
  const indicators = computeIndicators(features, finalized, structural.totalFeatures);

  return {
    issues: finalized,
    indicators,
    surfaces,
    topology,
    notEvaluated: buildNotEvaluated(enabledRules, extraNotEvaluated),
    structural: {
      totalEntidades: structural.totalFeatures,
      prediosEvaluables: features.length,
      entidadesOmitidas: structural.skipped
    },
    meta: {
      generadoEn: options.now ?? new Date().toISOString(),
      nombreConjunto: options.datasetName ?? null,
      toleranciaSuperficiePct: tolerancePct,
      reglasHabilitadas: Object.fromEntries(
        TOGGLEABLE_RULES.map((rule) => [rule.code, enabledRules[rule.code] !== false])
      )
    }
  };
}

function emptyResult(options, issues) {
  const finalized = finalizeIssues(issues);
  return {
    issues: finalized,
    indicators: computeIndicators([], finalized, 0),
    surfaces: [],
    topology: emptyTopology(),
    notEvaluated: buildNotEvaluated({ ...(options.enabledRules ?? {}) }),
    structural: { totalEntidades: 0, prediosEvaluables: 0, entidadesOmitidas: 0 },
    meta: {
      generadoEn: options.now ?? new Date().toISOString(),
      nombreConjunto: options.datasetName ?? null,
      toleranciaSuperficiePct: normalizeTolerance(options.tolerancePct),
      reglasHabilitadas: Object.fromEntries(
        TOGGLEABLE_RULES.map((rule) => [rule.code, options.enabledRules?.[rule.code] !== false])
      ),
      errorDeCarga: true
    }
  };
}

/** Evalúa texto GeoJSON, informando JSON malformado sin lanzar excepciones. */
export function evaluateGeoJSONText(text, options = {}) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    const preview =
      typeof text === 'string' && text.length > 160 ? `${text.slice(0, 160)}…` : String(text);
    const issue = makeIssue('STR-001', {
      descripcion: `El archivo no es JSON válido: ${error.message}`,
      valorObservado: preview
    });
    return emptyResult(options, [issue]);
  }
  return evaluateCollection(data, options);
}
