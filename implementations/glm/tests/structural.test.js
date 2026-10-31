/** Pruebas de validación estructural (RFC 7946). */
import { describe, it, expect } from 'vitest';
import { runQualityAnalysis } from '../src/modules/qualityEngine.js';
import { parseGeoJsonText } from '../src/modules/structuralValidation.js';
import { fc, makeFeature, squareAtOffset, ruleCounts } from './helpers.js';

describe('Escenario 1: FeatureCollection válido', () => {
  it('no genera incidencias para dos predios válidos separados', () => {
    const a = makeFeature({ id: 'P-0001', clave: 'SIM-90-TEST-00001' });
    const b = makeFeature({ id: 'P-0002', clave: 'SIM-90-TEST-00002', geom: { type: 'Polygon', coordinates: [squareAtOffset(60, 0)] } });
    const res = runQualityAnalysis(fc(a, b));
    expect(res.ok).toBe(true);
    expect(res.incidents).toHaveLength(0);
    expect(res.features).toHaveLength(2);
  });
});

describe('Escenario 17: JSON malformado', () => {
  it('reporta ESTRUCT_JSON_MALFORMADO y no evalúa reglas de datos', () => {
    const res = runQualityAnalysis('{"type": "FeatureCollection", "features": [');
    expect(res.structuralFatal).toBe(true);
    const counts = ruleCounts(res.incidents);
    expect(counts.ESTRUCT_JSON_MALFORMADO).toBe(1);
    expect(res.indicators).toBeNull();
    expect(res.notEvaluatedRules).toContain('ALFA_CLAVE_DUPLICADA');
    expect(res.notEvaluatedRules).toContain('TOPO_SOLAPAMIENTO');
  });

  it('parseGeoJsonText devuelve el error de parseo', () => {
    const parsed = parseGeoJsonText('no soy json');
    expect(parsed.data).toBeNull();
    expect(parsed.incidents[0].codigo_regla).toBe('ESTRUCT_JSON_MALFORMADO');
  });
});

describe('Escenario 18: FeatureCollection vacío', () => {
  it('reporta colección vacía sin bloquearse y marca reglas no evaluadas', () => {
    const res = runQualityAnalysis(fc());
    expect(res.structuralFatal).toBe(false);
    const counts = ruleCounts(res.incidents);
    expect(counts.ESTRUCT_COLECCION_VACIA).toBe(1);
    expect(res.features).toHaveLength(0);
    expect(res.notEvaluatedRules).toContain('GEOM_VACIA');
    expect(res.notEvaluatedRules).toContain('SUP_FUERA_TOLERANCIA');
  });
});

describe('Estructura de features', () => {
  it('reporta feature con estructura incorrecta (sin type Feature)', () => {
    const res = runQualityAnalysis({ type: 'FeatureCollection', features: [{ geometry: null, properties: {} }] });
    const counts = ruleCounts(res.incidents);
    expect(counts.ESTRUCT_FEATURE_INVALIDO).toBe(1);
  });

  it('reporta FeatureCollection inválido (objeto raíz incorrecto)', () => {
    const res = runQualityAnalysis({ type: 'Feature', geometry: null, properties: {} });
    expect(ruleCounts(res.incidents).ESTRUCT_FC_INVALIDO).toBe(1);
  });

  it('reporta geometría de tipo no soportado (Point)', () => {
    const f = makeFeature({});
    f.geometry = { type: 'Point', coordinates: [-78.48, -0.18] };
    const res = runQualityAnalysis(fc(f));
    const counts = ruleCounts(res.incidents);
    expect(counts.ESTRUCT_GEOMETRIA_NO_SOPORTADA).toBe(1);
  });
});

describe('Escenario 7: Geometría nula', () => {
  it('reporta ESTRUCT_GEOMETRIA_NULA y excluye el predio de reglas geométricas', () => {
    const a = makeFeature({ id: 'P-NULL', overrides: {} });
    a.geometry = null;
    const b = makeFeature({ id: 'P-0002', clave: 'SIM-90-TEST-00002' });
    const res = runQualityAnalysis(fc(a, b));
    const counts = ruleCounts(res.incidents);
    expect(counts.ESTRUCT_GEOMETRIA_NULA).toBe(1);
    expect(res.features.some((f) => f.properties.id_predio === 'P-NULL')).toBe(false);
    // el predio válido sigue evaluándose sin incidencias adicionales
    expect(res.incidents.filter((i) => i.predio_id === 'P-0002')).toHaveLength(0);
  });
});
