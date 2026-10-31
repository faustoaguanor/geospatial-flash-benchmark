/**
 * Constantes del experimento: sectores, dominios, campos, reglas y tolerancias.
 * Todos los umbrales son parámetros de este experimento (no normas oficiales).
 */

export const SECTORS = [
  'Centro Histórico',
  'Iñaquito',
  'La Carolina',
  'La Mariscal',
  'Quitumbe',
  'Calderón',
];

export const USO_SUELO_DOMAIN = [
  'residencial',
  'comercial',
  'industrial',
  'institucional',
  'mixto',
];

export const ESTADO_PREDIO_DOMAIN = ['ocupado', 'desocupado', 'en_construccion'];

/** Esquema de atributos esperado para un predio catastral sintético. */
export const ATTRIBUTE_SCHEMA = {
  id_predio: { type: 'string', required: true },
  clave_catastral: { type: 'string', required: true },
  sector: { type: 'string', required: true, domain: SECTORS },
  direccion: { type: 'string', required: false },
  area_terreno_m2: { type: 'number', required: true },
  area_construida_m2: { type: 'number', required: true },
  pisos: { type: 'integer', required: true, min: 1 },
  uso_suelo: { type: 'string', required: true, domain: USO_SUELO_DOMAIN },
  estado_predio: { type: 'string', required: true, domain: ESTADO_PREDIO_DOMAIN },
  fecha_actualizacion: { type: 'string', required: false, pattern: /^\d{4}-\d{2}-\d{2}$/ },
};

/** Dimensiones de calidad organizadas con referencia conceptual a ISO 19157-1:2023. */
export const DIMENSIONS = {
  COMPLETITUD: 'completitud',
  CONSISTENCIA_LOGICA: 'consistencia_lógica',
  EXACTITUD_POSICIONAL: 'exactitud_posicional',
  EXACTITUD_TEMATICA: 'exactitud_tématica',
  CALIDAD_TEMPORAL: 'calidad_temporal',
};

/**
 * Registro de reglas: código estable, dimensión, severidad por defecto y
 * descripción del criterio. Códigos fijos y documentados en el README.
 */
export const RULES = {
  'STR-001': { name: 'JSON malformado', dimension: DIMENSIONS.CONSISTENCIA_LOGICA, severity: 'error', scope: 'dataset' },
  'STR-002': { name: 'FeatureCollection inválido', dimension: DIMENSIONS.CONSISTENCIA_LOGICA, severity: 'error', scope: 'dataset' },
  'STR-003': { name: 'Colección vacía', dimension: DIMENSIONS.COMPLETITUD, severity: 'error', scope: 'dataset' },
  'STR-004': { name: 'Estructura de feature incorrecta', dimension: DIMENSIONS.CONSISTENCIA_LOGICA, severity: 'error', scope: 'feature' },
  'STR-005': { name: 'Geometría nula', dimension: DIMENSIONS.CONSISTENCIA_LOGICA, severity: 'error', scope: 'feature' },
  'STR-006': { name: 'Geometría no admitida para evaluación predial', dimension: DIMENSIONS.CONSISTENCIA_LOGICA, severity: 'advertencia', scope: 'feature' },
  'ALP-001': { name: 'Identificador duplicado', dimension: DIMENSIONS.CONSISTENCIA_LOGICA, severity: 'error', scope: 'dataset' },
  'ALP-002': { name: 'Clave catastral duplicada', dimension: DIMENSIONS.CONSISTENCIA_LOGICA, severity: 'error', scope: 'dataset' },
  'ALP-003': { name: 'Campo obligatorio nulo o vacío', dimension: DIMENSIONS.COMPLETITUD, severity: 'error', scope: 'feature' },
  'ALP-004': { name: 'Tipo de dato incorrecto', dimension: DIMENSIONS.CONSISTENCIA_LOGICA, severity: 'error', scope: 'feature' },
  'ALP-005': { name: 'Superficie registrada negativa', dimension: DIMENSIONS.CONSISTENCIA_LOGICA, severity: 'error', scope: 'feature' },
  'ALP-006': { name: 'Número de pisos inválido', dimension: DIMENSIONS.CONSISTENCIA_LOGICA, severity: 'error', scope: 'feature' },
  'ALP-007': { name: 'Valor fuera de dominio', dimension: DIMENSIONS.EXACTITUD_TEMATICA, severity: 'error', scope: 'feature' },
  'ALP-008': { name: 'Inconsistencia entre área construida y pisos', dimension: DIMENSIONS.EXACTITUD_TEMATICA, severity: 'advertencia', scope: 'feature' },
  'ALP-009': { name: 'Formato de campo inválido', dimension: DIMENSIONS.CALIDAD_TEMPORAL, severity: 'advertencia', scope: 'feature' },
  'GEO-001': { name: 'Coordenadas fuera de rango', dimension: DIMENSIONS.EXACTITUD_POSICIONAL, severity: 'error', scope: 'feature' },
  'GEO-002': { name: 'Geometría vacía', dimension: DIMENSIONS.CONSISTENCIA_LOGICA, severity: 'error', scope: 'feature' },
  'GEO-003': { name: 'Anillo de polígono no cerrado', dimension: DIMENSIONS.CONSISTENCIA_LOGICA, severity: 'error', scope: 'feature' },
  'GEO-004': { name: 'Autointersección en la geometría', dimension: DIMENSIONS.CONSISTENCIA_LOGICA, severity: 'error', scope: 'feature' },
  'GEO-005': { name: 'Geometría duplicada', dimension: DIMENSIONS.CONSISTENCIA_LOGICA, severity: 'advertencia', scope: 'dataset' },
  'GEO-006': { name: 'Polígono de área cero', dimension: DIMENSIONS.CONSISTENCIA_LOGICA, severity: 'error', scope: 'feature' },
  'TOP-001': { name: 'Superposición entre predios', dimension: DIMENSIONS.CONSISTENCIA_LOGICA, severity: 'error', scope: 'pair' },
  'SUP-001': { name: 'Diferencia de superficie fuera de tolerancia', dimension: DIMENSIONS.EXACTITUD_TEMATICA, severity: 'error', scope: 'feature' },
  'SUP-002': { name: 'Superficie registrada nula o cero (comparación no evaluada)', dimension: DIMENSIONS.COMPLETITUD, severity: 'advertencia', scope: 'feature' },
};

/** Tolerancias por defecto del experimento (ajustables en la interfaz). */
export const DEFAULT_CONFIG = {
  /** Tolerancia porcentual de diferencia de superficie (%). */
  surfaceTolerancePercent: 5,
  /** Área mínima de intersección (m²) para clasificar superposición. */
  overlapMinAreaM2: 0.01,
  /** Área mínima (m²) bajo la cual un polígono se considera de área cero. */
  zeroAreaM2: 0.01,
  /** Reglas habilitadas: todas por defecto. */
  enabledRules: Object.keys(RULES),
};

export const AVISO_SINTETICO =
  'Datos catastrales sintéticos con fines educativos y experimentales. No representan información oficial del Municipio del Distrito Metropolitano de Quito.';

/**
 * Reglas que NO se evalúan por falta de datos de referencia independientes.
 * Se declaran explícitamente para no simular resultados satisfactorios.
 */
export const NOT_EVALUATED_DIMENSIONS = [
  {
    dimension: DIMENSIONS.EXACTITUD_POSICIONAL,
    reason: 'La exactitud posicional real exige comparar contra datos de referencia independientes (catastro oficial con precisión certificada), que no están disponibles en este experimento.',
  },
  {
    dimension: DIMENSIONS.CALIDAD_TEMPORAL,
    reason: 'La calidad temporal (actualidad, vigencia) exige una serie temporal de referencia independiente; solo se verifica el formato de la fecha de actualización (ALP-009), no su veracidad.',
  },
  {
    dimension: 'exactitud de la medición catastral',
    reason: 'No existe catastro oficial de Quito en el experimento contra el cual validar áreas o perímetros.',
  },
];
