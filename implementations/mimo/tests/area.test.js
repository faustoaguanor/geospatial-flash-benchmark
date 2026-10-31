import { describe, it, expect } from 'vitest';
import { area as turfArea } from '@turf/turf';
import { evaluateDataset } from '../src/core/engine.js';
import { makeFeature } from './helpers.js';

const ring = [
  [-78.5100, -0.2200],
  [-78.5090, -0.2200],
  [-78.5090, -0.2190],
  [-78.5100, -0.2190],
  [-78.5100, -0.2200],
];

// Anclaje geodésico: el área del rectángulo de prueba debe ser ~12,3 km²/1000
describe('metodología de área', () => {
  it('usa cálculo geodésico (no euclidiano sobre grados)', () => {
    const geomArea = turfArea({ type: 'Polygon', coordinates: [ring] });
    // 0.001° lon ≈ 111.3 m; 0.001° lat ≈ 110.6 m → ~12,310 m²
    expect(geomArea).toBeGreaterThan(12000);
    expect(geomArea).toBeLessThan(12600);
  });
});

const geomArea = turfArea({ type: 'Polygon', coordinates: [ring] });

describe('escenario 14 — superficie fuera de tolerancia (5 %)', () => {
  it('marca SUP-001 cuando la diferencia supera la tolerancia', () => {
    const result = evaluateDataset([
      makeFeature({ ring }, { area_terreno_m2: Math.round(geomArea * 0.85 * 100) / 100 }),
    ]);
    const sup = result.incidents.filter((i) => i.rule_code === 'SUP-001');
    expect(sup).toHaveLength(1);
    expect(sup[0].observed_value).toBeGreaterThan(5);
    expect(sup[0].severity).toBe('error');
  });

  it('detecta también un exceso del 12 %', () => {
    const result = evaluateDataset([
      makeFeature({ ring }, { area_terreno_m2: Math.round(geomArea * 1.12 * 100) / 100 }),
    ]);
    expect(result.incidents.filter((i) => i.rule_code === 'SUP-001')).toHaveLength(1);
  });
});

describe('escenario 15 — superficie dentro de tolerancia', () => {
  it('NO marca SUP-001 con una diferencia del 2 %', () => {
    const result = evaluateDataset([
      makeFeature({ ring }, { area_terreno_m2: Math.round(geomArea * 0.98 * 100) / 100 }),
    ]);
    expect(result.incidents.filter((i) => i.rule_code === 'SUP-001')).toHaveLength(0);
  });

  it('la tolerancia es configurable (1 % detecta lo que 5 % tolera)', () => {
    const feature = makeFeature({ ring }, { area_terreno_m2: Math.round(geomArea * 0.97 * 100) / 100 });
    const laxa = evaluateDataset([feature], { surfaceTolerancePercent: 5 });
    const estricta = evaluateDataset([feature], { surfaceTolerancePercent: 1 });
    expect(laxa.incidents.filter((i) => i.rule_code === 'SUP-001')).toHaveLength(0);
    expect(estricta.incidents.filter((i) => i.rule_code === 'SUP-001')).toHaveLength(1);
  });
});

describe('escenario 16 — superficie registrada igual a cero', () => {
  it('marca SUP-002 y deja SUP-001 explícitamente no evaluado', () => {
    const result = evaluateDataset([makeFeature({ ring }, { area_terreno_m2: 0 })]);
    expect(result.incidents.filter((i) => i.rule_code === 'SUP-002')).toHaveLength(1);
    expect(result.notEvaluated.some((n) => n.rule_code === 'SUP-001')).toBe(true);
    expect(result.incidents.filter((i) => i.rule_code === 'SUP-001')).toHaveLength(0);
  });
});

describe('métricas por predio', () => {
  it('expone área geométrica, registrada y diferencia porcentual', () => {
    const result = evaluateDataset([makeFeature({ ring }, { area_terreno_m2: 10000 })]);
    const m = result.featureResults[0].metrics;
    expect(m.geomAreaM2).toBeGreaterThan(12000);
    expect(m.registeredM2).toBe(10000);
    expect(m.diffPct).toBeGreaterThan(15);
    expect(m.diffAbsM2).toBeCloseTo(m.geomAreaM2 - 10000, 1);
  });
});
