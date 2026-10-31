import { isPlainObject, getProperties, makeEntityId, resolvePredioId } from './geojson.js';
import { inspectGeometry } from './geometry.js';
import { makeIssue } from './issue.js';

/**
 * Valida la estructura general de una FeatureCollection y devuelve las
 * entidades admitidas para evaluación predial. No lanza excepciones.
 */
export function validateStructure(data, options = {}) {
  const isRuleEnabled = options.isRuleEnabled ?? (() => true);
  const issues = [];

  if (!isPlainObject(data)) {
    issues.push(
      makeIssue('STR-002', {
        descripcion: 'La raíz del documento no es un objeto GeoJSON.',
        valorObservado: data === null ? 'null' : typeof data
      })
    );
    return { features: [], totalFeatures: 0, skipped: 0, issues };
  }

  if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
    issues.push(
      makeIssue('STR-002', {
        descripcion: 'La raíz no es una FeatureCollection con un arreglo features.',
        valorObservado: `type=${String(data.type)}`
      })
    );
    return { features: [], totalFeatures: 0, skipped: 0, issues };
  }

  const totalFeatures = data.features.length;
  if (totalFeatures === 0) {
    issues.push(
      makeIssue('STR-003', {
        descripcion: 'La FeatureCollection está vacía: no hay entidades para evaluar.',
        valorObservado: 0
      })
    );
    return { features: [], totalFeatures: 0, skipped: 0, issues };
  }

  const admitted = [];

  data.features.forEach((feature, index) => {
    const entidadId = makeEntityId(index);
    const predioId = resolvePredioId(feature, index);
    const base = { predioId, entidadId };

    if (!isPlainObject(feature) || feature.type !== 'Feature') {
      issues.push(
        makeIssue('STR-004', {
          ...base,
          descripcion: 'La entidad no es un objeto Feature válido.',
          valorObservado: isPlainObject(feature) ? `type=${String(feature.type)}` : typeof feature
        })
      );
      return;
    }

    const rawProperties = feature.properties;
    if (rawProperties !== undefined && rawProperties !== null && !isPlainObject(rawProperties)) {
      issues.push(
        makeIssue('STR-004', {
          ...base,
          descripcion: 'El campo properties no es un objeto ni null.',
          valorObservado: Array.isArray(rawProperties) ? 'array' : typeof rawProperties
        })
      );
      return;
    }

    const properties = getProperties(feature);
    const sector = typeof properties.sector === 'string' ? properties.sector : null;
    const geometry = feature.geometry;

    if (geometry === undefined || geometry === null) {
      issues.push(
        makeIssue('STR-005', {
          ...base,
          sector,
          descripcion: 'La entidad no tiene geometría (geometry es nula o ausente).',
          valorObservado: 'null'
        })
      );
      return;
    }

    if (
      !isPlainObject(geometry) ||
      (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon')
    ) {
      issues.push(
        makeIssue('STR-006', {
          ...base,
          sector,
          descripcion: 'La geometría no es Polygon ni MultiPolygon; no se evalúa como predio.',
          valorObservado: isPlainObject(geometry) ? String(geometry.type) : typeof geometry
        })
      );
      return;
    }

    const inspection = inspectGeometry(geometry);
    for (const item of inspection.issues) {
      if (!isRuleEnabled(item.code)) continue;
      issues.push(
        makeIssue(item.code, {
          ...base,
          sector,
          descripcion: item.descripcion,
          valorObservado: item.valorObservado ?? null
        })
      );
    }

    admitted.push({
      index,
      feature,
      properties,
      geometry,
      predioId,
      entidadId,
      sector,
      geometryEmpty: inspection.empty,
      inspection
    });
  });

  return {
    features: admitted,
    totalFeatures,
    skipped: totalFeatures - admitted.length,
    issues
  };
}
