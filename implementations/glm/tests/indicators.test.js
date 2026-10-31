/** Pruebas de indicadores (sin doble conteo) y exportación. */
import { describe, it, expect } from 'vitest';
import { runQualityAnalysis } from '../src/modules/qualityEngine.js';
import { computeIndicators } from '../src/modules/indicators.js';
import { incidentsToCsv, incidentsToJson, summaryToJson, escapeCsvValue } from '../src/modules/exporter.js';
import { fc, makeFeature, squareAtOffset, ruleCounts } from './helpers.js';

describe('Escenario 20: Indicadores sin doble conteo', () => {
  it('un predio con varias incidencias se cuenta una sola vez por categoría', () => {
    // predio con: campo obligatorio nulo (error) + inconsistencia área/pisos
    // (advertencia) → 2 incidencias de distinta severidad, 1 solo predio
    const a = makeFeature({
      id: 'P-MULTI',
      overrides: { uso_suelo: null, area_construida_m2: 99999 }
    });
    const b = makeFeature({ id: 'P-OK', clave: 'SIM-90-TEST-00002', geom: { type: 'Polygon', coordinates: [squareAtOffset(60, 0)] } });
    const res = runQualityAnalysis(fc(a, b));
    const ind = res.indicators;
    expect(res.incidents.length).toBe(2);
    expect(ind.total_predios).toBe(2);
    expect(ind.predios_con_errores).toBe(1);      // P-MULTI una sola vez
    expect(ind.predios_con_advertencias).toBe(1); // P-MULTI una sola vez
    expect(ind.predios_sin_errores).toBe(1);      // solo P-OK
    expect(ind.pct_sin_errores).toBeCloseTo(50, 5);
  });

  it('un predio con dos errores se cuenta una sola vez en predios_con_errores', () => {
    const a = makeFeature({
      id: 'P-DOBLE',
      overrides: { area_terreno_m2: -100, uso_suelo: null }
    });
    const b = makeFeature({ id: 'P-OK', clave: 'SIM-90-TEST-00002', geom: { type: 'Polygon', coordinates: [squareAtOffset(60, 0)] } });
    const res = runQualityAnalysis(fc(a, b));
    // 3 incidencias: null (error), negativa (error), SUP inválida (error)
    expect(res.incidents.length).toBe(3);
    expect(res.indicators.predios_con_errores).toBe(1);
    expect(res.indicators.total_incidencias).toBe(3);
  });

  it('colección sin incidencias → 100 % sin errores', () => {
    const a = makeFeature({ id: 'P-0001' });
    const b = makeFeature({ id: 'P-0002', clave: 'SIM-90-TEST-00002', geom: { type: 'Polygon', coordinates: [squareAtOffset(60, 0)] } });
    const res = runQualityAnalysis(fc(a, b));
    expect(res.indicators.pct_sin_errores).toBe(100);
  });

  it('computeIndicators con conjuntos vacíos', () => {
    const ind = computeIndicators([], []);
    expect(ind.total_predios).toBe(0);
    expect(ind.pct_sin_errores).toBe(0);
  });
});

describe('Escenario 19: Exportación correcta de incidencias', () => {
  const a = makeFeature({ id: 'P-EXP', overrides: { uso_suelo: null } });
  const res = runQualityAnalysis(fc(a));

  it('CSV con cabecera y una fila por incidencia', () => {
    const csv = incidentsToCsv(res.incidents);
    const lines = csv.split('\n');
    expect(lines[0]).toContain('id_incidencia');
    expect(lines[0]).toContain('codigo_regla');
    expect(lines).toHaveLength(res.incidents.length + 1);
    expect(csv).toContain('ALFA_CAMPO_OBLIGATORIO_NULO');
  });

  it('CSV escapa valores con comas, comillas y saltos de línea', () => {
    expect(escapeCsvValue('valor, con coma')).toBe('"valor, con coma"');
    expect(escapeCsvValue('con "comillas"')).toBe('"con ""comillas"""');
    expect(escapeCsvValue(null)).toBe('');
  });

  it('JSON de incidencias es serializable y reversible', () => {
    const json = incidentsToJson(res.incidents);
    const parsed = JSON.parse(json);
    expect(parsed.total).toBe(res.incidents.length);
    expect(parsed.incidencias).toHaveLength(res.incidents.length);
    expect(parsed.incidencias[0].codigo_regla).toBeDefined();
  });

  it('JSON de resumen incluye indicadores y agrupaciones', () => {
    const summary = JSON.parse(summaryToJson(res));
    expect(summary.indicadores.total_predios).toBe(1);
    expect(summary.incidencias_por_regla.ALFA_CAMPO_OBLIGATORIO_NULO).toBe(1);
    expect(summary.incidencias_por_severidad.error).toBeGreaterThan(0);
    expect(summary.aviso).toContain('sintéticos');
  });
});

describe('IDs de incidencia únicos y deterministas', () => {
  it('asigna IDs secuenciales INC-0001… sin duplicados', () => {
    const a = makeFeature({ id: 'P-0001', overrides: { uso_suelo: null, direccion: null } });
    const res = runQualityAnalysis(fc(a));
    const ids = res.incidents.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe('INC-0001');
  });
});
