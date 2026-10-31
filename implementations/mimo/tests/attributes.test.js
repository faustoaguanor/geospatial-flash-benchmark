import { describe, it, expect } from 'vitest';
import { evaluateDataset } from '../src/core/engine.js';
import { makeFeature, codes } from './helpers.js';

describe('escenario 02 — clave catastral duplicada', () => {
  it('marca ALP-002 en ambas features que comparten la clave', () => {
    const a = makeFeature({}, { id_predio: 'PD-A', clave_catastral: 'DUP-1' });
    const b = makeFeature({}, { id_predio: 'PD-B', clave_catastral: 'DUP-1' });
    const result = evaluateDataset([a, b]);
    const dup = result.incidents.filter((i) => i.rule_code === 'ALP-002');
    expect(dup).toHaveLength(2);
    expect(dup.map((i) => i.feature_ref).sort()).toEqual(['PD-A', 'PD-B']);
  });

  it('no marca ALP-002 cuando las claves son distintas (caso negativo)', () => {
    const a = makeFeature({}, { id_predio: 'PD-A', clave_catastral: 'K-1' });
    const b = makeFeature({}, { id_predio: 'PD-B', clave_catastral: 'K-2' });
    const result = evaluateDataset([a, b]);
    expect(codes(result.incidents)).not.toContain('ALP-002');
  });
});

describe('escenario 03 — identificador duplicado', () => {
  it('marca ALP-001 en ambas features con el mismo id_predio', () => {
    const a = makeFeature({}, { id_predio: 'PD-X' });
    const b = makeFeature({}, { id_predio: 'PD-X' });
    const result = evaluateDataset([a, b]);
    const dup = result.incidents.filter((i) => i.rule_code === 'ALP-001');
    expect(dup).toHaveLength(2);
  });
});

describe('escenario 04 — campo obligatorio vacío', () => {
  it('marca ALP-003 cuando un campo obligatorio es null o cadena vacía', () => {
    const a = makeFeature({}, { sector: null });
    const b = makeFeature({}, { id_predio: 'PD-B', direccion: '   ' }); // dirección no es obligatoria
    const result = evaluateDataset([a, b]);
    const inc3 = result.incidents.filter((i) => i.rule_code === 'ALP-003');
    expect(inc3).toHaveLength(1);
    expect(inc3[0].feature_ref).toBe('PD-TEST-0001');
  });
});

describe('escenario 05 — superficie negativa', () => {
  it('marca ALP-005 y deja SUP sin evaluar (no inventa comparación)', () => {
    const a = makeFeature({}, { area_terreno_m2: -120 });
    const result = evaluateDataset([a]);
    expect(codes(result.incidents)).toContain('ALP-005');
    expect(result.notEvaluated.some((n) => n.rule_code === 'SUP-001' && n.feature_ref === 'PD-TEST-0001')).toBe(true);
  });
});

describe('escenario 06 — número de pisos inválido', () => {
  it('marca ALP-006 para pisos negativos y para cero', () => {
    const result = evaluateDataset([
      makeFeature({}, { id_predio: 'P1', pisos: -2 }),
      makeFeature({}, { id_predio: 'P2', pisos: 0 }),
    ]);
    expect(result.incidents.filter((i) => i.rule_code === 'ALP-006')).toHaveLength(2);
  });

  it('marca ALP-004 para pisos no enteros (tipo incorrecto)', () => {
    const result = evaluateDataset([makeFeature({}, { pisos: 2.5 })]);
    expect(codes(result.incidents)).toContain('ALP-004');
  });
});

describe('escenario — valores fuera de dominio', () => {
  it('marca ALP-007 para uso_suelo y estado_predio inválidos', () => {
    const result = evaluateDataset([
      makeFeature({}, { id_predio: 'P1', uso_suelo: 'agrícola-urbano' }),
      makeFeature({}, { id_predio: 'P2', estado_predio: 'rematado' }),
    ]);
    const dom = result.incidents.filter((i) => i.rule_code === 'ALP-007');
    expect(dom).toHaveLength(2);
  });

  it('marca ALP-004 cuando el área registrada es texto numérico', () => {
    const result = evaluateDataset([makeFeature({}, { area_terreno_m2: '9200' })]);
    expect(codes(result.incidents)).toContain('ALP-004');
    // la comparación de superficies no se evalúa con valores no numéricos
    expect(result.notEvaluated.some((n) => n.rule_code === 'SUP-001')).toBe(true);
  });
});

describe('modelo de incidencias', () => {
  it('cada incidencia cumple el modelo requerido', () => {
    const result = evaluateDataset([makeFeature({}, { sector: null })]);
    expect(result.incidents.length).toBeGreaterThan(0);
    for (const inc of result.incidents) {
      expect(inc.id).toMatch(/^INC-\d{5}$/);
      expect(inc.rule_code).toBeTruthy();
      expect(inc.feature_ref).toBeTruthy();
      expect(inc.dimension).toBeTruthy();
      expect(['error', 'advertencia']).toContain(inc.severity);
      expect(inc.description).toBeTruthy();
      expect(inc.criterion).toBeTruthy();
      expect(Object.prototype.hasOwnProperty.call(inc, 'observed_value')).toBe(true);
    }
  });
});
