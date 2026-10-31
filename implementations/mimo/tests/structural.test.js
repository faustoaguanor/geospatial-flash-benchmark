import { describe, it, expect } from 'vitest';
import { parseGeoJSONText } from '../src/core/dataLoader.js';
import { evaluateDataset } from '../src/core/engine.js';
import { makeFeature, codes } from './helpers.js';

describe('escenario 01 — FeatureCollection válido', () => {
  it('parsea sin incidencias estructurales y el motor no reporta errores', () => {
    const fc = { type: 'FeatureCollection', features: [makeFeature()] };
    const { ok, incidents } = parseGeoJSONText(JSON.stringify(fc));
    expect(ok).toBe(true);
    expect(incidents).toHaveLength(0);

    const result = evaluateDataset(fc.features);
    const errors = result.incidents.filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });
});

describe('escenario 17 — JSON malformado', () => {
  it('reporta STR-001 sin lanzar excepción', () => {
    const { ok, incidents } = parseGeoJSONText('{ "type": "FeatureCollection", ');
    expect(ok).toBe(false);
    expect(codes(incidents)).toContain('STR-001');
    expect(incidents[0].severity).toBe('error');
  });
});

describe('escenario 18 — FeatureCollection vacío', () => {
  it('reporta STR-003', () => {
    const { ok, incidents } = parseGeoJSONText(JSON.stringify({ type: 'FeatureCollection', features: [] }));
    expect(ok).toBe(false);
    expect(codes(incidents)).toContain('STR-003');
  });
});

describe('validación estructural adicional', () => {
  it('reporta STR-002 cuando la raíz no es FeatureCollection', () => {
    const { ok, incidents } = parseGeoJSONText(JSON.stringify({ type: 'Feature', properties: {}, geometry: null }));
    expect(ok).toBe(false);
    expect(codes(incidents)).toContain('STR-002');
  });
});
