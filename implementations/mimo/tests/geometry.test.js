import { describe, it, expect } from 'vitest';
import { evaluateDataset } from '../src/core/engine.js';
import { makeFeature, codes } from './helpers.js';

const closedRing = [
  [-78.5100, -0.2200],
  [-78.5090, -0.2200],
  [-78.5090, -0.2190],
  [-78.5100, -0.2190],
  [-78.5100, -0.2200],
];

describe('escenario 07 — geometría nula', () => {
  it('marca STR-005 sin bloquear la evaluación del resto', () => {
    const result = evaluateDataset([
      makeFeature({ geometry: null }, { id_predio: 'P-NULA' }),
      makeFeature({}, { id_predio: 'P-OK', clave_catastral: 'K-OK' }),
    ]);
    expect(codes(result.incidents, 'P-NULA')).toContain('STR-005');
    // la otra feature igual se evalúa
    expect(result.featureResults.find((r) => r.ref === 'P-OK')).toBeTruthy();
  });
});

describe('escenario 08 — coordenadas fuera de rango', () => {
  it('marca GEO-001 con longitud 190', () => {
    const badRing = closedRing.map(([lon, lat]) => (lon === -78.5100 ? [190, lat] : [lon, lat]));
    badRing[4] = [...badRing[0]];
    const result = evaluateDataset([makeFeature({ ring: badRing })]);
    expect(codes(result.incidents)).toContain('GEO-001');
  });
});

describe('escenario 09 — anillo no cerrado', () => {
  it('marca GEO-003 cuando la última posición difiere de la primera', () => {
    const openRing = [
      [-78.5100, -0.2200],
      [-78.5090, -0.2200],
      [-78.5090, -0.2190],
      [-78.5100, -0.2190],
      [-78.5101, -0.2201], // no coincide con la primera
    ];
    const result = evaluateDataset([makeFeature({ ring: openRing })]);
    expect(codes(result.incidents)).toContain('GEO-003');
  });

  it('no marca GEO-003 para el rectángulo cerrado estándar (caso negativo)', () => {
    const result = evaluateDataset([makeFeature({ ring: closedRing })]);
    expect(codes(result.incidents)).not.toContain('GEO-003');
  });
});

describe('escenario 10 — polígono autointersecado', () => {
  it('marca GEO-004 en un bowtie', () => {
    const bowtie = [
      [-78.5100, -0.2200],
      [-78.5090, -0.2190],
      [-78.5090, -0.2200],
      [-78.5100, -0.2190],
      [-78.5100, -0.2200],
    ];
    const result = evaluateDataset([makeFeature({ ring: bowtie })]);
    expect(codes(result.incidents)).toContain('GEO-004');
    // el área no es confiable: SUP queda no evaluado, no en silencio
    expect(result.notEvaluated.some((n) => n.rule_code === 'SUP-001')).toBe(true);
  });
});

describe('escenario 13 — geometrías duplicadas', () => {
  it('marca GEO-005 en ambas features con geometría idéntica', () => {
    const result = evaluateDataset([
      makeFeature({}, { id_predio: 'P-A', clave_catastral: 'KA' }),
      makeFeature({}, { id_predio: 'P-B', clave_catastral: 'KB' }),
    ]);
    expect(codes(result.incidents)).toContain('GEO-005');
    expect(result.incidents.filter((i) => i.rule_code === 'GEO-005')).toHaveLength(2);
  });

  it('no marca GEO-005 para geometrías distintas (caso negativo)', () => {
    const shifted = closedRing.map(([lon, lat]) => [lon + 0.002, lat]);
    const result = evaluateDataset([
      makeFeature({}, { id_predio: 'P-A', clave_catastral: 'KA' }),
      makeFeature({ ring: shifted }, { id_predio: 'P-B', clave_catastral: 'KB' }),
    ]);
    expect(codes(result.incidents)).not.toContain('GEO-005');
  });
});

describe('escenario — polígono de área cero', () => {
  it('marca GEO-006 para un polígono colapsado (puntos colineales)', () => {
    const degenerate = [
      [-78.5100, -0.2200],
      [-78.5095, -0.2200],
      [-78.5090, -0.2200],
      [-78.5100, -0.2200],
    ];
    const result = evaluateDataset([makeFeature({ ring: degenerate })]);
    expect(codes(result.incidents)).toContain('GEO-006');
  });
});

describe('escenario — geometría vacía', () => {
  it('marca GEO-002 para coordinates=[]', () => {
    const result = evaluateDataset([makeFeature({ geometry: { type: 'Polygon', coordinates: [] } })]);
    expect(codes(result.incidents)).toContain('GEO-002');
  });
});

describe('escenario — geometría no admitida', () => {
  it('marca STR-006 para Point y no intenta métricas', () => {
    const result = evaluateDataset([
      makeFeature({ geometry: { type: 'Point', coordinates: [-78.51, -0.22] } }),
    ]);
    expect(codes(result.incidents)).toContain('STR-006');
  });
});
