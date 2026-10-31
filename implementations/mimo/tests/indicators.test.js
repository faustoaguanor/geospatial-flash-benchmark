import { describe, it, expect } from 'vitest';
import { evaluateDataset } from '../src/core/engine.js';
import { makeFeature } from './helpers.js';

describe('escenario 20 — indicadores sin doble conteo', () => {
  it('un predio con varias incidencias cuenta una sola vez', () => {
    // P-MULTI tiene 3 incidencias (sector nulo, uso fuera de dominio, área negativa)
    const a = makeFeature({}, {
      id_predio: 'P-MULTI',
      clave_catastral: 'KM',
      sector: null,
      uso_suelo: 'agrícola',
      area_terreno_m2: -50,
    });
    const b = makeFeature({ shift: [0.002, 0] }, { id_predio: 'P-OK', clave_catastral: 'KO' });
    const c = makeFeature({ shift: [0.004, 0] }, { id_predio: 'P-OK2', clave_catastral: 'KO2', area_terreno_m2: 0 });

    const result = evaluateDataset([a, b, c]);
    const totalErrorsDelPredio = result.featureResults.find((r) => r.ref === 'P-MULTI').errorCount;
    expect(totalErrorsDelPredio).toBeGreaterThanOrEqual(3);

    const ind = result.indicators;
    expect(ind.total_predios).toBe(3);
    // P-MULTI cuenta UNA vez como predio con errores, aunque tenga varias incidencias
    expect(ind.predios_con_errores).toBe(1);
    expect(ind.predios_sin_errores).toBe(2);
    expect(ind.total_incidencias).toBeGreaterThan(ind.predios_con_errores);
    expect(ind.porcentaje_sin_errores).toBeCloseTo((2 / 3) * 100, 5);
  });

  it('distingue errores de advertencias y cuenta incidencias por severidad', () => {
    const a = makeFeature({}, {
      id_predio: 'P-ADV',
      clave_catastral: 'KA',
      area_construida_m2: 999999, // ALP-008 advertencia
    });
    const b = makeFeature({ shift: [0.002, 0] }, { id_predio: 'P-ERR', clave_catastral: 'KB', pisos: -1 }); // ALP-006 error
    const result = evaluateDataset([a, b]);
    const ind = result.indicators;
    expect(ind.predios_con_errores).toBe(1);
    expect(ind.predios_solo_advertencias).toBe(1);
    expect(ind.incidencias_advertencia).toBeGreaterThanOrEqual(1);
    expect(ind.incidencias_error).toBeGreaterThanOrEqual(1);
  });

  it('agrupa incidencias por código de regla', () => {
    const result = evaluateDataset([
      makeFeature({}, { id_predio: 'P1', clave_catastral: 'DUP', sector: null }),
      makeFeature({}, { id_predio: 'P2', clave_catastral: 'DUP' }),
    ]);
    expect(result.indicators.incidencias_por_regla['ALP-002']).toBe(2);
    expect(result.indicators.incidencias_por_regla['ALP-003']).toBe(1);
  });
});

describe('reglas deshabilitadas', () => {
  it('las reglas apagadas se declaran no evaluadas, no como satisfactorias', () => {
    const result = evaluateDataset(
      [makeFeature({}, { sector: null })],
      { enabledRules: ['ALP-003'] },
    );
    // ALP-003 corre...
    expect(result.incidents.some((i) => i.rule_code === 'ALP-003')).toBe(true);
    // ...y el resto queda declarado como no evaluado
    expect(result.notEvaluated.some((n) => n.rule_code.includes('GEO-001'))).toBe(true);
    expect(result.incidents.every((i) => i.rule_code === 'ALP-003')).toBe(true);
  });
});
