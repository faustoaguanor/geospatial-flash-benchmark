/**
 * Carga y saneo de archivos GeoJSON.
 * Este módulo NO depende de DOM ni de MapLibre: es ejecutable en Node/Vitest.
 */
import { RULES } from '../config/constants.js';

let incidentSeq = 0;
export function nextIncidentId() {
  incidentSeq += 1;
  return `INC-${String(incidentSeq).padStart(5, '0')}`;
}
export function resetIncidentSeq() {
  incidentSeq = 0;
}

export function makeIncident({ ruleCode, featureRef, dimension, severity, description, observedValue, criterion }) {
  const rule = RULES[ruleCode];
  if (!rule) throw new Error(`Código de regla desconocido: ${ruleCode}`);
  return {
    id: nextIncidentId(),
    rule_code: ruleCode,
    feature_ref: featureRef,
    dimension: dimension ?? rule.dimension,
    severity: severity ?? rule.severity,
    description,
    observed_value: observedValue === undefined ? null : observedValue,
    criterion,
  };
}

/**
 * Parsea texto GeoJSON validando la estructura del dataset.
 * No lanza excepciones por entrada inválida: devuelve incidents estructurales.
 *
 * @returns {{ ok: boolean, features: object[], incidents: object[] }}
 */
export function parseGeoJSONText(text) {
  resetIncidentSeq();
  const incidents = [];
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    incidents.push(makeIncident({
      ruleCode: 'STR-001',
      featureRef: null,
      description: 'El archivo no es JSON válido.',
      observedValue: String(err.message).slice(0, 200),
      criterion: 'Todo archivo GeoJSON debe ser un documento JSON parseable.',
    }));
    return { ok: false, features: [], incidents };
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    incidents.push(makeIncident({
      ruleCode: 'STR-002',
      featureRef: null,
      description: 'La raíz del documento no es un objeto GeoJSON.',
      observedValue: Array.isArray(parsed) ? 'array' : typeof parsed,
      criterion: 'RFC 7946: la raíz debe ser un objeto GeoJSON (FeatureCollection para este análisis).',
    }));
    return { ok: false, features: [], incidents };
  }

  if (parsed.type !== 'FeatureCollection' || !Array.isArray(parsed.features)) {
    incidents.push(makeIncident({
      ruleCode: 'STR-002',
      featureRef: null,
      description: 'El objeto no es una FeatureCollection válida (falta type=FeatureCollection o features[]).',
      observedValue: `type=${JSON.stringify(parsed.type)}`,
      criterion: 'Se admite únicamente FeatureCollection con arreglo features.',
    }));
    return { ok: false, features: [], incidents };
  }

  if (parsed.features.length === 0) {
    incidents.push(makeIncident({
      ruleCode: 'STR-003',
      featureRef: null,
      description: 'La FeatureCollection está vacía: no hay predios que evaluar.',
      observedValue: 0,
      criterion: 'La colección debe contener al menos una feature.',
    }));
    return { ok: false, features: [], incidents };
  }

  return { ok: true, features: parsed.features, incidents };
}

/** Tamaño máximo razonable para carga en navegador (documentado como límite de rendimiento). */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

/** Identificador usable de una feature: id_predio, id, o índice. */
export function featureRef(feature, index) {
  const props = feature && typeof feature === 'object' ? feature.properties : null;
  if (props && typeof props.id_predio === 'string' && props.id_predio.trim()) return props.id_predio;
  if (feature && typeof feature.id === 'string' && feature.id.trim()) return feature.id;
  return `#${index}`;
}
