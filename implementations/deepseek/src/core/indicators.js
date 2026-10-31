import { QUALITY_DIMENSIONS, SEVERITIES } from './constants.js';

const percent = (part, total) => (total > 0 ? Math.round((part / total) * 10000) / 100 : 0);

/**
 * Calcula indicadores por entidad, evitando doble conteo con Sets de
 * entidadId (la clave interna única por posición del arreglo).
 */
export function computeIndicators(features, issues, totalFeatures = features.length) {
  const totalPredios = features.length;
  const knownEntities = new Set(features.map((item) => item.entidadId));
  const errorEntities = new Set();
  const warningEntities = new Set();
  const infoEntities = new Set();

  const incidenciasPorSeveridad = { error: 0, advertencia: 0, info: 0 };
  const porDimension = {};
  const porRegla = {};

  for (const dimension of Object.keys(QUALITY_DIMENSIONS)) {
    porDimension[dimension] = 0;
  }

  for (const issue of issues) {
    const severity = Object.hasOwn(SEVERITIES, issue.severidad) ? issue.severidad : 'info';
    incidenciasPorSeveridad[severity] += 1;
    porDimension[issue.dimension] = (porDimension[issue.dimension] ?? 0) + 1;
    porRegla[issue.codigoRegla] = (porRegla[issue.codigoRegla] ?? 0) + 1;

    const entityId = issue.entidadId;
    if (!entityId || !knownEntities.has(entityId)) continue;
    if (severity === 'error') errorEntities.add(entityId);
    else if (severity === 'advertencia') warningEntities.add(entityId);
    else infoEntities.add(entityId);
  }

  const allAffected = new Set([...errorEntities, ...warningEntities, ...infoEntities]);
  const prediosSinErrores = totalPredios - errorEntities.size;

  return {
    totalPredios,
    totalEntidades: totalFeatures,
    prediosSinErrores,
    prediosConErrores: errorEntities.size,
    prediosConAdvertencias: warningEntities.size,
    prediosSinIncidencias: totalPredios - allAffected.size,
    totalIncidencias: issues.length,
    incidenciasError: incidenciasPorSeveridad.error,
    incidenciasAdvertencia: incidenciasPorSeveridad.advertencia,
    incidenciasInfo: incidenciasPorSeveridad.info,
    porcentajePrediosSinErrores: percent(prediosSinErrores, totalPredios),
    porcentajePrediosConErrores: percent(errorEntities.size, totalPredios),
    incidenciasPorSeveridad,
    porDimension,
    porRegla
  };
}
