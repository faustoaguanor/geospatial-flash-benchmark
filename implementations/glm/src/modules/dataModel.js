/**
 * Modelo de datos del predio sintético y validaciones alfanuméricas base.
 * Diccionario de atributos documentado en el README.
 */
import {
  USO_SUELO_DOMAIN,
  ESTADO_CONSERVACION_DOMAIN
} from './config.js';

export const FIELD_DOMAINS = {
  sector: [
    'Centro Histórico', 'Iñaquito', 'La Carolina', 'La Mariscal', 'Quitumbe', 'Calderón'
  ],
  uso_suelo: USO_SUELO_DOMAIN,
  estado_conservacion: ESTADO_CONSERVACION_DOMAIN
};

/**
 * Verifica el tipo declarado de un valor.
 * number: número finito. integer: entero finito. string: cadena no vacía.
 */
export function checkFieldType(value, type) {
  switch (type) {
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value) && Number.isFinite(value);
    case 'string':
      return typeof value === 'string';
    default:
      return false;
  }
}

/** true si el valor cuenta como "nulo o vacío" para un campo obligatorio. */
export function isEmptyValue(value) {
  return value === null || value === undefined || value === '';
}
