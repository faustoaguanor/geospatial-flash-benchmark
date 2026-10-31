/** Pruebas de calidad alfanumérica. */
import { describe, it, expect } from 'vitest';
import { runQualityAnalysis } from '../src/modules/qualityEngine.js';
import { evaluateFeatureAttributes } from '../src/modules/attributeQuality.js';
import { fc, makeFeature, ruleCounts } from './helpers.js';

describe('Escenario 2: Clave catastral duplicada', () => {
  it('reporta ALFA_CLAVE_DUPLICADA con ambos predios relacionados', () => {
    const a = makeFeature({ id: 'P-0001', clave: 'SIM-DUP' });
    const b = makeFeature({ id: 'P-0002', clave: 'SIM-DUP' });
    const res = runQualityAnalysis(fc(a, b));
    const counts = ruleCounts(res.incidents);
    expect(counts.ALFA_CLAVE_DUPLICADA).toBe(1);
    const inc = res.incidents.find((i) => i.codigo_regla === 'ALFA_CLAVE_DUPLICADA');
    expect(inc.predios_relacionados.sort()).toEqual(['P-0001', 'P-0002']);
  });

  it('caso negativo: claves distintas no generan incidencia', () => {
    const a = makeFeature({ id: 'P-0001', clave: 'SIM-A' });
    const b = makeFeature({ id: 'P-0002', clave: 'SIM-B' });
    const res = runQualityAnalysis(fc(a, b));
    expect(ruleCounts(res.incidents).ALFA_CLAVE_DUPLICADA).toBeUndefined();
  });
});

describe('Escenario 3: ID duplicado', () => {
  it('reporta ALFA_ID_DUPLICADO', () => {
    const a = makeFeature({ id: 'P-DUP', clave: 'SIM-A' });
    const b = makeFeature({ id: 'P-DUP', clave: 'SIM-B' });
    const res = runQualityAnalysis(fc(a, b));
    expect(ruleCounts(res.incidents).ALFA_ID_DUPLICADO).toBe(1);
  });
});

describe('Escenario 4: Campo obligatorio vacío', () => {
  it('reporta ALFA_CAMPO_OBLIGATORIO_NULO para null y cadena vacía', () => {
    const a = makeFeature({ id: 'P-0001', overrides: { uso_suelo: null } });
    const b = makeFeature({ id: 'P-0002', clave: 'SIM-90-TEST-00002', overrides: { direccion: '' } });
    const res = runQualityAnalysis(fc(a, b));
    const obligatorios = res.incidents.filter((i) => i.codigo_regla === 'ALFA_CAMPO_OBLIGATORIO_NULO');
    expect(obligatorios).toHaveLength(2);
    expect(obligatorios.map((i) => i.predio_id).sort()).toEqual(['P-0001', 'P-0002']);
  });
});

describe('Escenario 5: Superficie negativa', () => {
  it('reporta ALFA_SUPERFICIE_NEGATIVA y SUP_VALOR_INVALIDO (coexistencia)', () => {
    const a = makeFeature({ id: 'P-NEG', overrides: { area_terreno_m2: -100 } });
    const res = runQualityAnalysis(fc(a));
    const counts = ruleCounts(res.incidents);
    expect(counts.ALFA_SUPERFICIE_NEGATIVA).toBe(1);
    expect(counts.SUP_VALOR_INVALIDO).toBe(1); // comparación no evaluable
  });
});

describe('Escenario 6: Número de pisos inválido', () => {
  it('reporta ALFA_NUM_PISOS_INVALIDO para no entero', () => {
    const inc = evaluateFeatureAttributes(makeFeature({ id: 'P-X', overrides: { num_pisos: 2.5 } }));
    expect(inc.some((i) => i.codigo_regla === 'ALFA_NUM_PISOS_INVALIDO')).toBe(true);
  });

  it('reporta ALFA_NUM_PISOS_INVALIDO para valor negativo', () => {
    const inc = evaluateFeatureAttributes(makeFeature({ id: 'P-X', overrides: { num_pisos: -1 } }));
    expect(inc.some((i) => i.codigo_regla === 'ALFA_NUM_PISOS_INVALIDO')).toBe(true);
  });

  it('caso negativo: pisos 0 con área construida 0 es válido', () => {
    const inc = evaluateFeatureAttributes(
      makeFeature({ id: 'P-X', overrides: { num_pisos: 0, area_construida_m2: 0 } })
    );
    expect(inc).toHaveLength(0);
  });
});

describe('Tipos de dato y dominios', () => {
  it('reporta ALFA_TIPO_DATO_INCORRECTO para cadena en campo numérico', () => {
    const a = makeFeature({ id: 'P-TYPE', overrides: { area_terreno_m2: '120.5' } });
    const res = runQualityAnalysis(fc(a));
    expect(ruleCounts(res.incidents).ALFA_TIPO_DATO_INCORRECTO).toBe(1);
  });

  it('reporta ALFA_VALOR_FUERA_DOMINIO para uso de suelo fuera de catálogo', () => {
    const a = makeFeature({ id: 'P-DOM', overrides: { uso_suelo: 'Agrícola' } });
    const res = runQualityAnalysis(fc(a));
    expect(ruleCounts(res.incidents).ALFA_VALOR_FUERA_DOMINIO).toBe(1);
  });

  it('reporta advertencia ALFA_INCONSISTENCIA_AREA_PISOS cuando construida > terreno × pisos', () => {
    const a = makeFeature({ id: 'P-INC', overrides: { area_construida_m2: 99999 } });
    const res = runQualityAnalysis(fc(a));
    const inc = res.incidents.find((i) => i.codigo_regla === 'ALFA_INCONSISTENCIA_AREA_PISOS');
    expect(inc).toBeDefined();
    expect(inc.severidad).toBe('warning');
  });
});
