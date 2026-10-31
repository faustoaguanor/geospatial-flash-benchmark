/** Utilidades compartidas por las pruebas (sin registrar suites). */
import { area as turfArea } from '@turf/turf';

const DEFAULT_RING = [
  [-78.5100, -0.2200],
  [-78.5090, -0.2200],
  [-78.5090, -0.2190],
  [-78.5100, -0.2190],
  [-78.5100, -0.2200],
];

/** Área geodésica real del rectángulo por defecto: los tests no deben disparar SUP-001 por accidente. */
export const REAL_AREA_M2 = turfArea({ type: 'Polygon', coordinates: [DEFAULT_RING] });

/** Crea una feature rectangular de prueba en Quito.
 * `overrides.shift` [dlon, dlat] desplaza el rectángulo para evitar
 * superposiciones/geometrías idénticas no deseadas entre fixtures. */
export function makeFeature(overrides = {}, props = {}) {
  const [dlon, dlat] = overrides.shift ?? [0, 0];
  const baseRing = overrides.ring ?? DEFAULT_RING;
  const ring = (dlon === 0 && dlat === 0)
    ? baseRing
    : [...baseRing.map(([lon, lat]) => [lon + dlon, lat + dlat])];
  return {
    type: 'Feature',
    id: overrides.id,
    properties: {
      id_predio: 'PD-TEST-0001',
      clave_catastral: '170000000000001',
      sector: 'Centro Histórico',
      direccion: 'Calle de Prueba 123',
      area_terreno_m2: REAL_AREA_M2,
      area_construida_m2: REAL_AREA_M2 * 0.4,
      pisos: 2,
      uso_suelo: 'residencial',
      estado_predio: 'ocupado',
      fecha_actualizacion: '2025-01-15',
      ...props,
    },
    geometry: overrides.geometry === undefined
      ? { type: 'Polygon', coordinates: [ring] }
      : overrides.geometry,
  };
}

export function codes(incidents, ref = null) {
  return incidents
    .filter((i) => ref === null || i.feature_ref === ref)
    .map((i) => i.rule_code);
}
