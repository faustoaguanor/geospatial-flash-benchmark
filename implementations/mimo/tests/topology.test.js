import { describe, it, expect } from 'vitest';
import { evaluateDataset } from '../src/core/engine.js';
import { makeFeature } from './helpers.js';

function square(minLon, minLat, size = 0.001) {
  return [
    [minLon, minLat],
    [minLon + size, minLat],
    [minLon + size, minLat + size],
    [minLon, minLat + size],
    [minLon, minLat],
  ];
}

describe('escenario 11 — solapamiento parcial de predios', () => {
  it('marca TOP-001 en ambos predios con el área de intersección', () => {
    const a = makeFeature({ ring: square(-78.510, -0.220) }, { id_predio: 'P-A', clave_catastral: 'KA' });
    const b = makeFeature({ ring: square(-78.5095, -0.220) }, { id_predio: 'P-B', clave_catastral: 'KB' });
    const result = evaluateDataset([a, b]);
    const top = result.incidents.filter((i) => i.rule_code === 'TOP-001');
    expect(top).toHaveLength(2);
    expect(top.map((i) => i.feature_ref).sort()).toEqual(['P-A', 'P-B']);
    expect(top[0].observed_value).toBeGreaterThan(0.01);
    expect(top[0].severity).toBe('error');
  });

  it('no marca superposición entre cuadrados disjuntos (caso negativo)', () => {
    const a = makeFeature({ ring: square(-78.520, -0.220) }, { id_predio: 'P-A', clave_catastral: 'KA' });
    const b = makeFeature({ ring: square(-78.510, -0.220) }, { id_predio: 'P-B', clave_catastral: 'KB' });
    const result = evaluateDataset([a, b]);
    expect(result.incidents.filter((i) => i.rule_code === 'TOP-001')).toHaveLength(0);
  });
});

describe('escenario 12 — predios que comparten borde sin solaparse', () => {
  it('NO clasifica el contacto en borde como superposición', () => {
    const a = makeFeature({ ring: square(-78.510, -0.220) }, { id_predio: 'P-A', clave_catastral: 'KA' });
    // B empieza exactamente donde termina A: comparten el borde vertical
    const b = makeFeature({ ring: square(-78.509, -0.220) }, { id_predio: 'P-B', clave_catastral: 'KB' });
    const result = evaluateDataset([a, b]);
    expect(result.incidents.filter((i) => i.rule_code === 'TOP-001')).toHaveLength(0);
    // además el contacto queda registrado como borde (no como incidencia)
    expect(result.contacts.some((c) => c.kind.includes('borde'))).toBe(true);
  });

  it('NO clasifica el contacto en vértice como superposición', () => {
    const a = makeFeature({ ring: square(-78.510, -0.220) }, { id_predio: 'P-A', clave_catastral: 'KA' });
    // B toca a A solo en el vértice superior derecho
    const b = makeFeature({ ring: square(-78.509, -0.219) }, { id_predio: 'P-B', clave_catastral: 'KB' });
    const result = evaluateDataset([a, b]);
    expect(result.incidents.filter((i) => i.rule_code === 'TOP-001')).toHaveLength(0);
  });

  it('detecta el contacto aunque el primer polígono sea el más alto (fallback bidireccional)', () => {
    // A: 0.002° de alto; B: 0.001° compartiendo el borde derecho de A
    const tallRing = [
      [-78.510, -0.220],
      [-78.509, -0.220],
      [-78.509, -0.218],
      [-78.510, -0.218],
      [-78.510, -0.220],
    ];
    const a = makeFeature({ ring: tallRing }, { id_predio: 'P-A', clave_catastral: 'KA' });
    const b = makeFeature({ ring: square(-78.509, -0.2195) }, { id_predio: 'P-B', clave_catastral: 'KB' });
    const result = evaluateDataset([a, b]);
    expect(result.incidents.filter((i) => i.rule_code === 'TOP-001')).toHaveLength(0);
    expect(result.contacts.length).toBe(1);
  });
});
