/**
 * Validación estructural del GeoJSON (RFC 7946):
 * JSON malformado, FeatureCollection inválido, colección vacía,
 * features con estructura incorrecta, geometrías nulas y tipos no soportados.
 * No accede al DOM: puede ejecutarse en Node (Vitest).
 */
import { createIncident } from './incidentModel.js';

const SUPPORTED_GEOMETRY_TYPES = ['Polygon', 'MultiPolygon'];

/**
 * Analiza la estructura de un objeto GeoJSON ya parseado (o el error de parseo).
 * Devuelve:
 *  - collectionIncidents: incidencias de nivel colección.
 *  - featureIncidents: array de { index, incidents[] } por feature.
 *  - features: features estructuralmente utilizables (Polygon/MultiPolygon).
 *  - fatal: true si la colección no puede evaluarse en absoluto.
 */
export function validateStructure(geojson) {
  const collectionIncidents = [];
  const featureIncidents = [];

  if (geojson === null || typeof geojson !== 'object' || Array.isArray(geojson)) {
    collectionIncidents.push(createIncident({
      ruleCode: 'ESTRUCT_FC_INVALIDO',
      dimension: 'completitud',
      severity: 'error',
      description: 'El objeto cargado no es un FeatureCollection GeoJSON válido (se esperaba un objeto con "type": "FeatureCollection").',
      observedValue: describeValue(geojson),
      criterion: 'RFC 7946: objeto raíz de tipo FeatureCollection con arreglo "features".'
    }));
    return { collectionIncidents, featureIncidents, features: [], fatal: true };
  }

  if (geojson.type !== 'FeatureCollection') {
    collectionIncidents.push(createIncident({
      ruleCode: 'ESTRUCT_FC_INVALIDO',
      dimension: 'completitud',
      severity: 'error',
      description: 'El objeto cargado no es un FeatureCollection GeoJSON válido (se esperaba un objeto con "type": "FeatureCollection").',
      observedValue: `type = ${JSON.stringify(geojson.type ?? null)}`,
      criterion: 'RFC 7946: objeto raíz de tipo FeatureCollection con arreglo "features".'
    }));
    return { collectionIncidents, featureIncidents, features: [], fatal: true };
  }

  if (!Array.isArray(geojson.features)) {
    collectionIncidents.push(createIncident({
      ruleCode: 'ESTRUCT_FC_INVALIDO',
      dimension: 'completitud',
      severity: 'error',
      description: 'El FeatureCollection no tiene un arreglo "features".',
      observedValue: `features = ${describeValue(geojson.features)}`,
      criterion: 'RFC 7946: "features" debe ser un arreglo.'
    }));
    return { collectionIncidents, featureIncidents, features: [], fatal: true };
  }

  if (geojson.features.length === 0) {
    collectionIncidents.push(createIncident({
      ruleCode: 'ESTRUCT_COLECCION_VACIA',
      dimension: 'completitud',
      severity: 'warning',
      description: 'El FeatureCollection no contiene ningún feature.',
      observedValue: 'features.length = 0',
      criterion: 'La colección debe contener al menos un predio para poder evaluar.'
    }));
    return { collectionIncidents, featureIncidents, features: [], fatal: false };
  }

  const features = [];
  geojson.features.forEach((feature, index) => {
    const incidents = [];
    const usable = isObject(feature) && feature.type === 'Feature' && isObject(feature.properties || {});

    if (!isObject(feature) || feature.type !== 'Feature') {
      incidents.push(createIncident({
        ruleCode: 'ESTRUCT_FEATURE_INVALIDO',
        predioId: getFeatureId(feature, index),
        dimension: 'consistencia_logica',
        severity: 'error',
        description: 'Estructura de feature incorrecta (se esperaba un objeto con "type": "Feature" y "properties").',
        observedValue: describeValue(feature),
        criterion: 'RFC 7946: Feature con "type", "geometry" y "properties".'
      }));
      featureIncidents.push({ index, incidents });
      return;
    }

    const geometry = feature.geometry;
    if (geometry === null || geometry === undefined) {
      incidents.push(createIncident({
        ruleCode: 'ESTRUCT_GEOMETRIA_NULA',
        predioId: getFeatureId(feature, index),
        dimension: 'completitud',
        severity: 'error',
        description: 'El feature tiene geometría nula: no puede evaluarse geométrica ni topológicamente.',
        observedValue: 'geometry = null',
        criterion: 'RFC 7946 permite geometry null, pero la evaluación predial requiere Polygon/MultiPolygon.'
      }));
    } else if (!isObject(geometry) || !SUPPORTED_GEOMETRY_TYPES.includes(geometry.type)) {
      incidents.push(createIncident({
        ruleCode: 'ESTRUCT_GEOMETRIA_NO_SOPORTADA',
        predioId: getFeatureId(feature, index),
        dimension: 'consistencia_logica',
        severity: 'error',
        description: 'Tipo de geometría no admitido para evaluación predial.',
        observedValue: `geometry.type = ${isObject(geometry) ? geometry.type : describeValue(geometry)}`,
        criterion: 'Geometrías soportadas: Polygon, MultiPolygon.'
      }));
    } else if (!usable) {
      // geometría soportada pero sin properties utilizables
      incidents.push(createIncident({
        ruleCode: 'ESTRUCT_FEATURE_INVALIDO',
        predioId: getFeatureId(feature, index),
        dimension: 'consistencia_logica',
        severity: 'error',
        description: 'El feature no tiene un objeto "properties" utilizable.',
        observedValue: `properties = ${describeValue(feature.properties)}`,
        criterion: 'RFC 7946: "properties" debe ser un objeto (o null, pero la evaluación alfanumérica requiere objeto).'
      }));
    }

    featureIncidents.push({ index, incidents });
    if (incidents.length === 0) {
      features.push(feature);
    }
  });

  return { collectionIncidents, featureIncidents, features, fatal: false };
}

/** Parsea un texto GeoJSON y devuelve incidencias si el JSON es malformado. */
export function parseGeoJsonText(text) {
  try {
    const data = JSON.parse(text);
    return { data, incidents: [] };
  } catch (err) {
    return {
      data: null,
      incidents: [createIncident({
        ruleCode: 'ESTRUCT_JSON_MALFORMADO',
        dimension: 'consistencia_logica',
        severity: 'error',
        description: 'El texto cargado no es un JSON válido.',
        observedValue: String(err.message),
        criterion: 'El archivo debe ser JSON conforme a RFC 8259 / RFC 7946.'
      })]
    };
  }
}

function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function getFeatureId(feature, index) {
  const props = feature && feature.properties;
  return (props && (props.id_predio ?? props.clave_catastral)) || `feature[${index}]`;
}

function describeValue(v) {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (Array.isArray(v)) return `array(${v.length})`;
  return `${typeof v}`;
}
