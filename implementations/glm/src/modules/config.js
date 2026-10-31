/**
 * Configuración global del laboratorio: dominios, campos, sectores y catálogo de reglas.
 * Los umbrales aquí definidos son parámetros de este experimento educativo
 * y NO corresponden a normas oficiales del Municipio de Quito ni a ISO 19157.
 */

export const APP_NAME = 'Quito Cadastre Quality Lab';

/** Sectores de demostración (ubicaciones aproximadas, no límites oficiales). */
export const SECTORS = [
  { id: 'centro_historico', nombre: 'Centro Histórico', lon: -78.5183, lat: -0.2203 },
  { id: 'inaquito', nombre: 'Iñaquito', lon: -78.4860, lat: -0.1690 },
  { id: 'la_carolina', nombre: 'La Carolina', lon: -78.4875, lat: -0.1795 },
  { id: 'la_mariscal', nombre: 'La Mariscal', lon: -78.4925, lat: -0.2020 },
  { id: 'quitumbe', nombre: 'Quitumbe', lon: -78.5600, lat: -0.2920 },
  { id: 'calderon', nombre: 'Calderón', lon: -78.4560, lat: -0.0700 }
];

/** Centro aproximado del DMQ para el mapa. */
export const QUITO_CENTER = [-78.4875, -0.1795];
export const QUITO_ZOOM = 11;

/** Dominios configurados (experimento). */
export const USO_SUELO_DOMAIN = [
  'Residencial', 'Comercial', 'Mixto', 'Industrial', 'Institucional', 'Recreación'
];
export const ESTADO_CONSERVACION_DOMAIN = ['Bueno', 'Regular', 'Malo'];

/** Tipos de dato esperados por campo alfanumérico. */
export const FIELD_TYPES = {
  id_predio: 'string',
  clave_catastral: 'string',
  sector: 'string',
  direccion: 'string',
  area_terreno_m2: 'number',
  area_construida_m2: 'number',
  num_pisos: 'integer',
  ano_construccion: 'integer',
  uso_suelo: 'string',
  estado_conservacion: 'string'
};

/** Campos obligatorios: no admiten null, undefined ni cadena vacía. */
export const REQUIRED_FIELDS = [
  'id_predio',
  'clave_catastral',
  'sector',
  'direccion',
  'area_terreno_m2',
  'num_pisos',
  'uso_suelo'
];

/** Rangos numéricos configurados. */
export const NUMERIC_LIMITS = {
  ano_construccion: { min: 1800, max: 2026 },
  num_pisos: { min: 0, max: 60 }
};

/** Tolerancia inicial de superficie (fracción). Valor experimental del proyecto. */
export const DEFAULT_SURFACE_TOLERANCE = 0.05;

/**
 * Catálogo de reglas. `dimension` se organiza de forma conceptual según
 * ISO 19157-1:2023 (completitud, consistencia lógica, exactitud temática,
 * exactitud posicional). Las reglas no configurables (estructurales) siempre
 * se ejecutan cuando corresponde.
 */
export const RULE_CATALOG = [
  // Estructurales
  { code: 'ESTRUCT_JSON_MALFORMADO', dimension: 'consistencia_logica', severity: 'error', configurable: false, description: 'El texto cargado no es un JSON válido.' },
  { code: 'ESTRUCT_FC_INVALIDO', dimension: 'completitud', severity: 'error', configurable: false, description: 'El objeto cargado no es un FeatureCollection GeoJSON válido.' },
  { code: 'ESTRUCT_COLECCION_VACIA', dimension: 'completitud', severity: 'warning', configurable: false, description: 'El FeatureCollection no contiene ningún feature.' },
  { code: 'ESTRUCT_FEATURE_INVALIDO', dimension: 'consistencia_logica', severity: 'error', configurable: false, description: 'Feature con estructura incorrecta (no es un objeto GeoJSON Feature). ' },
  { code: 'ESTRUCT_GEOMETRIA_NULA', dimension: 'completitud', severity: 'error', configurable: false, description: 'El feature tiene geometría nula.' },
  { code: 'ESTRUCT_GEOMETRIA_NO_SOPORTADA', dimension: 'consistencia_logica', severity: 'error', configurable: false, description: 'Tipo de geometría no admitido para evaluación predial (se requieren Polygon o MultiPolygon).' },

  // Alfanuméricas
  { code: 'ALFA_ID_DUPLICADO', dimension: 'consistencia_logica', severity: 'error', configurable: true, description: 'Identificador de predio duplicado.' },
  { code: 'ALFA_CLAVE_DUPLICADA', dimension: 'consistencia_logica', severity: 'error', configurable: true, description: 'Clave catastral duplicada.' },
  { code: 'ALFA_CAMPO_OBLIGATORIO_NULO', dimension: 'completitud', severity: 'error', configurable: true, description: 'Campo obligatorio nulo o vacío.' },
  { code: 'ALFA_TIPO_DATO_INCORRECTO', dimension: 'consistencia_logica', severity: 'error', configurable: true, description: 'Tipo de dato incorrecto en un atributo.' },
  { code: 'ALFA_SUPERFICIE_NEGATIVA', dimension: 'consistencia_logica', severity: 'error', configurable: true, description: 'Superficie (terreno o construida) con valor negativo.' },
  { code: 'ALFA_NUM_PISOS_INVALIDO', dimension: 'consistencia_logica', severity: 'error', configurable: true, description: 'Número de pisos negativo, no entero o fuera de rango.' },
  { code: 'ALFA_VALOR_FUERA_DOMINIO', dimension: 'consistencia_logica', severity: 'error', configurable: true, description: 'Valor fuera de los dominios configurados.' },
  { code: 'ALFA_INCONSISTENCIA_AREA_PISOS', dimension: 'consistencia_logica', severity: 'warning', configurable: true, description: 'Área construida inconsistente con el número de pisos.' },

  // Geométricas
  { code: 'GEOM_COORD_FUERA_RANGO', dimension: 'consistencia_logica', severity: 'error', configurable: true, description: 'Coordenadas fuera del rango WGS84 válido (long ∈ [-180,180], lat ∈ [-90,90]) o no finitas.' },
  { code: 'GEOM_VACIA', dimension: 'completitud', severity: 'error', configurable: true, description: 'Geometría vacía o sin posiciones.' },
  { code: 'GEOM_ANILLO_NO_CERRADO', dimension: 'consistencia_logica', severity: 'error', configurable: true, description: 'Anillo de polígono no cerrado (primer y último vértice distintos).' },
  { code: 'GEOM_AUTOINTERSECCION', dimension: 'consistencia_logica', severity: 'error', configurable: true, description: 'Anillo autointersecado.' },
  { code: 'GEOM_DUPLICADA', dimension: 'consistencia_logica', severity: 'error', configurable: true, description: 'Geometría idéntica a la de otro predio.' },
  { code: 'GEOM_AREA_CERO', dimension: 'consistencia_logica', severity: 'error', configurable: true, description: 'Polígono con área (casi) cero.' },

  // Topológicas
  { code: 'TOPO_SOLAPAMIENTO', dimension: 'consistencia_logica', severity: 'error', configurable: true, description: 'Superposición entre predios con área positiva.' },
  { code: 'TOPO_CONTACTO_BORDE', dimension: 'consistencia_logica', severity: 'info', configurable: true, description: 'Contacto entre predios a lo largo de un borde (no es superposición).' },
  { code: 'TOPO_CONTACTO_VERTICE', dimension: 'consistencia_logica', severity: 'info', configurable: true, description: 'Contacto entre predios en un vértice (no es superposición).' },

  // Superficies
  { code: 'SUP_FUERA_TOLERANCIA', dimension: 'exactitud_tematica', severity: 'warning', configurable: true, description: 'Diferencia entre área geométrica y área registrada por encima de la tolerancia configurada.' },
  { code: 'SUP_VALOR_INVALIDO', dimension: 'exactitud_tematica', severity: 'error', configurable: true, description: 'Área registrada nula, no numérica o no positiva: no se puede comparar con el área geométrica.' }
];

/** Severidades válidas. */
export const SEVERITIES = ['error', 'warning', 'info'];

export function getRule(code) {
  return RULE_CATALOG.find((r) => r.code === code) || null;
}
