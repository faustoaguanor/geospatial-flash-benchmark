import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { evaluateGeoJSONText } from '../src/core/engine.js';
import { classifyPair } from '../src/core/topology.js';

const geojsonUrl = new URL('../public/data/quito_predios_sinteticos.geojson', import.meta.url);
const expectedUrl = new URL('../data/expected_issues.json', import.meta.url);

const rawText = readFileSync(geojsonUrl, 'utf8');
const expected = JSON.parse(readFileSync(expectedUrl, 'utf8'));
const collection = JSON.parse(rawText);
const result = evaluateGeoJSONText(rawText, { datasetName: 'quito_predios_sinteticos.geojson' });

const hasRule = (predio, code) =>
  result.issues.some((issue) => issue.predioId === predio && issue.codigoRegla === code);

const featureById = (id) => collection.features.find((feature) => feature.properties.id === id);

describe('Conjunto sintético de Quito', () => {
  it('contiene al menos 60 predios reproducibles en los seis sectores', () => {
    expect(collection.features.length).toBeGreaterThanOrEqual(60);
    expect(collection.features.length).toBe(expected.total_predios);
    const sectors = new Set(collection.features.map((feature) => feature.properties.sector));
    expect(sectors.size).toBe(6);
    for (const sector of expected.sectores) {
      expect(sector.predios).toBe(12);
    }
    expect(result.structural.totalEntidades).toBe(collection.features.length);
    expect(result.structural.prediosEvaluables).toBe(collection.features.length);
    expect(result.issues.some((issue) => issue.codigoRegla.startsWith('STR-'))).toBe(false);
  });

  it('usa WGS84 en orden longitud, latitud y ubica los predios en Quito', () => {
    for (const feature of collection.features) {
      for (const ring of feature.geometry.coordinates) {
        for (const [lon, lat] of ring) {
          expect(lon).toBeGreaterThan(-79);
          expect(lon).toBeLessThan(-78);
          expect(lat).toBeGreaterThan(-0.5);
          expect(lat).toBeLessThan(0.1);
        }
      }
    }
  });

  it('detecta las tres claves catastrales duplicadas esperadas', () => {
    const defect = expected.errores_intencionales.claves_catastrales_duplicadas[0];
    expect(defect.predios).toHaveLength(3);
    for (const predio of defect.predios) {
      expect(hasRule(predio, 'ALF-002')).toBe(true);
    }
    expect(result.issues.filter((issue) => issue.codigoRegla === 'ALF-002')).toHaveLength(3);
  });

  it('detecta los tres campos obligatorios nulos', () => {
    const defects = expected.errores_intencionales.campos_obligatorios_nulos;
    expect(defects).toHaveLength(3);
    for (const defect of defects) {
      expect(hasRule(defect.predio, 'ALF-003')).toBe(true);
    }
  });

  it('detecta las dos superficies negativas', () => {
    const defects = expected.errores_intencionales.superficies_negativas;
    expect(defects).toHaveLength(2);
    for (const defect of defects) {
      expect(hasRule(defect.predio, 'ALF-005')).toBe(true);
    }
  });

  it('detecta los dos tipos de datos incorrectos', () => {
    const defects = expected.errores_intencionales.tipos_de_datos_incorrectos;
    expect(defects).toHaveLength(2);
    for (const defect of defects) {
      expect(hasRule(defect.predio, 'ALF-004')).toBe(true);
    }
  });

  it('detecta los dos pares de predios superpuestos', () => {
    const defects = expected.errores_intencionales.superposiciones;
    expect(defects).toHaveLength(2);
    for (const defect of defects) {
      for (const predio of defect.predios) {
        expect(hasRule(predio, 'GEO-007')).toBe(true);
      }
      expect(defect.area_aproximada_m2).toBeGreaterThan(1);
    }
    expect(result.topology.overlaps).toBe(2);
  });

  it('detecta las dos autointersecciones y mantiene su superficie evaluable', () => {
    const defects = expected.errores_intencionales.autointersecciones;
    expect(defects).toHaveLength(2);
    for (const defect of defects) {
      expect(hasRule(defect.predio, 'GEO-004')).toBe(true);
      const surface = result.surfaces.find((item) => item.predioId === defect.predio);
      expect(surface.evaluada).toBe(true);
      expect(hasRule(defect.predio, 'SUP-001')).toBe(false);
    }
  });

  it('detecta las tres diferencias de superficie superiores al 5 %', () => {
    const defects = expected.errores_intencionales.diferencias_superficie;
    expect(defects).toHaveLength(3);
    for (const defect of defects) {
      expect(hasRule(defect.predio, 'SUP-001')).toBe(true);
    }
    expect(result.issues.filter((issue) => issue.codigoRegla === 'SUP-001')).toHaveLength(3);
  });

  it('detecta los dos valores fuera de dominio', () => {
    const defects = expected.errores_intencionales.valores_fuera_de_dominio;
    expect(defects).toHaveLength(2);
    for (const defect of defects) {
      expect(hasRule(defect.predio, 'ALF-007')).toBe(true);
    }
  });

  it('detecta las dos inconsistencias de área construida como advertencias', () => {
    const defects = expected.errores_intencionales.inconsistencias_area_construida;
    expect(defects).toHaveLength(2);
    for (const defect of defects) {
      const issue = result.issues.find(
        (item) => item.predioId === defect.predio && item.codigoRegla === 'ALF-008'
      );
      expect(issue).toBeDefined();
      expect(issue.severidad).toBe('advertencia');
    }
  });

  it('el par de predios que comparte borde no genera superposición', () => {
    const pair = expected.casos_correctos.par_comparte_borde;
    const [a, b] = pair.predios.map(featureById);
    expect(classifyPair(a, b).tipo).toBe('borde');
    for (const predio of pair.predios) {
      expect(hasRule(predio, 'GEO-007')).toBe(false);
    }
    expect(result.topology.contacts.borde).toBeGreaterThan(0);
  });

  it('los predios declarados correctos no tienen incidencias', () => {
    const correct = expected.casos_correctos.predios_sin_errores_esperados;
    expect(correct.length).toBeGreaterThan(0);
    for (const predio of correct) {
      const issues = result.issues.filter((issue) => issue.predioId === predio);
      expect(issues, `El predio ${predio} no debería tener incidencias`).toHaveLength(0);
    }
    expect(result.indicators.prediosSinIncidencias).toBe(correct.length);
  });

  it('no introduce anillos abiertos en el archivo principal', () => {
    expect(result.issues.some((issue) => issue.codigoRegla === 'GEO-003')).toBe(false);
    expect(result.issues.some((issue) => issue.codigoRegla === 'GEO-009')).toBe(false);
  });

  it('produce un reporte coherente sin doble conteo de predios', () => {
    const errorEntities = new Set(
      result.issues
        .filter((issue) => issue.severidad === 'error')
        .map((issue) => issue.predioId)
    );
    const warningEntities = new Set(
      result.issues
        .filter((issue) => issue.severidad === 'advertencia')
        .map((issue) => issue.predioId)
    );
    expect(result.indicators.prediosConErrores).toBe(errorEntities.size);
    expect(result.indicators.prediosConAdvertencias).toBe(warningEntities.size);
    expect(result.indicators.totalPredios).toBe(72);
    expect(result.indicators.totalIncidencias).toBe(result.issues.length);
  });
});
