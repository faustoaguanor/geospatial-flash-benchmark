/** Pruebas de análisis topológico. */
import { describe, it, expect } from 'vitest';
import { runQualityAnalysis } from '../src/modules/qualityEngine.js';
import { fc, makeFeature, squareAtOffset, ruleCounts } from './helpers.js';

describe('Escenario 11: Solapamiento parcial de predios', () => {
  it('reporta TOPO_SOLAPAMIENTO para dos rectángulos que se superponen', () => {
    // ancho 10 m, centros separados 5 m → franja de solape de 5 m × 10 m = 50 m²
    const a = makeFeature({ id: 'P-A', clave: 'SIM-A' });
    const b = makeFeature({ id: 'P-B', clave: 'SIM-B', geom: { type: 'Polygon', coordinates: [squareAtOffset(5, 0)] } });
    const res = runQualityAnalysis(fc(a, b));
    const counts = ruleCounts(res.incidents);
    expect(counts.TOPO_SOLAPAMIENTO).toBe(1);
    expect(counts.TOPO_CONTACTO_BORDE).toBeUndefined();
    expect(counts.TOPO_CONTACTO_VERTICE).toBeUndefined();
    const inc = res.incidents.find((i) => i.codigo_regla === 'TOPO_SOLAPAMIENTO');
    expect(inc.severidad).toBe('error');
    expect(inc.predios_relacionados.sort()).toEqual(['P-A', 'P-B']);
  });

  it('caso negativo: predios separados no generan incidencias topológicas', () => {
    const a = makeFeature({ id: 'P-A', clave: 'SIM-A' });
    const b = makeFeature({ id: 'P-B', clave: 'SIM-B', geom: { type: 'Polygon', coordinates: [squareAtOffset(100, 0)] } });
    const res = runQualityAnalysis(fc(a, b));
    expect(res.incidents.filter((i) => i.codigo_regla.startsWith('TOPO_'))).toHaveLength(0);
  });
});

describe('Escenario 12: Predios que comparten borde sin solaparse', () => {
  it('reporta TOPO_CONTACTO_BORDE (info) y NO TOPO_SOLAPAMIENTO', () => {
    // A centrado en (0,0), B centrado 10 m al este: comparten el borde x=+5 m exacto
    const a = makeFeature({ id: 'P-A', clave: 'SIM-A' });
    const b = makeFeature({ id: 'P-B', clave: 'SIM-B', geom: { type: 'Polygon', coordinates: [squareAtOffset(10, 0)] } });
    const res = runQualityAnalysis(fc(a, b));
    const counts = ruleCounts(res.incidents);
    expect(counts.TOPO_SOLAPAMIENTO).toBeUndefined();
    expect(counts.TOPO_CONTACTO_BORDE).toBe(1);
    const inc = res.incidents.find((i) => i.codigo_regla === 'TOPO_CONTACTO_BORDE');
    expect(inc.severidad).toBe('info');
  });
});

describe('Contacto en vértice', () => {
  it('reporta TOPO_CONTACTO_VERTICE y NO TOPO_SOLAPAMIENTO', () => {
    // A: [-5..5]×[-5..5]; B centrado en (+10, +10): comparten el punto (+5, +5)
    const a = makeFeature({ id: 'P-A', clave: 'SIM-A' });
    const b = makeFeature({ id: 'P-B', clave: 'SIM-B', geom: { type: 'Polygon', coordinates: [squareAtOffset(10, 10)] } });
    const res = runQualityAnalysis(fc(a, b));
    const counts = ruleCounts(res.incidents);
    expect(counts.TOPO_SOLAPAMIENTO).toBeUndefined();
    expect(counts.TOPO_CONTACTO_VERTICE).toBe(1);
  });
});

describe('Desactivación de reglas', () => {
  it('al desactivar TOPO_SOLAPAMIENTO no se reportan solapamientos', () => {
    const a = makeFeature({ id: 'P-A', clave: 'SIM-A' });
    const b = makeFeature({ id: 'P-B', clave: 'SIM-B', geom: { type: 'Polygon', coordinates: [squareAtOffset(5, 0)] } });
    const res = runQualityAnalysis(fc(a, b), { enabledRules: new Set(['ALFA_CLAVE_DUPLICADA', 'SUP_FUERA_TOLERANCIA']) });
    expect(res.incidents.some((i) => i.codigo_regla === 'TOPO_SOLAPAMIENTO')).toBe(false);
  });
});
