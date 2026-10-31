import { area as turfArea, feature as turfFeature } from '@turf/turf';
import { evaluateCollection } from '../src/core/engine.js';

export function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function rectGeometry(lon = -78.5, lat = -0.22, width = 0.0002, height = 0.0002) {
  return {
    type: 'Polygon',
    coordinates: [
      [
        [lon, lat],
        [lon + width, lat],
        [lon + width, lat + height],
        [lon, lat + height],
        [lon, lat]
      ]
    ]
  };
}

export function polygonArea(geometry) {
  return turfArea(turfFeature(geometry));
}

/**
 * Crea una Feature de prueba con atributos válidos.
 * Las coordenadas por defecto son de Quito y el área registrada coincide
 * con el área geométrica, de modo que no aparezcan incidencias no buscadas.
 */
export function makeFeature(id, options = {}) {
  const {
    lon = -78.5,
    lat = -0.22,
    width = 0.0002,
    height = 0.0002,
    geometry,
    omitGeometry = false,
    props = {}
  } = options;

  const finalGeometry = omitGeometry
    ? undefined
    : (geometry ?? rectGeometry(lon, lat, width, height));

  const geometryArea =
    finalGeometry?.type === 'Polygon' || finalGeometry?.type === 'MultiPolygon'
      ? polygonArea(finalGeometry)
      : 500;
  const base = {
    id,
    clave_catastral: `DEMO-${id}`,
    sector: 'Centro Histórico',
    manzana: 'M01',
    lote: 'L01',
    direccion_ficticia: `Calle Demo, ${id}`,
    uso_suelo: 'RESIDENCIAL',
    estado: 'ACTIVO',
    area_terreno_m2: round(Number.isFinite(geometryArea) ? geometryArea : 500),
    area_construida_m2: round((Number.isFinite(geometryArea) ? geometryArea : 500) * 0.6),
    numero_pisos: 2,
    anio_construccion: 2000,
    avaluo_ficticio_usd: 120000,
    fuente: 'SINTETICO'
  };

  const feature = {
    type: 'Feature',
    properties: { ...base, ...props },
    geometry: finalGeometry
  };
  if (finalGeometry === undefined) delete feature.geometry;
  return feature;
}

export function featureCollection(...features) {
  return { type: 'FeatureCollection', features };
}

export function evaluate(...features) {
  return evaluateCollection(featureCollection(...features));
}

export function evaluateWith(features, options = {}) {
  return evaluateCollection(featureCollection(...features), options);
}

export function codes(result) {
  return result.issues.map((issue) => issue.codigoRegla);
}

export function issuesOf(result, code) {
  return result.issues.filter((issue) => issue.codigoRegla === code);
}

/** Rectángulo cruzado, autointersectante y con área positiva. */
export function crossedGeometry(lon = -78.5, lat = -0.22, width = 0.0002, height = 0.0002) {
  return {
    type: 'Polygon',
    coordinates: [
      [
        [lon, lat],
        [lon + 0.6 * width, lat + 0.7 * height],
        [lon, lat + 0.7 * height],
        [lon + width, lat],
        [lon, lat]
      ]
    ]
  };
}
