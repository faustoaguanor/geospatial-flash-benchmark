/**
 * Evaluación de superficies: área geodésica vs. área registrada.
 *
 * Metodología: se usa turf.area, que calcula el área geodésica del polígono
 * sobre el elipsoide WGS84 (método geodésico), NO euclidianos sobre grados.
 * La comparación usa area_terreno_m2 como valor registrado.
 */
import { area as turfArea } from '@turf/turf';
import { makeIncident, featureRef } from '../dataLoader.js';
import { DEFAULT_CONFIG } from '../../config/constants.js';

/**
 * @param {object} feature
 * @param {number} index
 * @param {object} config { surfaceTolerancePercent, zeroAreaM2 }
 * @param {boolean} geometryOk false si la geometría tiene errores que hacen
 *        no confiable el área (autointersión, anillos abiertos, etc.)
 * @returns {{ incidents: object[], notEvaluated: object[], metrics: object|null }}
 */
export function assessSurface(feature, index, config = {}, geometryOk = true) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const incidents = [];
  const notEvaluated = [];
  const ref = featureRef(feature, index);
  const props = feature?.properties ?? {};
  const registered = props.area_terreno_m2;

  if (!geometryOk) {
    notEvaluated.push({
      rule_code: 'SUP-001',
      feature_ref: ref,
      reason: 'Comparación de superficies no evaluada: la geometría del predio es inválida y su área no es confiable.',
    });
    return { incidents, notEvaluated, metrics: null };
  }

  let geomArea = null;
  try {
    geomArea = turfArea(feature.geometry);
  } catch {
    geomArea = null;
  }

  if (geomArea === null) {
    notEvaluated.push({
      rule_code: 'SUP-001',
      feature_ref: ref,
      reason: 'No fue posible calcular el área geodésica de la geometría.',
    });
    return { incidents, notEvaluated, metrics: null };
  }

  if (typeof registered !== 'number' || !Number.isFinite(registered)) {
    notEvaluated.push({
      rule_code: 'SUP-001',
      feature_ref: ref,
      reason: 'Comparación de superficies no evaluada: area_terreno_m2 no es numérica.',
    });
    return { incidents, notEvaluated, metrics: { geomAreaM2: geomArea, registeredM2: registered ?? null, diffAbsM2: null, diffPct: null } };
  }

  if (registered < 0) {
    notEvaluated.push({
      rule_code: 'SUP-001',
      feature_ref: ref,
      reason: 'Comparación de superficies no evaluada: el valor registrado es negativo (ver ALP-005).',
    });
    return { incidents, notEvaluated, metrics: { geomAreaM2: geomArea, registeredM2: registered, diffAbsM2: null, diffPct: null } };
  }

  if (registered === 0) {
    incidents.push(makeIncident({
      ruleCode: 'SUP-002',
      featureRef: ref,
      description: 'La superficie registrada es 0 m²: la diferencia porcentual no es computable.',
      observedValue: 0,
      criterion: 'Superficie registrada debe ser mayor que cero para evaluar la tolerancia.',
    }));
    notEvaluated.push({
      rule_code: 'SUP-001',
      feature_ref: ref,
      reason: 'Diferencia porcentual no computable con superficie registrada cero.',
    });
    return { incidents, notEvaluated, metrics: { geomAreaM2: geomArea, registeredM2: 0, diffAbsM2: null, diffPct: null } };
  }

  if (geomArea < cfg.zeroAreaM2) {
    notEvaluated.push({
      rule_code: 'SUP-001',
      feature_ref: ref,
      reason: 'Comparación no evaluada: el área geométrica calculada es cero (ver GEO-006).',
    });
    return { incidents, notEvaluated, metrics: { geomAreaM2: geomArea, registeredM2: registered, diffAbsM2: null, diffPct: null } };
  }

  const diffAbs = Math.abs(geomArea - registered);
  // Diferencia porcentual relativa al área geométrica (referencia geodésica).
  const diffPct = (diffAbs / geomArea) * 100;
  const metrics = { geomAreaM2: geomArea, registeredM2: registered, diffAbsM2: diffAbs, diffPct: diffPct };

  if (diffPct > cfg.surfaceTolerancePercent) {
    incidents.push(makeIncident({
      ruleCode: 'SUP-001',
      featureRef: ref,
      description: `Diferencia de superficie ${diffPct.toFixed(2)} % (geométrica ${geomArea.toFixed(2)} m² vs registrada ${registered} m²).`,
      observedValue: diffPct,
      criterion: `Tolerancia experimental de ${cfg.surfaceTolerancePercent} % (parámetro del experimento, no norma oficial).`,
    }));
  }

  return { incidents, notEvaluated, metrics };
}
