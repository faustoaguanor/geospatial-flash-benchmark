/** Pruebas de calidad geométrica. */
import { describe, it, expect } from 'vitest';
import { runQualityAnalysis } from '../src/modules/qualityEngine.js';
import { ringIsSelfIntersecting, segmentsProperlyIntersect } from '../src/modules/geometricQuality.js';
import { fc, makeFeature, squareRing, QUITO, ruleCounts } from './helpers.js';

describe('Escenario 8: Coordenadas fuera de rango', () => {
  it('reporta GEOM_COORD_FUERA_RANGO para latitud > 90', () => {
    const a = makeFeature({ id: 'P-RANGE' });
    a.geometry.coordinates = a.geometry.coordinates.map((ring) =>
      ring.map(([lon], i) => [lon, i === 0 ? 95 : -0.1795])
    );
    const res = runQualityAnalysis(fc(a));
    expect(ruleCounts(res.incidents).GEOM_COORD_FUERA_RANGO).toBe(1);
  });

  it('caso negativo: coordenadas válidas de Quito no generan incidencia', () => {
    const a = makeFeature({ id: 'P-OK' });
    const res = runQualityAnalysis(fc(a));
    expect(ruleCounts(res.incidents).GEOM_COORD_FUERA_RANGO).toBeUndefined();
  });
});

describe('Escenario 9: Anillo no cerrado', () => {
  it('reporta GEOM_ANILLO_NO_CERRADO', () => {
    const a = makeFeature({ id: 'P-OPEN' });
    const ring = squareRing(QUITO.lon, QUITO.lat);
    ring.pop(); // quitar el vértice de cierre
    a.geometry = { type: 'Polygon', coordinates: [ring] };
    const res = runQualityAnalysis(fc(a));
    expect(ruleCounts(res.incidents).GEOM_ANILLO_NO_CERRADO).toBe(1);
  });
});

describe('Escenario 10: Polígono autointersecado', () => {
  it('reporta GEOM_AUTOINTERSECCION para un anillo en forma de moño', () => {
    const ring = squareRing(QUITO.lon, QUITO.lat);
    const [a, b, c, d] = ring; // a..d
    const bowtie = [a, b, d, c, a];
    const res = runQualityAnalysis(fc(makeFeature({ id: 'P-BOWTIE', geom: { type: 'Polygon', coordinates: [bowtie] } })));
    expect(ruleCounts(res.incidents).GEOM_AUTOINTERSECCION).toBe(1);
  });

  it('ringIsSelfIntersecting: false para un rectángulo simple (caso negativo)', () => {
    expect(ringIsSelfIntersecting(squareRing(QUITO.lon, QUITO.lat))).toBe(false);
  });

  it('segmentsProperlyIntersect detecta un cruce en X', () => {
    expect(segmentsProperlyIntersect([0, 0], [2, 2], [0, 2], [2, 0])).toBe(true);
    expect(segmentsProperlyIntersect([0, 0], [1, 0], [2, 0], [3, 0])).toBe(false); // colineales separados
  });
});

describe('Escenario 13: Geometrías duplicadas', () => {
  it('reporta GEOM_DUPLICADA y NO reporta solapamiento para el mismo par', () => {
    const ring = squareRing(QUITO.lon, QUITO.lat);
    const a = makeFeature({ id: 'P-0001', clave: 'SIM-A', geom: { type: 'Polygon', coordinates: [ring] } });
    const b = makeFeature({ id: 'P-0002', clave: 'SIM-B', geom: { type: 'Polygon', coordinates: [JSON.parse(JSON.stringify(ring))] } });
    const res = runQualityAnalysis(fc(a, b));
    const counts = ruleCounts(res.incidents);
    expect(counts.GEOM_DUPLICADA).toBe(1);
    expect(counts.TOPO_SOLAPAMIENTO).toBeUndefined(); // caso negativo: no se duplica como solapamiento
  });
});

describe('Geometrías vacías y área cero', () => {
  it('reporta GEOM_VACIA para coordenadas vacías', () => {
    const a = makeFeature({ id: 'P-EMPTY' });
    a.geometry = { type: 'Polygon', coordinates: [] };
    const res = runQualityAnalysis(fc(a));
    expect(ruleCounts(res.incidents).GEOM_VACIA).toBe(1);
  });

  it('reporta GEOM_AREA_CERO para un polígono degenerado (línea)', () => {
    const ring = [
      [QUITO.lon, QUITO.lat],
      [QUITO.lon + 0.001, QUITO.lat],
      [QUITO.lon + 0.001, QUITO.lat],
      [QUITO.lon, QUITO.lat],
      [QUITO.lon, QUITO.lat]
    ];
    const res = runQualityAnalysis(fc(makeFeature({ id: 'P-ZERO', geom: { type: 'Polygon', coordinates: [ring] } })));
    expect(ruleCounts(res.incidents).GEOM_AREA_CERO).toBe(1);
  });
});
