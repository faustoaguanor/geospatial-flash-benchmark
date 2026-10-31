import { describe, expect, it } from 'vitest';
import {
  codes,
  evaluate,
  evaluateWith,
  issuesOf,
  makeFeature,
  polygonArea,
  rectGeometry,
  round
} from './helpers.js';

describe('Evaluación de superficies', () => {
  it('14. detecta superficie fuera de la tolerancia del 5 %', () => {
    const geometry = rectGeometry();
    const geometricArea = polygonArea(geometry);
    const feature = makeFeature('QT-S-001', {
      geometry,
      props: { area_terreno_m2: round(geometricArea * 1.1) }
    });
    const result = evaluate(feature);
    const issues = issuesOf(result, 'SUP-001');
    expect(issues).toHaveLength(1);
    expect(result.surfaces[0].evaluada).toBe(true);
    expect(result.surfaces[0].diferenciaAbsPct).toBeGreaterThan(9);
    expect(result.surfaces[0].diferenciaAbsPct).toBeLessThan(11);
  });

  it('15. acepta superficie dentro de la tolerancia sin generar incidencia', () => {
    const geometry = rectGeometry();
    const geometricArea = polygonArea(geometry);
    const feature = makeFeature('QT-S-002', {
      geometry,
      props: { area_terreno_m2: round(geometricArea * 1.03) }
    });
    const result = evaluate(feature);
    expect(codes(result)).not.toContain('SUP-001');
    expect(result.surfaces[0].evaluada).toBe(true);
    expect(result.surfaces[0].diferenciaAbsPct).toBeLessThan(3.5);
  });

  it('16. maneja superficie registrada igual a cero', () => {
    const feature = makeFeature('QT-S-003', {
      props: { area_terreno_m2: 0 }
    });
    const result = evaluate(feature);
    expect(issuesOf(result, 'SUP-002')).toHaveLength(1);
    expect(issuesOf(result, 'SUP-001')).toHaveLength(0);
    expect(result.surfaces[0].evaluada).toBe(false);
    expect(result.surfaces[0].motivo).toMatch(/cero/);
  });

  it('maneja superficie registrada nula como no evaluable', () => {
    const feature = makeFeature('QT-S-004', {
      props: { area_terreno_m2: null }
    });
    const result = evaluate(feature);
    expect(issuesOf(result, 'ALF-003')).toHaveLength(1);
    expect(issuesOf(result, 'SUP-003')).toHaveLength(1);
    expect(result.surfaces[0].evaluada).toBe(false);
  });

  it('permite configurar la tolerancia porcentual', () => {
    const geometry = rectGeometry();
    const geometricArea = polygonArea(geometry);
    const feature = makeFeature('QT-S-005', {
      geometry,
      props: { area_terreno_m2: round(geometricArea * 1.1) }
    });
    const strict = evaluateWith([feature], { tolerancePct: 5 });
    const flexible = evaluateWith([feature], { tolerancePct: 15 });
    expect(issuesOf(strict, 'SUP-001')).toHaveLength(1);
    expect(issuesOf(flexible, 'SUP-001')).toHaveLength(0);
    expect(flexible.surfaces[0].toleranciaPct).toBe(15);
  });

  it('calcula área geodésica en m², no área euclidiana sobre grados', () => {
    const geometry = rectGeometry(-78.5, -0.22, 0.0002, 0.0002);
    const squareDegrees = 0.0002 * 0.0002;
    const feature = makeFeature('QT-S-006', { geometry });
    const result = evaluate(feature);
    const area = result.surfaces[0].areaGeometricaM2;
    expect(area).toBeGreaterThan(400);
    expect(area).toBeLessThan(600);
    expect(area).not.toBeCloseTo(squareDegrees, 3);
    expect(result.surfaces[0].areaRegistradaM2).toBeCloseTo(area, 1);
  });

  it('limita la tolerancia a un rango válido', () => {
    const feature = makeFeature('QT-S-007');
    const negative = evaluateWith([feature], { tolerancePct: -3 });
    const huge = evaluateWith([feature], { tolerancePct: 150 });
    expect(negative.surfaces[0].toleranciaPct).toBe(5);
    expect(huge.surfaces[0].toleranciaPct).toBe(100);
  });
});
