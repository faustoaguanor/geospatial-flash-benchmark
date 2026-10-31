import {
  DOMAINS,
  FIELD_LABELS,
  NUMERIC_FIELDS,
  REQUIRED_FIELDS,
  STRING_FIELDS,
  TOLERANCES,
  YEAR_DOMAIN
} from './constants.js';
import { makeIssue } from './issue.js';

function isEmptyValue(value) {
  if (value === null || value === undefined) return true;
  return typeof value === 'string' && value.trim() === '';
}

function describeType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number' && !Number.isFinite(value)) return String(value);
  return typeof value;
}

/**
 * Reglas alfanuméricas. Recibe las entidades admitidas (con properties,
 * predioId, entidadId y sector) y devuelve incidencias sin IDs definitivos.
 */
export function evaluateAttributes(features, options = {}) {
  const isRuleEnabled = options.isRuleEnabled ?? (() => true);
  const issues = [];

  const add = (code, payload) => {
    if (isRuleEnabled(code)) issues.push(makeIssue(code, payload));
  };

  // Duplicados de identificador y clave catastral
  const idGroups = new Map();
  const claveGroups = new Map();

  for (const item of features) {
    const id = item.properties.id;
    if (typeof id === 'string' && id.trim() !== '') {
      const key = id.trim();
      if (!idGroups.has(key)) idGroups.set(key, []);
      idGroups.get(key).push(item);
    }
    const clave = item.properties.clave_catastral;
    if (typeof clave === 'string' && clave.trim() !== '') {
      const key = clave.trim().toUpperCase();
      if (!claveGroups.has(key)) claveGroups.set(key, []);
      claveGroups.get(key).push(item);
    }
  }

  if (isRuleEnabled('ALF-001')) {
    for (const [id, group] of idGroups) {
      if (group.length < 2) continue;
      for (const item of group) {
        issues.push(
          makeIssue('ALF-001', {
            predioId: item.predioId,
            entidadId: item.entidadId,
            sector: item.sector,
            descripcion: `El identificador "${id}" se repite en ${group.length} predios.`,
            valorObservado: id
          })
        );
      }
    }
  }

  if (isRuleEnabled('ALF-002')) {
    for (const [clave, group] of claveGroups) {
      if (group.length < 2) continue;
      for (const item of group) {
        issues.push(
          makeIssue('ALF-002', {
            predioId: item.predioId,
            entidadId: item.entidadId,
            sector: item.sector,
            descripcion: `La clave catastral "${clave}" se repite en ${group.length} predios.`,
            valorObservado: clave
          })
        );
      }
    }
  }

  for (const item of features) {
    const props = item.properties;
    const base = {
      predioId: item.predioId,
      entidadId: item.entidadId,
      sector: item.sector
    };

    // Campos obligatorios
    for (const field of REQUIRED_FIELDS) {
      if (isEmptyValue(props[field])) {
        add('ALF-003', {
          ...base,
          descripcion: `El campo obligatorio "${field}" (${FIELD_LABELS[field] ?? field}) está nulo o vacío.`,
          valorObservado: props[field] === undefined ? 'ausente' : props[field]
        });
      }
    }

    // Tipos de datos
    for (const field of NUMERIC_FIELDS) {
      const value = props[field];
      if (value === null || value === undefined) continue;
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        add('ALF-004', {
          ...base,
          descripcion: `El campo "${field}" debe ser numérico; se recibió ${describeType(value)}.`,
          valorObservado: value
        });
      }
    }
    for (const field of STRING_FIELDS) {
      const value = props[field];
      if (value === null || value === undefined) continue;
      if (typeof value !== 'string') {
        add('ALF-004', {
          ...base,
          descripcion: `El campo "${field}" debe ser textual; se recibió ${describeType(value)}.`,
          valorObservado: value
        });
      }
    }

    // Superficies negativas
    for (const field of ['area_terreno_m2', 'area_construida_m2']) {
      const value = props[field];
      if (typeof value === 'number' && Number.isFinite(value) && value < 0) {
        add('ALF-005', {
          ...base,
          descripcion: `La superficie "${field}" es negativa (${value}).`,
          valorObservado: value
        });
      }
    }

    // Número de pisos
    const pisos = props.numero_pisos;
    if (typeof pisos === 'number' && Number.isFinite(pisos)) {
      if (pisos < 0 || !Number.isInteger(pisos)) {
        add('ALF-006', {
          ...base,
          descripcion: `El número de pisos debe ser un entero no negativo; se recibió ${pisos}.`,
          valorObservado: pisos
        });
      }
    }

    // Dominios
    const uso = props.uso_suelo;
    if (typeof uso === 'string' && !DOMAINS.uso_suelo.includes(uso)) {
      add('ALF-007', {
        ...base,
        descripcion: `El uso de suelo "${uso}" no pertenece al dominio permitido.`,
        valorObservado: uso
      });
    }

    const estado = props.estado;
    if (typeof estado === 'string' && !DOMAINS.estado.includes(estado)) {
      add('ALF-007', {
        ...base,
        descripcion: `El estado "${estado}" no pertenece al dominio permitido.`,
        valorObservado: estado
      });
    }

    const sector = props.sector;
    if (typeof sector === 'string' && !DOMAINS.sector.includes(sector)) {
      add('ALF-007', {
        ...base,
        descripcion: `El sector "${sector}" no pertenece al dominio de sectores de demostración.`,
        valorObservado: sector
      });
    }

    const anio = props.anio_construccion;
    if (
      typeof anio === 'number' &&
      Number.isFinite(anio) &&
      (anio < YEAR_DOMAIN.min || anio > YEAR_DOMAIN.max)
    ) {
      add('ALF-007', {
        ...base,
        descripcion: `El año de construcción ${anio} está fuera del dominio ${YEAR_DOMAIN.min}–${YEAR_DOMAIN.max}.`,
        valorObservado: anio
      });
    }

    // Coherencia área construida / número de pisos
    const terreno = props.area_terreno_m2;
    const construida = props.area_construida_m2;
    if (
      typeof terreno === 'number' &&
      Number.isFinite(terreno) &&
      terreno > 0 &&
      typeof construida === 'number' &&
      Number.isFinite(construida) &&
      construida > 0 &&
      typeof pisos === 'number' &&
      Number.isFinite(pisos) &&
      pisos > 0
    ) {
      const ratio = construida / (terreno * pisos);
      if (ratio > TOLERANCES.builtFloorRatio) {
        add('ALF-008', {
          ...base,
          descripcion: `El área construida (${construida} m²) supera el máximo esperado para ${pisos} piso(s) sobre ${terreno} m² de terreno. Requiere revisión.`,
          valorObservado: `relación=${ratio.toFixed(2)}; máximo=${TOLERANCES.builtFloorRatio}`
        });
      }
    }
  }

  return issues;
}
