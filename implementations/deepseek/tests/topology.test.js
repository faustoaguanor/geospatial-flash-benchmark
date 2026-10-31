import { describe, expect, it } from 'vitest';
import { classifyPair } from '../src/core/topology.js';
import {
  codes,
  evaluate,
  evaluateWith,
  issuesOf,
  makeFeature,
  rectGeometry
} from './helpers.js';

describe('Topología', () => {
  it('11. detecta solapamiento parcial con superficie positiva', () => {
    const a = makeFeature('QT-TP-001', { geometry: rectGeometry(-78.5, -0.22) });
    const b = makeFeature('QT-TP-002', {
      geometry: rectGeometry(-78.4999, -0.22),
      props: { clave_catastral: 'DEMO-TP-002' }
    });
    const result = evaluate(a, b);
    const issues = issuesOf(result, 'GEO-007');
    expect(issues).toHaveLength(2);
    expect(issues.map((issue) => issue.predioId)).toEqual(
      expect.arrayContaining(['QT-TP-001', 'QT-TP-002'])
    );
    expect(result.topology.overlaps).toBe(1);
  });

  it('12. predios que comparten borde no se clasifican como superposición', () => {
    const a = makeFeature('QT-TP-003', { geometry: rectGeometry(-78.5, -0.22) });
    const b = makeFeature('QT-TP-004', {
      geometry: rectGeometry(-78.4998, -0.22),
      props: { clave_catastral: 'DEMO-TP-004' }
    });
    expect(classifyPair(a, b).tipo).toBe('borde');
    const result = evaluate(a, b);
    expect(codes(result)).not.toContain('GEO-007');
    expect(result.topology.contacts.borde).toBe(1);
    expect(result.topology.overlaps).toBe(0);
  });

  it('13b. predios que comparten solo un vértice se clasifican como vértice', () => {
    const a = makeFeature('QT-TP-005', { geometry: rectGeometry(-78.5, -0.22) });
    const b = makeFeature('QT-TP-006', {
      geometry: rectGeometry(-78.4998, -0.2198),
      props: { clave_catastral: 'DEMO-TP-006' }
    });
    expect(classifyPair(a, b).tipo).toBe('vertice');
    const result = evaluate(a, b);
    expect(codes(result)).not.toContain('GEO-007');
    expect(result.topology.contacts.vertice).toBe(1);
  });

  it('distingue solape, borde y vértice en la misma función', () => {
    const base = { geometry: rectGeometry(-78.5, -0.22) };
    expect(
      classifyPair(base, { geometry: rectGeometry(-78.4999, -0.22) }).tipo
    ).toBe('solape');
    expect(
      classifyPair(base, { geometry: rectGeometry(-78.4998, -0.22) }).tipo
    ).toBe('borde');
    expect(
      classifyPair(base, { geometry: rectGeometry(-78.4998, -0.2198) }).tipo
    ).toBe('vertice');
    expect(
      classifyPair(base, { geometry: rectGeometry(-78.49, -0.21) }).tipo
    ).toBe('disjunto');
  });

  it('permite desactivar la regla de superposición', () => {
    const a = makeFeature('QT-TP-007', { geometry: rectGeometry(-78.5, -0.22) });
    const b = makeFeature('QT-TP-008', {
      geometry: rectGeometry(-78.4999, -0.22),
      props: { clave_catastral: 'DEMO-TP-008' }
    });
    const result = evaluateWith([a, b], { enabledRules: { 'GEO-007': false } });
    expect(issuesOf(result, 'GEO-007')).toHaveLength(0);
    expect(result.notEvaluated.some((item) => item.codigoRegla === 'GEO-007')).toBe(true);
  });
});
