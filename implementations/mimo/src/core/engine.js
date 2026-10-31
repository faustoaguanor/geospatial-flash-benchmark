/**
 * Motor de evaluación de calidad catastral.
 * Totalmente independiente de DOM y MapLibre: ejecutable en Node/Vitest.
 */
import { DEFAULT_CONFIG, RULES, NOT_EVALUATED_DIMENSIONS } from '../config/constants.js';
import { makeIncident, featureRef } from './dataLoader.js';
import { validateAttributes, validateDuplicates, validateDuplicateGeometries } from './validation/attributes.js';
import { validateGeometry, geometryKey } from './validation/geometry.js';
import { assessSurface } from './validation/area.js';
import { analyzeTopology } from './validation/topology.js';
import { computeIndicators } from './indicators.js';

/**
 * Valida la estructura mínima de cada feature (tipo, properties, geometry).
 */
function validateFeatureStructure(feature, index) {
  const incidents = [];
  const ref = featureRef(feature, index);
  if (!feature || typeof feature !== 'object' || Array.isArray(feature)) {
    incidents.push(makeIncident({
      ruleCode: 'STR-004',
      featureRef: ref,
      description: 'La entrada no es un objeto feature válido.',
      observedValue: Array.isArray(feature) ? 'array' : typeof feature,
      criterion: 'Cada elemento de features debe ser un objeto con type, properties y geometry.',
    }));
    return { incidents, structOk: false };
  }
  if (feature.type !== 'Feature') {
    incidents.push(makeIncident({
      ruleCode: 'STR-004',
      featureRef: ref,
      description: `La feature tiene type="${feature.type}" en lugar de "Feature".`,
      observedValue: String(feature.type),
      criterion: 'RFC 7946: cada elemento de features debe ser una Feature.',
    }));
  }
  let structOk = true;
  if (feature.properties === null || typeof feature.properties !== 'object' || Array.isArray(feature.properties)) {
    structOk = false; // validateAttributes emite STR-004 adicional
  }
  return { incidents, structOk };
}

/**
 * Evalúa un conjunto de features y devuelve incidencias, resultados por predio
 * e indicadores agregados (sin doble conteo).
 *
 * @param {object[]} features
 * @param {object} options { surfaceTolerancePercent, enabledRules, ... }
 */
export function evaluateDataset(features, options = {}) {
  const config = {
    ...DEFAULT_CONFIG,
    ...options,
    enabledRules: options.enabledRules ?? DEFAULT_CONFIG.enabledRules,
  };
  const enabled = new Set(config.enabledRules);
  const incidents = [];
  const notEvaluated = [];

  const featureIncidents = new Map(); // ref -> incidents[]
  const push = (inc) => {
    incidents.push(inc);
    if (inc.feature_ref) {
      if (!featureIncidents.has(inc.feature_ref)) featureIncidents.set(inc.feature_ref, []);
      featureIncidents.get(inc.feature_ref).push(inc);
    }
  };
  const ruleEnabled = (code) => enabled.has(code);

  // Reglas deshabilitadas se declaran como no evaluadas (no como satisfactorias)
  const disabled = Object.keys(RULES).filter((c) => !enabled.has(c));
  if (disabled.length > 0) {
    notEvaluated.push({
      rule_code: disabled.join(', '),
      feature_ref: null,
      reason: 'Reglas deshabilitadas por el usuario: sus dimensiones no se evalúan en esta corrida.',
    });
  }

  const list = Array.isArray(features) ? features : [];
  const geometryOkFlags = [];
  const geometryKeys = [];
  const surfaceMetrics = new Map();

  list.forEach((feature, index) => {
    const ref = featureRef(feature, index);

    // Estructura y geometría (validateGeometry emite STR-005/STR-006/GEO-* según el caso)
    const structure = validateFeatureStructure(feature, index);
    structure.incidents.filter((i) => ruleEnabled(i.rule_code)).forEach(push);

    const geometryResult = validateGeometry(feature, index, config);
    geometryResult.incidents.filter((i) => ruleEnabled(i.rule_code)).forEach(push);

    const geoOk = geometryResult.geometryOk;
    geometryOkFlags.push(geoOk);
    geometryKeys.push(geoOk ? geometryKey(feature.geometry) : null);

    // Atributos
    if (ruleEnabled('ALP-003') || ruleEnabled('ALP-004') || ruleEnabled('ALP-005')
      || ruleEnabled('ALP-006') || ruleEnabled('ALP-007') || ruleEnabled('ALP-008') || ruleEnabled('ALP-009')) {
      const attrs = validateAttributes(feature, index);
      attrs.incidents.filter((i) => ruleEnabled(i.rule_code)).forEach(push);
      notEvaluated.push(...attrs.notEvaluated);
    } else {
      notEvaluated.push({ rule_code: 'ALP-*', feature_ref: ref, reason: 'Reglas alfanuméricas deshabilitadas.' });
    }

    // Superficies
    if (ruleEnabled('SUP-001') || ruleEnabled('SUP-002')) {
      const surface = assessSurface(feature, index, config, geoOk);
      surface.incidents.filter((i) => ruleEnabled(i.rule_code)).forEach(push);
      notEvaluated.push(...surface.notEvaluated.filter((n) => ruleEnabled(n.rule_code)));
      if (surface.metrics) surfaceMetrics.set(ref, surface.metrics);
    } else {
      notEvaluated.push({ rule_code: 'SUP-001', feature_ref: ref, reason: 'Regla de superficies deshabilitada.' });
    }
  });

  // Reglas de colección
  if (ruleEnabled('ALP-001') || ruleEnabled('ALP-002')) {
    validateDuplicates(list).filter((i) => ruleEnabled(i.rule_code)).forEach(push);
  }
  if (ruleEnabled('GEO-005')) {
    validateDuplicateGeometries(list, geometryKeys).forEach(push);
  }

  // Topología (solo entre geometrías evaluables)
  let contacts = [];
  if (ruleEnabled('TOP-001')) {
    const topo = analyzeTopology(list, geometryOkFlags, config);
    topo.incidents.forEach(push);
    notEvaluated.push(...topo.notEvaluated);
    contacts = topo.contacts;
  } else {
    notEvaluated.push({ rule_code: 'TOP-001', feature_ref: null, reason: 'Regla de superposición deshabilitada.' });
  }

  // Resultado por predio e indicadores
  const featureResults = list.map((feature, index) => {
    const ref = featureRef(feature, index);
    const mine = featureIncidents.get(ref) ?? [];
    const errors = mine.filter((i) => i.severity === 'error');
    const warnings = mine.filter((i) => i.severity === 'advertencia');
    return {
      ref,
      index,
      hasError: errors.length > 0,
      hasWarning: warnings.length > 0,
      errorCount: errors.length,
      warningCount: warnings.length,
      incidentIds: mine.map((i) => i.id),
      metrics: surfaceMetrics.get(ref) ?? null,
    };
  });

  const indicators = computeIndicators(list.length, featureResults, incidents);

  return {
    config: {
      surfaceTolerancePercent: config.surfaceTolerancePercent,
      overlapMinAreaM2: config.overlapMinAreaM2,
      zeroAreaM2: config.zeroAreaM2,
      enabledRules: [...enabled],
    },
    incidents,
    featureResults,
    indicators,
    notEvaluated,
    contacts,
    notEvaluatedDimensions: NOT_EVALUATED_DIMENSIONS,
  };
}
