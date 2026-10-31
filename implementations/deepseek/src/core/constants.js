/**
 * Catálogo central de reglas, dominios y metadatos.
 * Este módulo no depende del DOM ni de MapLibre: puede usarse en Node/Vitest.
 */

export const APP_NAME = 'Quito Cadastre Quality Lab';
export const APP_SUBTITLE =
  'Laboratorio de evaluación de calidad de información catastral vectorial sintética';

export const DISCLAIMER =
  'Datos catastrales sintéticos con fines educativos y experimentales. No representan información oficial del Municipio del Distrito Metropolitano de Quito.';

export const SECTORS = [
  { id: 'centro-historico', nombre: 'Centro Histórico', centro: [-78.513, -0.22] },
  { id: 'inaquito', nombre: 'Iñaquito', centro: [-78.486, -0.176] },
  { id: 'la-carolina', nombre: 'La Carolina', centro: [-78.484, -0.187] },
  { id: 'la-mariscal', nombre: 'La Mariscal', centro: [-78.494, -0.201] },
  { id: 'quitumbe', nombre: 'Quitumbe', centro: [-78.535, -0.305] },
  { id: 'calderon', nombre: 'Calderón', centro: [-78.423, -0.095] }
];

export const SECTOR_NAMES = SECTORS.map((s) => s.nombre);

export const QUALITY_DIMENSIONS = {
  completitud: 'Completitud',
  consistencia_logica: 'Consistencia lógica',
  exactitud_posicional: 'Exactitud posicional',
  exactitud_tematica: 'Exactitud temática',
  calidad_temporal: 'Calidad temporal'
};

export const SEVERITIES = {
  error: 'Error',
  advertencia: 'Advertencia',
  info: 'Informativa'
};

export const SEVERITY_ORDER = { error: 0, advertencia: 1, info: 2 };

export const REQUIRED_FIELDS = [
  'id',
  'clave_catastral',
  'sector',
  'uso_suelo',
  'estado',
  'area_terreno_m2',
  'area_construida_m2',
  'numero_pisos'
];

export const NUMERIC_FIELDS = [
  'area_terreno_m2',
  'area_construida_m2',
  'numero_pisos',
  'anio_construccion',
  'avaluo_ficticio_usd'
];

export const STRING_FIELDS = [
  'id',
  'clave_catastral',
  'sector',
  'manzana',
  'lote',
  'direccion_ficticia',
  'uso_suelo',
  'estado',
  'fuente'
];

export const DOMAINS = {
  uso_suelo: ['RESIDENCIAL', 'COMERCIAL', 'INDUSTRIAL', 'MIXTO', 'EQUIPAMIENTO', 'AGRICOLA'],
  estado: ['ACTIVO', 'INACTIVO', 'EN_REVISION'],
  sector: SECTOR_NAMES
};

export const YEAR_DOMAIN = { min: 1900, max: 2026 };

export const FIELD_LABELS = {
  id: 'Identificador',
  clave_catastral: 'Clave catastral',
  sector: 'Sector',
  manzana: 'Manzana',
  lote: 'Lote',
  direccion_ficticia: 'Dirección ficticia',
  uso_suelo: 'Uso de suelo',
  estado: 'Estado',
  area_terreno_m2: 'Área de terreno registrada (m²)',
  area_construida_m2: 'Área construida (m²)',
  numero_pisos: 'Número de pisos',
  anio_construccion: 'Año de construcción',
  avaluo_ficticio_usd: 'Avalúo ficticio (USD)',
  fuente: 'Fuente'
};

export const DEFAULT_SURFACE_TOLERANCE_PCT = 5;
export const MIN_SURFACE_TOLERANCE_PCT = 0;
export const MAX_SURFACE_TOLERANCE_PCT = 100;

/** Tolerancias numéricas documentadas del experimento. */
export const TOLERANCES = {
  /** Área mínima de intersección (m²) para considerar una superposición real. */
  overlapAreaM2: 1,
  /** Área geométrica (m²) por debajo de la cual se considera polígono de área cero. */
  zeroAreaM2: 0.01,
  /** Epsilon angular (~0,1 mm) para comparar vértices y cierres de anillo. */
  coordinateEpsilon: 1e-9,
  /** Redondeo de coordenadas para detectar geometrías duplicadas (~1 cm). */
  duplicateGeometryDecimals: 7,
  /** Relación máxima área construida / (área terreno × pisos) antes de advertir. */
  builtFloorRatio: 1.05,
  /** Máximo de predios sobre el que se ejecuta el análisis topológico O(n²). */
  maxTopologyFeatures: 2000
};

/**
 * Catálogo de reglas. `evaluable: false` documenta verificaciones que este
 * experimento NO puede ejecutar por falta de datos de referencia.
 */
export const RULES = [
  {
    code: 'STR-001',
    nombre: 'JSON malformado',
    dimension: 'completitud',
    severidad: 'error',
    categoria: 'estructural',
    evaluable: true,
    criterio: 'El texto debe poder interpretarse como JSON válido.',
    descripcion: 'El archivo no pudo interpretarse como JSON válido.'
  },
  {
    code: 'STR-002',
    nombre: 'FeatureCollection inválido',
    dimension: 'completitud',
    severidad: 'error',
    categoria: 'estructural',
    evaluable: true,
    criterio: 'La raíz debe ser un objeto GeoJSON de tipo FeatureCollection con arreglo features.',
    descripcion: 'La raíz del documento no es una FeatureCollection válida.'
  },
  {
    code: 'STR-003',
    nombre: 'Colección vacía',
    dimension: 'completitud',
    severidad: 'advertencia',
    categoria: 'estructural',
    evaluable: true,
    criterio: 'La colección debe contener al menos una entidad.',
    descripcion: 'La FeatureCollection no contiene entidades.'
  },
  {
    code: 'STR-004',
    nombre: 'Feature con estructura incorrecta',
    dimension: 'completitud',
    severidad: 'error',
    categoria: 'estructural',
    evaluable: true,
    criterio: 'Cada elemento debe ser un objeto Feature con geometry y properties válidos.',
    descripcion: 'Una entidad no cumple la estructura mínima de una Feature GeoJSON.'
  },
  {
    code: 'STR-005',
    nombre: 'Geometría nula o ausente',
    dimension: 'completitud',
    severidad: 'error',
    categoria: 'estructural',
    evaluable: true,
    criterio: 'Toda entidad evaluable debe tener una geometría no nula.',
    descripcion: 'La entidad no tiene geometría.'
  },
  {
    code: 'STR-006',
    nombre: 'Geometría no admitida',
    dimension: 'completitud',
    severidad: 'error',
    categoria: 'estructural',
    evaluable: true,
    criterio: 'Solo se evalúan predios con geometría Polygon o MultiPolygon.',
    descripcion: 'La geometría no es Polygon ni MultiPolygon.'
  },
  {
    code: 'GEO-001',
    nombre: 'Coordenadas fuera de rango',
    dimension: 'exactitud_posicional',
    severidad: 'error',
    categoria: 'geometrica',
    evaluable: true,
    criterio: 'Longitud en [-180, 180] y latitud en [-90, 90], orden [longitud, latitud] (RFC 7946).',
    descripcion: 'La geometría contiene coordenadas fuera del rango geográfico válido.'
  },
  {
    code: 'GEO-002',
    nombre: 'Geometría vacía',
    dimension: 'completitud',
    severidad: 'error',
    categoria: 'geometrica',
    evaluable: true,
    criterio: 'La geometría debe contener al menos un anillo con posiciones.',
    descripcion: 'La geometría no contiene coordenadas utilizables.'
  },
  {
    code: 'GEO-003',
    nombre: 'Anillo no cerrado',
    dimension: 'consistencia_logica',
    severidad: 'error',
    categoria: 'geometrica',
    evaluable: true,
    criterio: 'El primer y el último par ordenado de cada anillo deben coincidir (epsilon 1e-9).',
    descripcion: 'Un anillo del polígono no está cerrado.'
  },
  {
    code: 'GEO-004',
    nombre: 'Autointersección',
    dimension: 'consistencia_logica',
    severidad: 'error',
    categoria: 'geometrica',
    evaluable: true,
    criterio: 'El anillo exterior de un polígono simple no debe cruzarse consigo mismo.',
    descripcion: 'La geometría presenta autointersecciones (anillo cruzado).'
  },
  {
    code: 'GEO-005',
    nombre: 'Geometría duplicada',
    dimension: 'consistencia_logica',
    severidad: 'error',
    categoria: 'geometrica',
    evaluable: true,
    criterio: 'Dos predios no deben tener anillos idénticos redondeados a 7 decimales.',
    descripcion: 'La geometría es idéntica a la de otro predio.'
  },
  {
    code: 'GEO-006',
    nombre: 'Polígono de área cero',
    dimension: 'consistencia_logica',
    severidad: 'error',
    categoria: 'geometrica',
    evaluable: true,
    criterio: 'El área geométrica debe ser mayor que 0,01 m².',
    descripcion: 'El polígono tiene área geométrica nula o despreciable.'
  },
  {
    code: 'GEO-007',
    nombre: 'Superposición entre predios',
    dimension: 'consistencia_logica',
    severidad: 'error',
    categoria: 'topologia',
    evaluable: true,
    criterio: 'La intersección poligonal debe superar 1 m² para considerarse superposición; borde y vértice no son superposición.',
    descripcion: 'El predio se superpone con otro predio.'
  },
  {
    code: 'GEO-008',
    nombre: 'Contacto en borde o vértice',
    dimension: 'consistencia_logica',
    severidad: 'info',
    categoria: 'topologia',
    evaluable: true,
    criterio: 'La intersección es una línea (borde) o un punto (vértice) y su área es nula.',
    descripcion: 'El predio comparte borde o vértice con otro predio sin superponerse. Se contabiliza como contacto, no como superposición.'
  },
  {
    code: 'GEO-009',
    nombre: 'Anillo con posiciones insuficientes',
    dimension: 'consistencia_logica',
    severidad: 'error',
    categoria: 'geometrica',
    evaluable: true,
    criterio: 'Un anillo lineal debe contener al menos 4 posiciones incluida la de cierre.',
    descripcion: 'Un anillo tiene menos de 4 posiciones.'
  },
  {
    code: 'ALF-001',
    nombre: 'Identificador duplicado',
    dimension: 'consistencia_logica',
    severidad: 'error',
    categoria: 'alfanumerica',
    evaluable: true,
    criterio: 'El campo id debe ser único tras recortar espacios.',
    descripcion: 'El identificador del predio está repetido.'
  },
  {
    code: 'ALF-002',
    nombre: 'Clave catastral duplicada',
    dimension: 'consistencia_logica',
    severidad: 'error',
    categoria: 'alfanumerica',
    evaluable: true,
    criterio: 'La clave catastral debe ser única, comparada sin distinguir mayúsculas ni espacios extremos.',
    descripcion: 'La clave catastral está repetida.'
  },
  {
    code: 'ALF-003',
    nombre: 'Campo obligatorio nulo o vacío',
    dimension: 'completitud',
    severidad: 'error',
    categoria: 'alfanumerica',
    evaluable: true,
    criterio: 'Los campos obligatorios no deben ser null, undefined ni cadena vacía.',
    descripcion: 'Falta un campo obligatorio.'
  },
  {
    code: 'ALF-004',
    nombre: 'Tipo de dato incorrecto',
    dimension: 'exactitud_tematica',
    severidad: 'error',
    categoria: 'alfanumerica',
    evaluable: true,
    criterio: 'Los campos numéricos deben ser números y los textuales, cadenas.',
    descripcion: 'Un atributo tiene un tipo de dato distinto al definido.'
  },
  {
    code: 'ALF-005',
    nombre: 'Superficie negativa',
    dimension: 'exactitud_tematica',
    severidad: 'error',
    categoria: 'alfanumerica',
    evaluable: true,
    criterio: 'Las superficies registradas no pueden ser menores que cero.',
    descripcion: 'Una superficie registrada es negativa.'
  },
  {
    code: 'ALF-006',
    nombre: 'Número de pisos inválido',
    dimension: 'exactitud_tematica',
    severidad: 'error',
    categoria: 'alfanumerica',
    evaluable: true,
    criterio: 'numero_pisos debe ser un entero mayor o igual que cero.',
    descripcion: 'El número de pisos es negativo o no entero.'
  },
  {
    code: 'ALF-007',
    nombre: 'Valor fuera de dominio',
    dimension: 'exactitud_tematica',
    severidad: 'error',
    categoria: 'alfanumerica',
    evaluable: true,
    criterio: 'Los valores deben pertenecer a los dominios documentados (uso, estado, sector, año).',
    descripcion: 'Un atributo contiene un valor fuera del dominio permitido.'
  },
  {
    code: 'ALF-008',
    nombre: 'Inconsistencia área construida / pisos',
    dimension: 'exactitud_tematica',
    severidad: 'advertencia',
    categoria: 'alfanumerica',
    evaluable: true,
    criterio: 'área_construida_m2 no debe superar área_terreno_m2 × numero_pisos × 1,05.',
    descripcion: 'El área construida es incompatible con el área de terreno y el número de pisos. Requiere revisión.'
  },
  {
    code: 'SUP-001',
    nombre: 'Diferencia de superficie fuera de tolerancia',
    dimension: 'exactitud_tematica',
    severidad: 'error',
    categoria: 'superficie',
    evaluable: true,
    criterio: '|área registrada − área geométrica| / área geométrica × 100 no debe superar la tolerancia configurada (5 % por defecto).',
    descripcion: 'La superficie registrada difiere de la superficie geométrica más allá de la tolerancia configurada.'
  },
  {
    code: 'SUP-002',
    nombre: 'Superficie registrada no positiva',
    dimension: 'exactitud_tematica',
    severidad: 'error',
    categoria: 'superficie',
    evaluable: true,
    criterio: 'area_terreno_m2 igual a cero impide una comparación porcentual válida.',
    descripcion: 'La superficie registrada es cero.'
  },
  {
    code: 'SUP-003',
    nombre: 'Superficie no evaluable',
    dimension: 'completitud',
    severidad: 'advertencia',
    categoria: 'superficie',
    evaluable: true,
    criterio: 'La comparación requiere área geométrica positiva y área registrada numérica y positiva.',
    descripcion: 'No fue posible comparar la superficie registrada con la geométrica.'
  },
  {
    code: 'REF-001',
    nombre: 'Exactitud posicional contra referencia',
    dimension: 'exactitud_posicional',
    severidad: 'info',
    categoria: 'referencia',
    evaluable: false,
    criterio: 'Requiere una geometría de referencia independiente y verificada.',
    descripcion: 'No evaluada: no existe cartografía de referencia independiente en este experimento.'
  },
  {
    code: 'REF-002',
    nombre: 'Exactitud temática contra registro oficial',
    dimension: 'exactitud_tematica',
    severidad: 'info',
    categoria: 'referencia',
    evaluable: false,
    criterio: 'Requiere contrastar atributos con un registro catastral oficial.',
    descripcion: 'No evaluada: los datos son sintéticos y no existe registro oficial de contraste.'
  },
  {
    code: 'REF-003',
    nombre: 'Calidad temporal / vigencia',
    dimension: 'calidad_temporal',
    severidad: 'info',
    categoria: 'referencia',
    evaluable: false,
    criterio: 'Requiere fechas de levantamiento, actualización y series históricas verificables.',
    descripcion: 'No evaluada: el conjunto no contiene metadatos temporales de levantamiento ni series históricas.'
  },
  {
    code: 'REF-004',
    nombre: 'Completitud contra inventario de referencia',
    dimension: 'completitud',
    severidad: 'info',
    categoria: 'referencia',
    evaluable: false,
    criterio: 'Requiere un inventario catastral independiente contra el cual comparar.',
    descripcion: 'No evaluada: no existe inventario de referencia para medir omisiones o excesos.'
  },
  {
    code: 'REF-005',
    nombre: 'Consistencia topológica contra red catastral',
    dimension: 'consistencia_logica',
    severidad: 'info',
    categoria: 'referencia',
    evaluable: false,
    criterio: 'Requiere la red catastral completa y límites administrativos verificados.',
    descripcion: 'No evaluada parcialmente: solo se comprueban relaciones entre los predios cargados, no contra la red catastral completa.'
  }
];

export const RULE_MAP = new Map(RULES.map((rule) => [rule.code, rule]));

export const TOGGLEABLE_RULES = RULES.filter(
  (rule) => rule.evaluable && rule.categoria !== 'estructural' && rule.code !== 'GEO-008'
);

export const getRule = (code) => RULE_MAP.get(code);

export const isSeverity = (value) => Object.hasOwn(SEVERITIES, value);
