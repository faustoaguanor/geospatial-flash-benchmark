/**
 * Análisis de superficies:
 *  - Área geométrica: cálculo geodésico sobre el elipsoide WGS84 (Turf.js /
 *    fórmula del área esférica excesiva). NUNCA se calculan áreas euclidianas
 *    directamente sobre grados.
 *  - Área registrada: atributo area_terreno_m2 declarado en el feature.
 *  - Diferencia absoluta (m²) y porcentual, con tolerancia configurable
 *    (por defecto 5 %, valor experimental de este proyecto).
 *
 * El denominador de la diferencia porcentual es el área registrada
 * (valor catastral de referencia); si no es utilizable no se calcula porcentaje.
 *
 * Casos especiales: área registrada nula / no numérica / negativa / cero,
 * y área geométrica nula o cero → la comparación se marca como no evaluable.
 */
import turfArea from '@turf/area';
import { createIncident } from './incidentModel.js';
import { DEFAULT_SURFACE_TOLERANCE } from './config.js';

/**
 * Calcula el reporte de superficies de un predio.
 * Devuelve { geomArea, registeredArea, diffAbs, diffPct, comparable }.
 */
export function computeSurfaceReport(feature) {
  const props = feature.properties || {};
  let geomArea = null;
  try {
    geomArea = turfArea(feature);
  } catch {
    geomArea = null;
  }
  if (geomArea !== null && !Number.isFinite(geomArea)) geomArea = null;

  const registered = props.area_terreno_m2;
  const validRegistered =
    typeof registered === 'number' && Number.isFinite(registered);

  const report = {
    geomArea,
    registeredArea: validRegistered ? registered : null,
    diffAbs: null,
    diffPct: null,
    comparable: false
  };

  if (!validRegistered) return report;
  if (registered < 0 || registered === 0) return report; // manejado por SUP_VALOR_INVALIDO
  if (geomArea === null || geomArea < 1e-9) return report; // geometría no evaluable

  report.comparable = true;
  report.diffAbs = geomArea - registered;
  report.diffPct = Math.abs(report.diffAbs) / registered; // fracción
  return report;
}

/**
 * Evalúa la calidad de superficies de toda la colección.
 */
export function evaluateSurfaces(features, { tolerance = DEFAULT_SURFACE_TOLERANCE } = {}) {
  const incidents = [];

  for (const feature of features) {
    const props = feature.properties || {};
    const predioId = props.id_predio ?? 'sin-id';
    const registered = props.area_terreno_m2;
    const report = computeSurfaceReport(feature);

    // Área registrada inválida: nula, no numérica, cero o negativa
    const isNumber = typeof registered === 'number' && Number.isFinite(registered);
    if (!isNumber) {
      incidents.push(createIncident({
        ruleCode: 'SUP_VALOR_INVALIDO',
        predioId,
        dimension: 'exactitud_tematica',
        severity: 'error',
        description: 'Área de terreno registrada nula o no numérica: no se puede comparar con el área geométrica.',
        observedValue: `area_terreno_m2 = ${JSON.stringify(registered ?? null)}`,
        criterion: 'area_terreno_m2 debe ser un número finito > 0.'
      }));
      continue;
    }
    if (registered === 0) {
      incidents.push(createIncident({
        ruleCode: 'SUP_VALOR_INVALIDO',
        predioId,
        dimension: 'exactitud_tematica',
        severity: 'error',
        description: 'Área de terreno registrada igual a cero: no se puede calcular diferencia porcentual.',
        observedValue: 'area_terreno_m2 = 0',
        criterion: 'area_terreno_m2 debe ser un número finito > 0.'
      }));
      continue;
    }
    if (registered < 0) {
      // La negatividad ya se reporta como ALFA_SUPERFICIE_NEGATIVA;
      // aquí se indica que la comparación de superficies no es evaluable.
      incidents.push(createIncident({
        ruleCode: 'SUP_VALOR_INVALIDO',
        predioId,
        dimension: 'exactitud_tematica',
        severity: 'error',
        description: 'Área de terreno registrada negativa: la comparación de superficies no es evaluable.',
        observedValue: `area_terreno_m2 = ${registered}`,
        criterion: 'area_terreno_m2 debe ser un número finito > 0.'
      }));
      continue;
    }

    if (report.geomArea === null || report.geomArea < 1e-9) {
      // geometría nula/degenerada: ya tiene incidencia geométrica; no se compara.
      continue;
    }

    if (report.diffPct > tolerance) {
      incidents.push(createIncident({
        ruleCode: 'SUP_FUERA_TOLERANCIA',
        predioId,
        dimension: 'exactitud_tematica',
        severity: 'warning',
        description: 'Diferencia entre área geométrica y área registrada por encima de la tolerancia configurada.',
        observedValue: `geométrica ≈ ${report.geomArea.toFixed(2)} m²; registrada = ${registered} m²; |Δ| = ${report.diffAbs.toFixed(2)} m² (${(report.diffPct * 100).toFixed(2)} %)`,
        criterion: `Tolerancia configurada: ${(tolerance * 100).toFixed(2)} % (parámetro experimental del proyecto, no norma oficial).`
      }));
    }
  }

  return incidents;
}
