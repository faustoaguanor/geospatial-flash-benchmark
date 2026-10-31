/**
 * Calidad alfanumérica: duplicados, campos obligatorios, tipos de dato,
 * superficies negativas, número de pisos, dominios y consistencia área/pisos.
 */
import { createIncident } from './incidentModel.js';
import {
  REQUIRED_FIELDS,
  FIELD_TYPES,
  NUMERIC_LIMITS
} from './config.js';
import { FIELD_DOMAINS, checkFieldType, isEmptyValue } from './dataModel.js';

/**
 * Evalúa la calidad alfanumérica de la colección completa.
 * Devuelve incidencias (errores y advertencias).
 */
export function evaluateAttributes(features) {
  const incidents = [];
  incidents.push(...findDuplicates(features, 'id_predio', 'ALFA_ID_DUPLICADO', 'identificador de predio'));
  incidents.push(...findDuplicates(features, 'clave_catastral', 'ALFA_CLAVE_DUPLICADA', 'clave catastral'));

  for (const feature of features) {
    incidents.push(...evaluateFeatureAttributes(feature));
  }
  return incidents;
}

/** Reglas por predio individual. */
export function evaluateFeatureAttributes(feature) {
  const incidents = [];
  const props = feature.properties || {};
  const predioId = props.id_predio ?? feature.id ?? 'sin-id';

  // Campos obligatorios nulos o vacíos
  for (const field of REQUIRED_FIELDS) {
    const value = props[field];
    if (isEmptyValue(value)) {
      incidents.push(createIncident({
        ruleCode: 'ALFA_CAMPO_OBLIGATORIO_NULO',
        predioId,
        dimension: 'completitud',
        severity: 'error',
        description: `Campo obligatorio "${field}" nulo o vacío.`,
        observedValue: `${field} = ${JSON.stringify(value ?? null)}`,
        criterion: `Campos obligatorios: ${REQUIRED_FIELDS.join(', ')}.`
      }));
    }
  }

  // Tipos de dato (solo si el valor está presente)
  for (const [field, type] of Object.entries(FIELD_TYPES)) {
    const value = props[field];
    if (value === null || value === undefined || value === '') continue;
    if (!checkFieldType(value, type)) {
      incidents.push(createIncident({
        ruleCode: 'ALFA_TIPO_DATO_INCORRECTO',
        predioId,
        dimension: 'consistencia_logica',
        severity: 'error',
        description: `Tipo de dato incorrecto en "${field}" (se esperaba ${type}).`,
        observedValue: `${field} = ${JSON.stringify(value)} (${typeof value})`,
        criterion: `Diccionario de atributos: ${field} debe ser de tipo ${type}.`
      }));
    }
  }

  // Superficies negativas
  for (const field of ['area_terreno_m2', 'area_construida_m2']) {
    const value = props[field];
    if (typeof value === 'number' && Number.isFinite(value) && value < 0) {
      incidents.push(createIncident({
        ruleCode: 'ALFA_SUPERFICIE_NEGATIVA',
        predioId,
        dimension: 'consistencia_logica',
        severity: 'error',
        description: `Superficie negativa en "${field}".`,
        observedValue: `${field} = ${value} m²`,
        criterion: 'Las superficies catastrales no pueden ser negativas.'
      }));
    }
  }

  // Número de pisos
  const pisos = props.num_pisos;
  if (typeof pisos === 'number' && Number.isFinite(pisos)) {
    const { min, max } = NUMERIC_LIMITS.num_pisos;
    if (!Number.isInteger(pisos) || pisos < min || pisos > max) {
      incidents.push(createIncident({
        ruleCode: 'ALFA_NUM_PISOS_INVALIDO',
        predioId,
        dimension: 'consistencia_logica',
        severity: 'error',
        description: 'Número de pisos inválido (negativo, no entero o fuera de rango).',
        observedValue: `num_pisos = ${pisos}`,
        criterion: `num_pisos debe ser un entero entre ${min} y ${max}.`
      }));
    }
  }

  // Dominios configurados
  for (const [field, domain] of Object.entries(FIELD_DOMAINS)) {
    const value = props[field];
    if (value === null || value === undefined || value === '') continue;
    if (typeof value !== 'string' || !domain.includes(value)) {
      incidents.push(createIncident({
        ruleCode: 'ALFA_VALOR_FUERA_DOMINIO',
        predioId,
        dimension: 'consistencia_logica',
        severity: 'error',
        description: `Valor fuera del dominio configurado en "${field}".`,
        observedValue: `${field} = ${JSON.stringify(value ?? null)}`,
        criterion: `Dominios permitidos para ${field}: ${domain.join(', ')}.`
      }));
    }
  }

  // Consistencia área construida vs número de pisos (advertencia)
  const terreno = props.area_terreno_m2;
  const construida = props.area_construida_m2;
  if (
    typeof terreno === 'number' && Number.isFinite(terreno) && terreno > 0 &&
    typeof construida === 'number' && Number.isFinite(construida) &&
    typeof pisos === 'number' && Number.isInteger(pisos) && pisos >= 0
  ) {
    const maxPlausible = terreno * pisos * 1.0 + 1e-6;
    if (construida > maxPlausible || (construida > 0 && pisos === 0)) {
      incidents.push(createIncident({
        ruleCode: 'ALFA_INCONSISTENCIA_AREA_PISOS',
        predioId,
        dimension: 'consistencia_logica',
        severity: 'warning',
        description: 'Área construida inconsistente con el número de pisos (requiere revisión).',
        observedValue: `area_construida_m2 = ${construida}; area_terreno_m2 = ${terreno}; num_pisos = ${pisos}`,
        criterion: 'Advertencia: area_construida_m2 no debería superar area_terreno_m2 × num_pisos (huella completa por piso), ni ser positiva con 0 pisos. Revisar fuente.'
      }));
    }
  }

  return incidents;
}

/** Detecta valores duplicados de un campo; reporta cada par duplicado una vez. */
export function findDuplicates(features, field, ruleCode, label) {
  const incidents = [];
  const seen = new Map();
  for (const feature of features) {
    const value = feature.properties?.[field];
    if (value === null || value === undefined || value === '') continue;
    if (!seen.has(value)) {
      seen.set(value, feature);
      continue;
    }
    const first = seen.get(value);
    const idA = first.properties?.id_predio ?? 'sin-id';
    const idB = feature.properties?.id_predio ?? 'sin-id';
    incidents.push(createIncident({
      ruleCode,
      predioId: idB,
      dimension: 'consistencia_logica',
      severity: 'error',
      description: `${label} duplicado: "${value}".`,
      observedValue: `${field} = ${JSON.stringify(value)}`,
      criterion: `Cada ${field} debe ser único en la colección.`,
      relatedPredioIds: [idA, idB]
    }));
  }
  return incidents;
}
