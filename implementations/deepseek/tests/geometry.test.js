import { describe, expect, it } from 'vitest';
import {
  codes,
  crossedGeometry,
  evaluate,
  evaluateWith,
  issuesOf,
  makeFeature,
  rectGeometry
} from './helpers.js';

describe('Calidad geométrica', () => {
  it('8. detecta coordenadas fuera de rango', () => {
    const result = evaluate(makeFeature('QT-G-001', { geometry: rectGeometry(200, 10) }));
    const issues = issuesOf(result, 'GEO-001');
    expect(issues).toHaveLength(1);
    expect(issues[0].dimension).toBe('exactitud_posicional');
  });

  it('9. detecta un anillo no cerrado', () => {
    const geometry = {
      type: 'Polygon',
      coordinates: [
        [
          [-78.5, -0.22],
          [-78.4998, -0.22],
          [-78.4998, -0.2198],
          [-78.5, -0.2198]
        ]
      ]
    };
    const result = evaluate(makeFeature('QT-G-002', { geometry }));
    expect(issuesOf(result, 'GEO-003')).toHaveLength(1);
  });

  it('detecta un anillo con menos de 4 posiciones', () => {
    const geometry = {
      type: 'Polygon',
      coordinates: [
        [
          [-78.5, -0.22],
          [-78.4998, -0.22],
          [-78.5, -0.2198]
        ]
      ]
    };
    const result = evaluate(makeFeature('QT-G-003', { geometry }));
    expect(codes(result)).toContain('GEO-009');
  });

  it('10. detecta autointersección en un polígono cruzado con área positiva', () => {
    const geometry = crossedGeometry();
    const result = evaluate(makeFeature('QT-G-004', { geometry }));
    const issues = issuesOf(result, 'GEO-004');
    expect(issues).toHaveLength(1);
    expect(issues[0].valorObservado).toMatch(/cruce/);
    expect(codes(result)).not.toContain('GEO-006');
  });

  it('detecta polígonos de área cero sin confundirlos con autointersección', () => {
    const geometry = {
      type: 'Polygon',
      coordinates: [
        [
          [-78.5, -0.22],
          [-78.4998, -0.22],
          [-78.4998, -0.22],
          [-78.5, -0.22],
          [-78.5, -0.22]
        ]
      ]
    };
    const result = evaluate(makeFeature('QT-G-005', { geometry }));
    expect(issuesOf(result, 'GEO-006')).toHaveLength(1);
    expect(codes(result)).not.toContain('GEO-004');
  });

  it('13. detecta geometrías duplicadas', () => {
    const geometry = rectGeometry();
    const a = makeFeature('QT-G-006', { geometry });
    const b = makeFeature('QT-G-007', { geometry, props: { clave_catastral: 'DEMO-K-G007' } });
    const result = evaluateWith([a, b], { enabledRules: { 'GEO-007': false } });
    expect(issuesOf(result, 'GEO-005')).toHaveLength(2);
    expect(issuesOf(result, 'GEO-007')).toHaveLength(0);
  });

  it('una geometría duplicada también puede superponerse y ambas reglas coexisten', () => {
    const geometry = rectGeometry();
    const a = makeFeature('QT-G-008', { geometry });
    const b = makeFeature('QT-G-009', { geometry, props: { clave_catastral: 'DEMO-K-G009' } });
    const result = evaluate(a, b);
    expect(issuesOf(result, 'GEO-005')).toHaveLength(2);
    expect(issuesOf(result, 'GEO-007')).toHaveLength(2);
  });

  it('acepta MultiPolygon válido', () => {
    const geometry = {
      type: 'MultiPolygon',
      coordinates: [
        rectGeometry(-78.5, -0.22, 0.0001, 0.0001).coordinates,
        rectGeometry(-78.4995, -0.22, 0.0001, 0.0001).coordinates
      ]
    };
    const result = evaluate(makeFeature('QT-G-010', { geometry }));
    expect(result.structural.prediosEvaluables).toBe(1);
    expect(codes(result)).toEqual([]);
  });
});
