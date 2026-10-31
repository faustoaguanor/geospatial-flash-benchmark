/**
 * Calidad alfanumérica (atributos) de predios catastrales.
 * Ejecutable sin DOM ni MapLibre.
 */
import { ATTRIBUTE_SCHEMA } from '../../config/constants.js';
import { makeIncident, featureRef } from '../dataLoader.js';

function isEmptyValue(value) {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

function typeOk(value, expected) {
  if (expected === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (expected === 'integer') return Number.isInteger(value);
  return typeof value === 'string';
}

function typeName(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/**
 * Valida los atributos de un predio contra el esquema.
 * @returns {{ incidents: object[], notEvaluated: object[] }}
 */
export function validateAttributes(feature, index) {
  const incidents = [];
  const notEvaluated = [];
  const ref = featureRef(feature, index);
  const props = (feature && typeof feature.properties === 'object' && feature.properties !== null)
    ? feature.properties
    : {};

  if (feature && typeof feature.properties === 'object' && feature.properties !== null) {
    for (const [field, def] of Object.entries(ATTRIBUTE_SCHEMA)) {
      const value = props[field];

      if (isEmptyValue(value)) {
        if (def.required) {
          incidents.push(makeIncident({
            ruleCode: 'ALP-003',
            featureRef: ref,
            description: `El campo obligatorio "${field}" está nulo o vacío.`,
            observedValue: value === undefined ? 'ausente' : String(value),
            criterion: `Campo obligatorio según esquema del experimento: ${field} (${def.type}).`,
          }));
        }
        continue; // sin valor no se evalúan tipo ni dominio
      }

      if (!typeOk(value, def.type)) {
        incidents.push(makeIncident({
          ruleCode: 'ALP-004',
          featureRef: ref,
          description: `El campo "${field}" tiene tipo de dato incorrecto: se esperaba ${def.type}.`,
          observedValue: `${typeName(value)} (${JSON.stringify(String(value).slice(0, 40))})`,
          criterion: `Esquema del experimento: ${field} debe ser ${def.type}.`,
        }));
        continue;
      }

      if (def.domain && !def.domain.includes(value)) {
        incidents.push(makeIncident({
          ruleCode: 'ALP-007',
          featureRef: ref,
          description: `El campo "${field}" tiene un valor fuera del dominio permitido.`,
          observedValue: value,
          criterion: `Dominio permitido: ${def.domain.join(', ')}.`,
        }));
      }

      if (def.pattern && !def.pattern.test(value)) {
        incidents.push(makeIncident({
          ruleCode: 'ALP-009',
          featureRef: ref,
          description: `El campo "${field}" no cumple el formato esperado (${def.pattern}).`,
          observedValue: value,
          criterion: 'Formato AAAA-MM-DD (solo se verifica formato, no veracidad temporal).',
        }));
      }

      if (field === 'pisos' && Number.isInteger(value) && value < 1) {
        incidents.push(makeIncident({
          ruleCode: 'ALP-006',
          featureRef: ref,
          description: `El número de pisos es inválido: ${value}.`,
          observedValue: value,
          criterion: 'Número de pisos debe ser un entero mayor o igual a 1.',
        }));
      }

      if (field === 'area_terreno_m2' && value < 0) {
        incidents.push(makeIncident({
          ruleCode: 'ALP-005',
          featureRef: ref,
          description: `La superficie registrada de terreno es negativa: ${value} m².`,
          observedValue: value,
          criterion: 'La superficie de un predio no puede ser negativa.',
        }));
      }
    }
  } else {
    incidents.push(makeIncident({
      ruleCode: 'STR-004',
      featureRef: ref,
      description: 'La feature no tiene un objeto de propiedades válido.',
      observedValue: typeName(feature?.properties),
      criterion: 'Toda feature debe incluir properties como objeto.',
    }));
  }

  // Inconsistencia área construida / pisos (advertencia, requiere valores válidos)
  const at = props.area_terreno_m2;
  const ac = props.area_construida_m2;
  const pisos = props.pisos;
  const numbersOk = typeof at === 'number' && Number.isFinite(at) && at > 0
    && typeof ac === 'number' && Number.isFinite(ac) && ac >= 0
    && Number.isInteger(pisos) && pisos >= 1;

  if (numbersOk) {
    const ratio = ac / (at * pisos);
    if (ratio > 3 || (pisos >= 2 && ratio < 0.2)) {
      incidents.push(makeIncident({
        ruleCode: 'ALP-008',
        featureRef: ref,
        description: `Inconsistencia entre área construida (${ac} m²), terreno (${at} m²) y pisos (${pisos}): ratio ${ratio.toFixed(2)}.`,
        observedValue: ratio,
        criterion: 'Criterio experimental del experimento: ratio = area_construida / (area_terreno * pisos) debe quedar en [0.2, 3].',
      }));
    }
  } else {
    notEvaluated.push({
      rule_code: 'ALP-008',
      feature_ref: ref,
      reason: 'No se pudo evaluar la relación área construida/pisos: faltan valores numéricos válidos.',
    });
  }

  return { incidents, notEvaluated };
}

/**
 * Reglas a nivel de colección: identificadores y claves duplicadas.
 */
export function validateDuplicates(features) {
  const incidents = [];
  const byId = new Map();
  const byClave = new Map();

  features.forEach((f, i) => {
    const ref = featureRef(f, i);
    const props = f?.properties ?? {};
    if (typeof props.id_predio === 'string' && props.id_predio.trim() !== '') {
      if (!byId.has(props.id_predio)) byId.set(props.id_predio, []);
      byId.get(props.id_predio).push(ref);
    }
    if (typeof props.clave_catastral === 'string' && props.clave_catastral.trim() !== '') {
      if (!byClave.has(props.clave_catastral)) byClave.set(props.clave_catastral, []);
      byClave.get(props.clave_catastral).push(ref);
    }
  });

  for (const [key, refs] of byId) {
    if (refs.length > 1) {
      for (const ref of refs) {
        incidents.push(makeIncident({
          ruleCode: 'ALP-001',
          featureRef: ref,
          description: `Identificador "id_predio" duplicado en la colección (${refs.length} ocurrencias): ${refs.join(', ')}.`,
          observedValue: key,
          criterion: 'id_predio debe ser único dentro del dataset.',
        }));
      }
    }
  }

  for (const [key, refs] of byClave) {
    if (refs.length > 1) {
      for (const ref of refs) {
        incidents.push(makeIncident({
          ruleCode: 'ALP-002',
          featureRef: ref,
          description: `Clave catastral duplicada en la colección (${refs.length} ocurrencias): ${refs.join(', ')}.`,
          observedValue: key,
          criterion: 'clave_catastral debe ser única dentro del dataset.',
        }));
      }
    }
  }

  return incidents;
}

/** Detección de geometrías idénticas (igualdad exacta de coordenadas). */
export function validateDuplicateGeometries(features, geometryKeys) {
  const incidents = [];
  const byKey = new Map();
  features.forEach((f, i) => {
    const key = geometryKeys[i];
    if (!key) return;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(featureRef(f, i));
  });
  for (const [key, refs] of byKey) {
    if (refs.length > 1) {
      for (const ref of refs) {
        incidents.push(makeIncident({
          ruleCode: 'GEO-005',
          featureRef: ref,
          description: `Geometría idéntica a la de otras ${refs.length - 1} feature(s): ${refs.join(', ')}.`,
          observedValue: `coordenadas idénticas (${key.length} caracteres)`,
          criterion: 'Dos predios no deben compartir exactamente la misma geometría.',
        }));
      }
    }
  }
  return incidents;
}
