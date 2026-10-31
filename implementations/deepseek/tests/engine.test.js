import { describe, expect, it } from 'vitest';
import {
  evaluate,
  evaluateWith,
  issuesOf,
  makeFeature
} from './helpers.js';

describe('Motor, indicadores y reglas no evaluadas', () => {
  it('20. los indicadores no cuentan dos veces un predio con varias incidencias', () => {
    const feature = makeFeature('QT-I-001', {
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-78.5, -0.22],
            [-78.4998, -0.22],
            [-78.4998, -0.2198]
          ]
        ]
      },
      props: {
        clave_catastral: null,
        area_terreno_m2: -50,
        numero_pisos: 1.5,
        uso_suelo: 'ESPACIAL'
      }
    });
    const result = evaluate(feature);
    expect(result.issues.length).toBeGreaterThan(4);
    expect(result.indicators.totalPredios).toBe(1);
    expect(result.indicators.prediosConErrores).toBe(1);
    expect(result.indicators.prediosSinErrores).toBe(0);
    expect(result.indicators.porcentajePrediosSinErrores).toBe(0);
  });

  it('calcula porcentajes sobre dos predios sin doble conteo', () => {
    const failing = makeFeature('QT-I-002', {
      props: { clave_catastral: '', area_terreno_m2: -1 }
    });
    const clean = makeFeature('QT-I-003', { lon: -78.49 });
    const result = evaluate(failing, clean);
    expect(result.indicators.totalPredios).toBe(2);
    expect(result.indicators.prediosConErrores).toBe(1);
    expect(result.indicators.prediosSinErrores).toBe(1);
    expect(result.indicators.porcentajePrediosSinErrores).toBe(50);
    expect(result.indicators.totalIncidencias).toBeGreaterThan(2);
  });

  it('asigna identificadores de incidencia únicos y deterministas', () => {
    const failing = makeFeature('QT-I-004', {
      props: { clave_catastral: '', area_terreno_m2: -1, numero_pisos: -2 }
    });
    const result = evaluate(failing);
    const ids = result.issues.map((issue) => issue.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^INC-\d{4}$/);

    const again = evaluate(failing);
    expect(again.issues.map((issue) => issue.id)).toEqual(ids);
  });

  it('incluye las dimensiones de referencia como no evaluadas', () => {
    const result = evaluate(makeFeature('QT-I-005'));
    const temporal = result.notEvaluated.find((item) => item.codigoRegla === 'REF-003');
    expect(temporal).toBeDefined();
    expect(temporal.dimension).toBe('calidad_temporal');
    expect(result.issues.some((issue) => issue.codigoRegla.startsWith('REF-'))).toBe(false);
    expect(result.indicators.porDimension.calidad_temporal).toBe(0);
  });

  it('respeta las reglas desactivadas y las informa como no evaluadas', () => {
    const a = makeFeature('QT-I-006', { props: { clave_catastral: 'DEMO-DUP-I' } });
    const b = makeFeature('QT-I-007', {
      lon: -78.49,
      props: { clave_catastral: 'DEMO-DUP-I' }
    });
    const result = evaluateWith([a, b], { enabledRules: { 'ALF-002': false } });
    expect(issuesOf(result, 'ALF-002')).toHaveLength(0);
    expect(
      result.notEvaluated.some((item) => item.codigoRegla === 'ALF-002')
    ).toBe(true);
    expect(result.meta.reglasHabilitadas['ALF-002']).toBe(false);
  });

  it('mantiene siempre activas las reglas estructurales', () => {
    const result = evaluateWith([{ type: 'Feature', properties: {}, geometry: null }], {
      enabledRules: { 'STR-005': false }
    });
    expect(issuesOf(result, 'STR-005')).toHaveLength(1);
  });
});
