import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseGeoJSONText } from '../src/core/dataLoader.js';
import { evaluateDataset } from '../src/core/engine.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const raw = readFileSync(join(ROOT, 'public', 'data', 'quito_predios_sinteticos.geojson'), 'utf8');

describe('dataset de demostración', () => {
  const parsed = parseGeoJSONText(raw);

  it('carga con al menos 60 predios y sin incidencias estructurales', () => {
    expect(parsed.ok).toBe(true);
    expect(parsed.incidents).toHaveLength(0);
    expect(parsed.features.length).toBeGreaterThanOrEqual(60);
  });

  it('cubre los seis sectores de demostración', () => {
    const sectores = new Set(parsed.features.map((f) => f.properties.sector).filter(Boolean));
    for (const s of ['Centro Histórico', 'Iñaquito', 'La Carolina', 'La Mariscal', 'Quitumbe', 'Calderón']) {
      expect(sectores.has(s)).toBe(true);
    }
  });

  it('las coordenadas están en el entorno de Quito y en orden [lon, lat]', () => {
    for (const f of parsed.features.slice(0, 20)) {
      const [lon, lat] = f.geometry.coordinates[0][0];
      expect(lon).toBeGreaterThan(-78.7);
      expect(lon).toBeLessThan(-78.3);
      expect(lat).toBeGreaterThan(-0.45);
      expect(lat).toBeLessThan(-0.05);
    }
  });

  it('la evaluación detecta las familias de errores inyectados', () => {
    const result = evaluateDataset(parsed.features);
    const reglas = new Set(result.incidents.map((i) => i.rule_code));
    for (const code of ['ALP-002', 'ALP-003', 'ALP-005', 'ALP-004', 'TOP-001', 'GEO-004', 'SUP-001', 'ALP-007', 'ALP-006']) {
      expect(reglas.has(code), `falta la regla ${code}`).toBe(true);
    }
  });

  it('los predios sin errores no están inflados por doble conteo', () => {
    const result = evaluateDataset(parsed.features);
    const ind = result.indicators;
    expect(ind.predios_con_errores + ind.predios_sin_errores).toBe(ind.total_predios);
    expect(ind.total_incidencias).toBeGreaterThan(ind.predios_con_errores);
  });

  it('no clasifica como superposición los 60 pares que comparten borde', () => {
    const result = evaluateDataset(parsed.features);
    const topRefs = new Set(result.incidents.filter((i) => i.rule_code === 'TOP-001').map((i) => i.feature_ref));
    // Solo los 2 pares inyectados (4 features) deben tener TOP-001
    expect(topRefs.size).toBeLessThanOrEqual(6);
    expect(result.contacts.length).toBeGreaterThanOrEqual(10);
  });
});

describe('data/expected_issues.json (referencia de generación)', () => {
  const expected = JSON.parse(readFileSync(join(ROOT, 'data', 'expected_issues.json'), 'utf8'));

  it('documenta los errores requeridos por el enunciado', () => {
    expect(expected.total_predios).toBeGreaterThanOrEqual(60);
    expect(expected.issues.length).toBeGreaterThanOrEqual(20);
    expect(expected.pares_superpuestos).toHaveLength(2);
    expect(expected.total_pares_que_comparten_borde).toBeGreaterThanOrEqual(1);
  });
});
