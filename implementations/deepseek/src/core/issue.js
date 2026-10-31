import { getRule } from './constants.js';
import { formatObserved } from './geojson.js';

/**
 * Construye una incidencia a partir del catálogo de reglas.
 * No asigna todavía el ID definitivo: eso ocurre en finalizeIssues().
 */
export function makeIssue(ruleCode, payload = {}) {
  const rule = getRule(ruleCode);
  if (!rule) throw new Error(`Código de regla desconocido: ${ruleCode}`);
  return {
    codigoRegla: rule.code,
    predioId: payload.predioId ?? null,
    entidadId: payload.entidadId ?? null,
    dimension: rule.dimension,
    severidad: payload.severidad ?? rule.severidad,
    descripcion: payload.descripcion ?? rule.descripcion,
    valorObservado: formatObserved(payload.valorObservado ?? null),
    criterio: payload.criterio ?? rule.criterio,
    sector: payload.sector ?? null
  };
}

function compareIssues(a, b) {
  return (
    String(a.predioId ?? '').localeCompare(String(b.predioId ?? '')) ||
    a.codigoRegla.localeCompare(b.codigoRegla) ||
    a.descripcion.localeCompare(b.descripcion) ||
    a.valorObservado.localeCompare(b.valorObservado)
  );
}

/** Ordena y asigna IDs deterministas INC-0001, INC-0002, ... */
export function finalizeIssues(issues) {
  return [...issues].sort(compareIssues).map((issue, index) => ({
    ...issue,
    id: `INC-${String(index + 1).padStart(4, '0')}`
  }));
}
