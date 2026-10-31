import { describe, expect, it } from 'vitest';
import {
  codes,
  evaluate,
  issuesOf,
  makeFeature
} from './helpers.js';

describe('Calidad alfanumérica', () => {
  it('2. detecta claves catastrales duplicadas en ambos predios', () => {
    const a = makeFeature('QT-A-001', { props: { clave_catastral: 'DEMO-DUP-001' } });
    const b = makeFeature('QT-A-002', {
      lon: -78.49,
      props: { clave_catastral: 'DEMO-DUP-001' }
    });
    const result = evaluate(a, b);
    const issues = issuesOf(result, 'ALF-002');
    expect(issues).toHaveLength(2);
    expect(new Set(issues.map((issue) => issue.predioId))).toEqual(
      new Set(['QT-A-001', 'QT-A-002'])
    );
  });

  it('3. detecta identificadores duplicados sin confundirlos con claves', () => {
    const a = makeFeature('QT-DUP-ID', {
      props: { clave_catastral: 'DEMO-K-001' }
    });
    const b = makeFeature('QT-DUP-ID', {
      lon: -78.49,
      props: { clave_catastral: 'DEMO-K-002' }
    });
    const result = evaluate(a, b);
    expect(issuesOf(result, 'ALF-001')).toHaveLength(2);
    expect(issuesOf(result, 'ALF-002')).toHaveLength(0);
    expect(result.indicators.prediosConErrores).toBe(2);
  });

  it('4. detecta campos obligatorios vacíos o nulos', () => {
    const empty = makeFeature('QT-A-003', { props: { clave_catastral: '   ' } });
    const nulled = makeFeature('QT-A-004', {
      lon: -78.49,
      props: { uso_suelo: null }
    });
    const result = evaluate(empty, nulled);
    const issues = issuesOf(result, 'ALF-003');
    expect(issues).toHaveLength(2);
    expect(issues.map((issue) => issue.valorObservado)).toEqual(
      expect.arrayContaining(['   ', 'null'])
    );
  });

  it('5. detecta superficies negativas y marca la superficie como no evaluable', () => {
    const feature = makeFeature('QT-A-005', {
      props: { area_terreno_m2: -120.5, area_construida_m2: -30 }
    });
    const result = evaluate(feature);
    expect(issuesOf(result, 'ALF-005')).toHaveLength(2);
    const notEvaluable = issuesOf(result, 'SUP-003');
    expect(notEvaluable).toHaveLength(1);
    expect(result.surfaces[0].evaluada).toBe(false);
  });

  it('6. detecta número de pisos negativo o no entero', () => {
    const negative = makeFeature('QT-A-006', { props: { numero_pisos: -1 } });
    const decimal = makeFeature('QT-A-007', {
      lon: -78.49,
      props: { numero_pisos: 2.5 }
    });
    const result = evaluate(negative, decimal);
    const issues = issuesOf(result, 'ALF-006');
    expect(issues).toHaveLength(2);
    expect(issues.map((issue) => issue.valorObservado)).toEqual(['-1', '2.5']);
  });

  it('detecta tipos de datos incorrectos', () => {
    const badArea = makeFeature('QT-A-008', { props: { area_terreno_m2: '520.40' } });
    const badFloors = makeFeature('QT-A-009', {
      lon: -78.49,
      props: { numero_pisos: '4' }
    });
    const result = evaluate(badArea, badFloors);
    const issues = issuesOf(result, 'ALF-004');
    expect(issues).toHaveLength(2);
    expect(issues.map((issue) => issue.descripcion).join(' ')).toMatch(/numérico|textual/);
    // El área textual no puede compararse.
    expect(issuesOf(result, 'SUP-003')).toHaveLength(1);
  });

  it('detecta valores fuera de los dominios configurados', () => {
    const badUse = makeFeature('QT-A-010', { props: { uso_suelo: 'ESPACIAL' } });
    const badState = makeFeature('QT-A-011', {
      lon: -78.49,
      props: { estado: 'DESCONOCIDO' }
    });
    const result = evaluate(badUse, badState);
    const issues = issuesOf(result, 'ALF-007');
    expect(issues).toHaveLength(2);
    expect(issues.map((issue) => issue.valorObservado)).toEqual(
      expect.arrayContaining(['ESPACIAL', 'DESCONOCIDO'])
    );
  });

  it('marca la incoherencia área construida / pisos como advertencia, no como error', () => {
    const feature = makeFeature('QT-A-012', {
      props: { area_terreno_m2: 500, area_construida_m2: 2000, numero_pisos: 2 }
    });
    const result = evaluate(feature);
    const issues = issuesOf(result, 'ALF-008');
    expect(issues).toHaveLength(1);
    expect(issues[0].severidad).toBe('advertencia');
    expect(result.indicators.prediosConErrores).toBe(0);
    expect(result.indicators.prediosConAdvertencias).toBe(1);
    expect(result.indicators.prediosSinErrores).toBe(1);
  });

  it('no genera falsos positivos en un predio de control', () => {
    const result = evaluate(makeFeature('QT-A-013'));
    expect(codes(result)).toEqual([]);
  });
});
