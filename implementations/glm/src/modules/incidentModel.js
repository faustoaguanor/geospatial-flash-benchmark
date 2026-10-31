/**
 * Modelo de incidencias. Cada incidencia contiene:
 * id único, código de regla, predio afectado, dimensión de calidad,
 * descripción, severidad, valor observado y criterio de evaluación.
 */

export const QUALITY_DIMENSIONS = [
  'completitud',
  'consistencia_logica',
  'exactitud_tematica',
  'exactitud_posicional'
];

/**
 * Crea una incidencia como objeto plano (serializable a JSON).
 * El ID único se asigna posteriormente en el motor, de forma determinista.
 */
export function createIncident({
  ruleCode,
  predioId = null,
  dimension,
  description,
  severity,
  observedValue = null,
  criterion = null,
  relatedPredioIds = []
}) {
  return {
    id: null,
    codigo_regla: ruleCode,
    predio_id: predioId,
    dimension,
    descripcion: description,
    severidad: severity,
    valor_observado: observedValue,
    criterio: criterion,
    predios_relacionados: relatedPredioIds
  };
}

/** Asigna IDs secuenciales deterministas INC-0001, INC-0002, … */
export function assignIncidentIds(incidents) {
  return incidents.map((inc, i) => ({
    ...inc,
    id: `INC-${String(i + 1).padStart(4, '0')}`
  }));
}
