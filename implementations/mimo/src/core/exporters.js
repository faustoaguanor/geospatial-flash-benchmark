/**
 * Exportación de resultados: incidencias CSV/JSON y resumen JSON.
 * Sin dependencias de DOM (el disparo del descarga vive en la interfaz).
 */

const CSV_COLUMNS = [
  'id',
  'rule_code',
  'feature_ref',
  'dimension',
  'severity',
  'description',
  'observed_value',
  'criterion',
];

function csvEscape(value) {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

export function incidentsToCSV(incidents) {
  const header = CSV_COLUMNS.join(',');
  const rows = incidents.map((inc) =>
    CSV_COLUMNS.map((col) => csvEscape(inc[col])).join(','));
  return [header, ...rows].join('\r\n');
}

export function incidentsToJSON(incidents) {
  return JSON.stringify({
    tipo: 'incidencias',
    total: incidents.length,
    incidencias: incidents,
  }, null, 2);
}

/** Resumen completo de la evaluación (sin el listado crudo de incidencias). */
export function summaryToJSON(result, datasetName = 'dataset') {
  const summary = {
    tipo: 'resumen_evaluacion',
    dataset: datasetName,
    generado_en: new Date().toISOString(),
    aviso: 'Evaluación de datos catastrales SINTÉTICOS. Umbrales experimentales, no normativos.',
    configuracion: result.config,
    indicadores: result.indicators,
    no_evaluado: {
      reglas: result.notEvaluated,
      dimensiones: result.notEvaluatedDimensions,
    },
    contactos_borde_o_vertice: result.contacts.length,
    leyenda_severidades: {
      error: 'Error comprobado: la regla se evaluó y falló.',
      advertencia: 'Advertencia: requiere revisión humana.',
    },
  };
  return JSON.stringify(summary, null, 2);
}

export function downloadText(filename, text, mime = 'application/json;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
