import { describe, expect, it } from 'vitest';
import { evaluateCollection, evaluateGeoJSONText } from '../src/core/engine.js';
import {
  codes,
  crossedGeometry,
  evaluate,
  featureCollection,
  issuesOf,
  makeFeature,
  rectGeometry
} from './helpers.js';

describe('Validación estructural', () => {
  it('1. acepta una FeatureCollection válida sin incidencias', () => {
    const result = evaluate(makeFeature('QT-T-001'));
    expect(result.structural).toMatchObject({
      totalEntidades: 1,
      prediosEvaluables: 1,
      entidadesOmitidas: 0
    });
    expect(result.issues).toEqual([]);
    expect(result.indicators.totalPredios).toBe(1);
    expect(result.indicators.prediosSinErrores).toBe(1);
  });

  it('informa JSON malformado sin lanzar excepciones', () => {
    const result = evaluateGeoJSONText('{"type": "FeatureCollection", features: [}');
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].codigoRegla).toBe('STR-001');
    expect(result.indicators.totalPredios).toBe(0);
    expect(result.meta.errorDeCarga).toBe(true);
  });

  it('informa una FeatureCollection vacía como advertencia', () => {
    const result = evaluateCollection({ type: 'FeatureCollection', features: [] });
    expect(codes(result)).toEqual(['STR-003']);
    expect(result.issues[0].severidad).toBe('advertencia');
    expect(result.structural.totalEntidades).toBe(0);
  });

  it('informa una raíz que no es FeatureCollection', () => {
    const result = evaluateCollection({ type: 'Feature', geometry: null, properties: {} });
    expect(codes(result)).toEqual(['STR-002']);
    expect(result.structural.prediosEvaluables).toBe(0);
  });

  it('informa una Feature con estructura incorrecta sin bloquear el resto', () => {
    const invalid = { type: 'NotAFeature', properties: { id: 'BROKEN' }, geometry: rectGeometry() };
    const valid = makeFeature('QT-T-002', { lon: -78.49 });
    const result = evaluateCollection(featureCollection(invalid, valid));
    expect(codes(result)).toContain('STR-004');
    expect(result.structural.totalEntidades).toBe(2);
    expect(result.structural.prediosEvaluables).toBe(1);
    expect(result.indicators.totalPredios).toBe(1);
  });

  it('informa properties con tipo inválido', () => {
    const broken = makeFeature('QT-T-003');
    broken.properties = 'no-es-un-objeto';
    const result = evaluateCollection(featureCollection(broken));
    expect(codes(result)).toContain('STR-004');
    expect(result.structural.prediosEvaluables).toBe(0);
  });

  it('7. informa geometría nula y no bloquea la aplicación', () => {
    const result = evaluate(makeFeature('QT-T-004', { omitGeometry: true }));
    expect(codes(result)).toEqual(['STR-005']);
    expect(result.structural.prediosEvaluables).toBe(0);
    expect(result.issues[0].predioId).toBe('QT-T-004');
  });

  it('informa geometría no admitida para evaluación predial', () => {
    const line = {
      type: 'LineString',
      coordinates: [
        [-78.5, -0.22],
        [-78.4998, -0.2198]
      ]
    };
    const result = evaluate(makeFeature('QT-T-005', { geometry: line }));
    expect(codes(result)).toEqual(['STR-006']);
    expect(issuesOf(result, 'STR-006')[0].valorObservado).toBe('LineString');
  });

  it('informa una geometría vacía', () => {
    const result = evaluate(
      makeFeature('QT-T-006', { geometry: { type: 'Polygon', coordinates: [] } })
    );
    expect(codes(result)).toContain('GEO-002');
    expect(result.indicators.totalPredios).toBe(1);
  });
});
