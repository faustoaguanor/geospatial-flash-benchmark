/** Pruebas del conjunto de datos sintéticos generado y su reproducibilidad. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { runQualityAnalysis } from '../src/modules/qualityEngine.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_PATH = join(ROOT, 'public', 'data', 'quito_predios_sinteticos.geojson');
const EXPECTED_PATH = join(ROOT, 'data', 'expected_issues.json');

const geojson = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
const expected = JSON.parse(readFileSync(EXPECTED_PATH, 'utf8'));

describe('Conjunto de datos sintéticos', () => {
  it('es un FeatureCollection con al menos 60 predios', () => {
    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features.length).toBeGreaterThanOrEqual(60);
  });

  it('cubre los 6 sectores de demostración', () => {
    const sectores = new Set(geojson.features.map((f) => f.properties.sector));
    for (const s of ['Centro Histórico', 'Iñaquito', 'La Carolina', 'La Mariscal', 'Quitumbe', 'Calderón']) {
      expect(sectores.has(s)).toBe(true);
    }
  });

  it('los identificadores son inequívocamente ficticios (prefijo SIM)', () => {
    for (const f of geojson.features) {
      expect(f.properties.id_predio).toMatch(/^SIM-/);
      expect(f.properties.clave_catastral).toMatch(/^SIM-/);
    }
  });

  it('el motor reproduce las incidencias esperadas por regla', () => {
    const res = runQualityAnalysis(geojson);
    expect(res.ok).toBe(true);
    const detected = {};
    for (const inc of res.incidents) detected[inc.codigo_regla] = (detected[inc.codigo_regla] || 0) + 1;
    for (const exp of expected.incidencias_esperadas) {
      expect(detected[exp.codigo_regla] || 0).toBeGreaterThanOrEqual(1);
    }
    // las únicas incidencias adicionales son las coexistencias documentadas
    // (SUP_FUERA_TOLERANCIA de los predios autointersecados, ver notas del JSON)
    expect(detected.SUP_FUERA_TOLERANCIA).toBe(5); // 3 intencionales + 2 coexistencias
  });

  it('incluye el par que comparte borde sin superponerse (topológicamente válido)', () => {
    const res = runQualityAnalysis(geojson);
    expect(res.incidents.some((i) => i.codigo_regla === 'TOPO_CONTACTO_BORDE')).toBe(true);
    expect(res.incidents.some((i) => i.codigo_regla === 'TOPO_CONTACTO_VERTICE')).toBe(false);
  });
});

describe('Reproducibilidad de la generación', () => {
  it('ejecutar el generador dos veces produce exactamente el mismo archivo', () => {
    const hash = (buf) => createHash('sha256').update(buf).digest('hex');
    const before = hash(readFileSync(DATA_PATH));
    execFileSync(process.execPath, [join(ROOT, 'scripts', 'generate-predios.mjs')], { cwd: ROOT });
    const after = hash(readFileSync(DATA_PATH));
    expect(after).toBe(before);
  });

  it('declara la semilla fija en los metadatos', () => {
    expect(geojson.metadata.semilla).toBeTypeOf('number');
    expect(geojson.metadata.semilla).toBe(expected.meta.semilla);
  });
});
