/**
 * Exportación de resultados: incidencias en CSV y JSON, y resumen JSON.
 * Todo se genera localmente; no se transmite nada a servicios externos.
 */

/** Escapa un valor para CSV (RFC 4180): comillas dobles duplicadas. */
export function escapeCsvValue(value) {
  if (value === null || value === undefined) return '';
  let str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  str = str.replace(/"/g, '""');
  // envolver si contiene separador, comillas, salto de línea o espacios extremos
  if (/[",\n\r;]/.test(str)) {
    str = `"${str}"`;
  }
  return str;
}

export function incidentsToCsv(incidents) {
  const headers = [
    'id_incidencia',
    'codigo_regla',
    'predio_id',
    'predios_relacionados',
    'dimension',
    'severidad',
    'descripcion',
    'valor_observado',
    'criterio'
  ];
  const lines = [headers.join(',')];
  for (const inc of incidents) {
    lines.push([
      escapeCsvValue(inc.id),
      escapeCsvValue(inc.codigo_regla),
      escapeCsvValue(inc.predio_id),
      escapeCsvValue((inc.predios_relacionados || []).join('; ')),
      escapeCsvValue(inc.dimension),
      escapeCsvValue(inc.severidad),
      escapeCsvValue(inc.descripcion),
      escapeCsvValue(inc.valor_observado),
      escapeCsvValue(inc.criterio)
    ].join(','));
  }
  return lines.join('\n');
}

export function incidentsToJson(incidents) {
  return JSON.stringify({
    generado: new Date().toISOString(),
    total: incidents.length,
    incidencias: incidents
  }, null, 2);
}

export function summaryToJson(result) {
  const { incidents, indicators, meta, notEvaluatedRules } = result;
  const porRegla = {};
  const porSeveridad = { error: 0, warning: 0, info: 0 };
  const porDimension = {};
  for (const inc of incidents) {
    porRegla[inc.codigo_regla] = (porRegla[inc.codigo_regla] || 0) + 1;
    porSeveridad[inc.severidad] = (porSeveridad[inc.severidad] || 0) + 1;
    porDimension[inc.dimension] = (porDimension[inc.dimension] || 0) + 1;
  }
  return JSON.stringify({
    generado: new Date().toISOString(),
    aplicacion: 'Quito Cadastre Quality Lab',
    aviso: 'Datos catastrales sintéticos con fines educativos y experimentales. No representan información oficial del Municipio del Distrito Metropolitano de Quito.',
    parametros: meta || null,
    indicadores: indicators
      ? {
          total_predios: indicators.total_predios,
          predios_sin_errores: indicators.predios_sin_errores,
          predios_con_errores: indicators.predios_con_errores,
          predios_con_advertencias: indicators.predios_con_advertencias,
          total_incidencias: indicators.total_incidencias,
          pct_sin_errores: Number(indicators.pct_sin_errores.toFixed(2))
        }
      : null,
    incidencias_por_regla: porRegla,
    incidencias_por_severidad: porSeveridad,
    incidencias_por_dimension: porDimension,
    reglas_no_evaluadas: notEvaluatedRules || [],
    total_incidencias: incidents.length
  }, null, 2);
}

/** Dispara la descarga de un archivo de texto en el navegador. */
export function downloadTextFile(filename, text, mime = 'application/json') {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
