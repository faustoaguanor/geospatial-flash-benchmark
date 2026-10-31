import { describe, expect, it } from 'vitest';
import {
  buildSummaryObject,
  issuesToCSV,
  issuesToJSON,
  summaryToJSON
} from '../src/core/export.js';
import { evaluate, evaluateWith, makeFeature } from './helpers.js';

const sampleIssue = {
  id: 'INC-0001',
  codigoRegla: 'ALF-003',
  predioId: 'QT-X-001',
  entidadId: 'F-1',
  dimension: 'completitud',
  severidad: 'error',
  descripcion: 'Falta, el campo "clave"',
  valorObservado: '=1+1',
  criterio: 'No debe estar vacío',
  sector: 'Centro Histórico'
};

describe('Exportación', () => {
  it('19. exporta incidencias a CSV con encabezado y escape correcto', () => {
    const csv = issuesToCSV([sampleIssue]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe(
      'id_incidencia,codigo_regla,predio_id,dimension,severidad,descripcion,valor_observado,criterio,sector'
    );
    expect(lines).toHaveLength(2);
    expect(csv).toContain('"Falta, el campo ""clave"""');
    expect(csv).toContain("'=1+1");
    expect(csv).not.toContain(',=1+1');
  });

  it('exporta únicamente el encabezado cuando no hay incidencias', () => {
    const csv = issuesToCSV([]);
    expect(csv).toBe(
      'id_incidencia,codigo_regla,predio_id,dimension,severidad,descripcion,valor_observado,criterio,sector'
    );
  });

  it('exporta incidencias a JSON parseable', () => {
    const text = issuesToJSON([sampleIssue]);
    const parsed = JSON.parse(text);
    expect(parsed.total).toBe(1);
    expect(parsed.incidencias[0].codigoRegla).toBe('ALF-003');
    expect(parsed.incidencias[0].valorObservado).toBe('=1+1');
  });

  it('genera un resumen de evaluación con tolerancia y dimensiones', () => {
    const result = evaluate(
      makeFeature('QT-X-002', { props: { clave_catastral: null } })
    );
    const summary = buildSummaryObject(result, 'prueba.geojson');
    expect(summary.conjunto).toBe('prueba.geojson');
    expect(summary.indicadores.totalPredios).toBe(1);
    expect(summary.superficies.toleranciaPct).toBe(5);
    expect(summary.reglasNoEvaluadas.length).toBeGreaterThan(0);
    expect(summary.porDimension.completitud).toBeGreaterThan(0);
    expect(summary.aviso).toMatch(/sintéticos/);

    const json = JSON.parse(summaryToJSON(result, 'prueba.geojson'));
    expect(json.indicadores.totalIncidencias).toBe(result.issues.length);
  });

  it('incluye la tolerancia configurada en el resumen', () => {
    const result = evaluateWith(
      [makeFeature('QT-X-003', { props: { area_terreno_m2: 450 } })],
      { tolerancePct: 12 }
    );
    const summary = buildSummaryObject(result);
    expect(summary.superficies.toleranciaPct).toBe(12);
  });
});
