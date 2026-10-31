import { APP_NAME } from './constants.js';

const CSV_COLUMNS = [
  ['id_incidencia', (issue) => issue.id],
  ['codigo_regla', (issue) => issue.codigoRegla],
  ['predio_id', (issue) => issue.predioId],
  ['dimension', (issue) => issue.dimension],
  ['severidad', (issue) => issue.severidad],
  ['descripcion', (issue) => issue.descripcion],
  ['valor_observado', (issue) => issue.valorObservado],
  ['criterio', (issue) => issue.criterio],
  ['sector', (issue) => issue.sector]
];

function escapeCSVCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  // Mitigación de inyección de fórmulas en hojas de cálculo.
  if (/^[=+@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function issuesToCSV(issues) {
  const header = CSV_COLUMNS.map(([name]) => name).join(',');
  const rows = issues.map((issue) =>
    CSV_COLUMNS.map(([, getter]) => escapeCSVCell(getter(issue))).join(',')
  );
  return [header, ...rows].join('\n');
}

export function issuesToJSON(issues) {
  return JSON.stringify(
    {
      total: issues.length,
      incidencias: issues
    },
    null,
    2
  );
}

export function buildSummaryObject(result, datasetName = null) {
  const indicators = result.indicators;
  const evaluated = result.surfaces.filter((surface) => surface.evaluada).length;
  const outsideTolerance = result.surfaces.filter(
    (surface) =>
      surface.evaluada &&
      Number.isFinite(surface.diferenciaAbsPct) &&
      surface.diferenciaAbsPct > surface.toleranciaPct
  ).length;

  return {
    aplicacion: APP_NAME,
    generadoEn: result.meta?.generadoEn ?? new Date().toISOString(),
    conjunto: datasetName ?? result.meta?.nombreConjunto ?? null,
    aviso:
      'Datos catastrales sintéticos con fines educativos y experimentales. No representan información oficial del Municipio del Distrito Metropolitano de Quito.',
    estructura: result.structural,
    indicadores: {
      totalPredios: indicators.totalPredios,
      prediosSinErrores: indicators.prediosSinErrores,
      prediosConErrores: indicators.prediosConErrores,
      prediosConAdvertencias: indicators.prediosConAdvertencias,
      prediosSinIncidencias: indicators.prediosSinIncidencias,
      totalIncidencias: indicators.totalIncidencias,
      incidenciasError: indicators.incidenciasError,
      incidenciasAdvertencia: indicators.incidenciasAdvertencia,
      incidenciasInfo: indicators.incidenciasInfo,
      porcentajePrediosSinErrores: indicators.porcentajePrediosSinErrores
    },
    porDimension: indicators.porDimension,
    porRegla: indicators.porRegla,
    superficies: {
      total: result.surfaces.length,
      evaluadas: evaluated,
      noEvaluadas: result.surfaces.length - evaluated,
      fueraDeTolerancia: outsideTolerance,
      toleranciaPct: result.meta?.toleranciaSuperficiePct ?? null
    },
    topologia: {
      paresEvaluados: result.topology?.pairsChecked ?? 0,
      superposiciones: result.topology?.overlaps ?? 0,
      contactosBorde: result.topology?.contacts?.borde ?? 0,
      contactosVertice: result.topology?.contacts?.vertice ?? 0,
      omitida: Boolean(result.topology?.skipped)
    },
    reglasHabilitadas: result.meta?.reglasHabilitadas ?? {},
    reglasNoEvaluadas: result.notEvaluated
  };
}

export function summaryToJSON(result, datasetName = null) {
  return JSON.stringify(buildSummaryObject(result, datasetName), null, 2);
}

export function isBrowser() {
  return typeof document !== 'undefined' && typeof URL !== 'undefined' && typeof Blob !== 'undefined';
}

export function downloadText(filename, content, mimeType = 'text/plain;charset=utf-8') {
  if (!isBrowser()) throw new Error('La descarga solo está disponible en el navegador.');
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function datedFilename(prefix, extension) {
  const date = new Date().toISOString().slice(0, 10);
  return `${prefix}_${date}.${extension}`;
}
