import { describe, it, expect } from 'vitest';
import { incidentsToCSV, incidentsToJSON, summaryToJSON } from '../src/core/exporters.js';
import { evaluateDataset } from '../src/core/engine.js';
import { makeFeature } from './helpers.js';

/** Parser estricto de una línea CSV (RFC 4180) para verificar columnas. */
function parseCSVLine(line) {
  const cols = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { cols.push(cur); cur = ''; }
    else cur += ch;
  }
  cols.push(cur);
  return cols;
}

describe('escenario 19 — exportación correcta de incidencias', () => {
  const result = evaluateDataset([
    makeFeature({}, { id_predio: 'P-CSV,con coma', clave_catastral: 'KC', sector: null }),
    makeFeature({}, { id_predio: 'P-2', clave_catastral: 'K2' }),
  ]);

  it('CSV incluye encabezado y una fila por incidencia', () => {
    const csv = incidentsToCSV(result.incidents);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('id,rule_code,feature_ref,dimension,severity,description,observed_value,criterion');
    expect(lines.length - 1).toBe(result.incidents.length);
  });

  it('CSV escapa comillas y comas correctamente', () => {
    const csv = incidentsToCSV(result.incidents);
    expect(csv).toContain('"P-CSV,con coma"');
    for (const line of csv.split('\r\n').slice(1)) {
      expect(parseCSVLine(line).length).toBe(8);
    }
  });

  it('JSON de incidencias es parseable y conserva el modelo', () => {
    const parsed = JSON.parse(incidentsToJSON(result.incidents));
    expect(parsed.total).toBe(result.incidents.length);
    expect(parsed.incidencias[0].rule_code).toBeTruthy();
    expect(parsed.incidencias[0].severity).toBeTruthy();
  });

  it('resumen JSON contiene indicadores, configuración y elementos no evaluados', () => {
    const summary = JSON.parse(summaryToJSON(result, 'prueba'));
    expect(summary.indicadores.total_predios).toBe(2);
    expect(summary.configuracion.surfaceTolerancePercent).toBe(5);
    expect(Array.isArray(summary.no_evaluado.reglas)).toBe(true);
    expect(summary.no_evaluado.dimensiones.length).toBeGreaterThan(0);
  });
});
