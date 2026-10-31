/** Pruebas de análisis de superficies. */
import { describe, it, expect } from 'vitest';
import { runQualityAnalysis } from '../src/modules/qualityEngine.js';
import { computeSurfaceReport } from '../src/modules/surfaceAnalysis.js';
import { fc, makeFeature, ruleCounts, QUITO } from './helpers.js';
import turfArea from '@turf/area';

describe('Escenario 14: Superficie fuera de tolerancia', () => {
  it('reporta SUP_FUERA_TOLERANCIA con desviación del 20 %', () => {
    const a = makeFeature({ id: 'P-SUP', overrides: { area_terreno_m2: null } });
    const geomArea = turfArea(a);
    a.properties.area_terreno_m2 = Number((geomArea * 1.2).toFixed(2));
    const res = runQualityAnalysis(fc(a), { tolerance: 0.05 });
    const inc = res.incidents.find((i) => i.codigo_regla === 'SUP_FUERA_TOLERANCIA');
    expect(inc).toBeDefined();
    expect(inc.severidad).toBe('warning');
    expect(inc.dimension).toBe('exactitud_tematica');
  });

  it('responde a la tolerancia configurada (15 % admite una desviación del 12 %)', () => {
    const a = makeFeature({ id: 'P-SUP', overrides: { area_terreno_m2: null } });
    const geomArea = turfArea(a);
    a.properties.area_terreno_m2 = Number((geomArea * 1.12).toFixed(2));
    const dentro = runQualityAnalysis(fc(a), { tolerance: 0.15 });
    expect(dentro.incidents.some((i) => i.codigo_regla === 'SUP_FUERA_TOLERANCIA')).toBe(false);
    const fuera = runQualityAnalysis(fc(a), { tolerance: 0.05 });
    expect(fuera.incidents.some((i) => i.codigo_regla === 'SUP_FUERA_TOLERANCIA')).toBe(true);
  });
});

describe('Escenario 15: Superficie dentro de tolerancia', () => {
  it('no reporta SUP_FUERA_TOLERANCIA con desviación del 3 %', () => {
    const a = makeFeature({ id: 'P-OK', overrides: { area_terreno_m2: null } });
    const geomArea = turfArea(a);
    a.properties.area_terreno_m2 = Number((geomArea * 1.03).toFixed(2));
    const res = runQualityAnalysis(fc(a), { tolerance: 0.05 });
    expect(ruleCounts(res.incidents).SUP_FUERA_TOLERANCIA).toBeUndefined();
  });
});

describe('Escenario 16: Superficie registrada igual a cero', () => {
  it('reporta SUP_VALOR_INVALIDO y no calcula diferencia porcentual', () => {
    const a = makeFeature({ id: 'P-ZERO', overrides: { area_terreno_m2: 0 } });
    const res = runQualityAnalysis(fc(a));
    expect(ruleCounts(res.incidents).SUP_VALOR_INVALIDO).toBe(1);
    const report = computeSurfaceReport(a);
    expect(report.comparable).toBe(false);
    expect(report.diffPct).toBeNull();
  });
});

describe('Cálculo de superficies', () => {
  it('usa cálculo geodésico: un rectángulo de 10×10 m rinde ≈ 100 m²', () => {
    const a = makeFeature({ id: 'P-GEO' });
    const report = computeSurfaceReport(a);
    expect(report.geomArea).toBeGreaterThan(99);
    expect(report.geomArea).toBeLessThan(101);
    expect(report.comparable).toBe(true);
    expect(Math.abs(report.diffPct)).toBeLessThan(0.01);
  });

  it('área registrada negativa no es comparable', () => {
    const a = makeFeature({ id: 'P-NEG', overrides: { area_terreno_m2: -5 } });
    const report = computeSurfaceReport(a);
    expect(report.comparable).toBe(false);
  });

  it('área registrada no numérica no es comparable y genera SUP_VALOR_INVALIDO', () => {
    const a = makeFeature({ id: 'P-STR', overrides: { area_terreno_m2: '100' } });
    const res = runQualityAnalysis(fc(a));
    expect(ruleCounts(res.incidents).SUP_VALOR_INVALIDO).toBe(1);
  });
});
