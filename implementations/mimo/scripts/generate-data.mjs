#!/usr/bin/env node
/**
 * Generador reproducible de datos catastrales sintéticos del Distrito
 * Metropolitano de Quito (fines educativos, sin relación con el Municipio).
 *
 * Uso: npm run generate-data
 *
 * Genera:
 *  - public/data/quito_predios_sinteticos.geojson
 *  - data/expected_issues.json (referencia de errores inyectados)
 *
 * Semilla fija: cualquier ejecución produce exactamente el mismo archivo.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import area from '@turf/area';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SEED = 20261031;
const TOTAL_PER_SECTOR = 11; // 6 sectores x 11 = 66 predios base + 2 de superposición

// Coordenadas aproximadas de referencia (solo demostración, NO son límites oficiales)
const SECTORS = [
  { code: 'CH', nombre: 'Centro Histórico', center: [-78.5105, -0.2195], rot: 25 },
  { code: 'IN', nombre: 'Iñaquito', center: [-78.4940, -0.1750], rot: -10 },
  { code: 'LC', nombre: 'La Carolina', center: [-78.4820, -0.1820], rot: 15 },
  { code: 'MA', nombre: 'La Mariscal', center: [-78.4935, -0.1965], rot: 5 },
  { code: 'QU', nombre: 'Quitumbe', center: [-78.5330, -0.2540], rot: -20 },
  { code: 'CA', nombre: 'Calderón', center: [-78.4600, -0.1080], rot: 35 },
];

const USO_SUELO = ['residencial', 'comercial', 'industrial', 'institucional', 'mixto'];
const ESTADOS = ['ocupado', 'desocupado', 'en_construccion'];
const CALLES = ['Av. Equinoccial', 'Calle Granda Salazar', 'Av. Portugal', 'Calle García Moreno',
  'Av. Diego de Robles', 'Calle Isabel La Católica', 'Av. Mariscal Sucre', 'Calle Roca',
  'Av. Simón Bolívar', 'Calle Cordero'];

/** PRNG determinista mulberry32 */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(SEED);
const rand = (min, max) => min + rnd() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const pick = (arr) => arr[randInt(0, arr.length - 1)];

const M_PER_DEG_LAT = 110574;
const mPerDegLon = (lat) => 111320 * Math.cos((lat * Math.PI) / 180);

/**
 * Crea un polígono rectangular (en grados, anillo cerrado CCW) a partir del
 * centro y dimensiones en metros, con rotación.
 */
function makeRect(cx, cy, wM, hM, rotDeg) {
  const cosR = Math.cos((rotDeg * Math.PI) / 180);
  const sinR = Math.sin((rotDeg * Math.PI) / 180);
  const halfW = wM / 2;
  const halfH = hM / 2;
  const corners = [
    [-halfW, -halfH],
    [halfW, -halfH],
    [halfW, halfH],
    [-halfW, halfH],
  ];
  const lonPerM = 1 / mPerDegLon(cy);
  const latPerM = 1 / M_PER_DEG_LAT;
  const ring = corners.map(([dx, dy]) => {
    const rx = dx * cosR - dy * sinR;
    const ry = dx * sinR + dy * cosR;
    return [round(cx + rx * lonPerM, 7), round(cy + ry * latPerM, 7)];
  });
  ring.push([...ring[0]]); // anillo cerrado (RFC 7946)
  return { type: 'Polygon', coordinates: [ring] };
}

/** Polígono "bowtie" autointersecado alrededor de un centro. */
function makeBowtie(cx, cy, wM, hM, rotDeg) {
  const cosR = Math.cos((rotDeg * Math.PI) / 180);
  const sinR = Math.sin((rotDeg * Math.PI) / 180);
  const corners = [
    [-wM / 2, -hM / 2],
    [wM / 2, hM / 2],
    [wM / 2, -hM / 2],
    [-wM / 2, hM / 2],
  ];
  const lonPerM = 1 / mPerDegLon(cy);
  const latPerM = 1 / M_PER_DEG_LAT;
  const ring = corners.map(([dx, dy]) => {
    const rx = dx * cosR - dy * sinR;
    const ry = dx * sinR + dy * cosR;
    return [round(cx + rx * lonPerM, 7), round(cy + ry * latPerM, 7)];
  });
  ring.push([...ring[0]]);
  return { type: 'Polygon', coordinates: [ring] };
}

const round = (v, n) => Math.round(v * 10 ** n) / 10 ** n;

function feature(id, props, geom) {
  return { type: 'Feature', properties: props, geometry: geom };
}

// ---------------------------------------------------------------------------
// 1. Generación de la fila base de predios por sector
// (predios consecutivos comparten borde exacto: casillas y contiguas)
// ---------------------------------------------------------------------------
const features = [];
const sharedBorderPairs = [];

SECTORS.forEach((sector) => {
  let xCursor = 0;
  const rowY = sector.center[1];
  for (let i = 0; i < TOTAL_PER_SECTOR; i++) {
    const wM = rand(14, 26);
    const hM = rand(12, 20);
    // Sin rotación en la fila: los rectángulos consecutivos comparten
    // exactamente su borde vertical (contacto en borde, no superposición).
    const cx = sector.center[0] + (xCursor + wM / 2) / mPerDegLon(rowY);
    const cy = rowY;
    const geom = makeRect(cx, cy, wM, hM, 0);
    const geomArea = round(area(geom), 2);
    const pisos = randInt(1, 5);
    const props = {
      id_predio: `PD-${sector.code}-${String(features.length + 1).padStart(4, '0')}`,
      clave_catastral: `17${String(features.length + 1).padStart(13, '0')}`,
      sector: sector.nombre,
      direccion: `${pick(CALLES)} ${randInt(1, 999)}-${randInt(1, 20)}`,
      area_terreno_m2: geomArea,
      area_construida_m2: round(geomArea * pisos * rand(0.4, 0.85), 2),
      pisos,
      uso_suelo: pick(USO_SUELO),
      estado_predio: pick(ESTADOS),
      fecha_actualizacion: `202${randInt(4, 5)}-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`,
    };
    features.push(feature(props.id_predio, props, geom));
    if (i > 0) {
      sharedBorderPairs.push([features[features.length - 2].properties.id_predio, props.id_predio]);
    }
    xCursor += wM; // siguiente predio arranca donde termina este: comparten borde
  }
});

const expectedIssues = [];
const addExpected = (predioId, rules, description) =>
  expectedIssues.push({ predio_id: predioId, rules, description });

// ---------------------------------------------------------------------------
// 2. Inyección de errores deliberados (índices globales fijos sobre features)
//    Se documenta explícitamente cada mutación.
// ---------------------------------------------------------------------------

// 2.1 Tres predios con claves catastrales duplicadas (copia la clave del vecino anterior)
for (const idx of [3, 7, 11]) {
  const f = features[idx];
  f.properties.clave_catastral = features[idx - 1].properties.clave_catastral;
  addExpected(f.properties.id_predio, ['ALP-002'],
    `clave_catastral duplicada con ${features[idx - 1].properties.id_predio}`);
  addExpected(features[idx - 1].properties.id_predio, ['ALP-002'],
    `clave_catastral duplicada con ${f.properties.id_predio}`);
}

// 2.2 Tres predios con atributos obligatorios nulos
features[15].properties.area_terreno_m2 = null;
addExpected(features[15].properties.id_predio, ['ALP-003', 'SUP-NC'], 'area_terreno_m2 nulo');
features[19].properties.clave_catastral = null;
addExpected(features[19].properties.id_predio, ['ALP-003'], 'clave_catastral nulo');
features[23].properties.sector = null;
addExpected(features[23].properties.id_predio, ['ALP-003', 'ALP-007'], 'sector nulo');

// 2.3 Dos predios con superficie registrada negativa
for (const idx of [27, 31]) {
  features[idx].properties.area_terreno_m2 = -Math.abs(features[idx].properties.area_terreno_m2);
  addExpected(features[idx].properties.id_predio, ['ALP-005', 'SUP-NC'], 'area_terreno_m2 negativa');
}

// 2.4 Dos predios con tipos de datos incorrectos
features[35].properties.area_terreno_m2 = String(features[35].properties.area_terreno_m2);
addExpected(features[35].properties.id_predio, ['ALP-004', 'SUP-NC'], 'area_terreno_m2 como texto');
features[39].properties.pisos = String(features[39].properties.pisos);
addExpected(features[39].properties.id_predio, ['ALP-004'], 'pisos como texto');

// 2.5 Dos pares de predios superpuestos (predios extra que solapan la fila base)
const overlapPairs = [];
function addOverlappingExtra(anchorIdx, suffix) {
  const anchor = features[anchorIdx];
  const ring = anchor.geometry.coordinates[0];
  const lon0 = ring[0][0];
  const lon1 = ring[2][0];
  const lat0 = ring[0][1];
  const lat1 = ring[2][1];
  const anchorWM = (lon1 - lon0) * mPerDegLon(lat0);
  const anchorHM = (lat1 - lat0) * M_PER_DEG_LAT;
  const cx = (lon0 + lon1) / 2;
  const cy = lat0 + (lat1 - lat0) * 0.75; // centro desplazado hacia el borde superior
  const wM = anchorWM * 0.7;
  const hM = anchorHM * 0.7;
  const geom = makeRect(cx, cy, wM, hM, 0);
  const geomArea = round(area(geom), 2);
  const pisos = randInt(1, 3);
  const props = {
    id_predio: `PD-OV-${String(features.length + 1).padStart(4, '0')}`,
    clave_catastral: `17${String(features.length + 1).padStart(13, '0')}`,
    sector: anchor.properties.sector,
    direccion: `${pick(CALLES)} ${randInt(1, 999)}`,
    area_terreno_m2: geomArea,
    area_construida_m2: round(geomArea * pisos * 0.6, 2),
    pisos,
    uso_suelo: pick(USO_SUELO),
    estado_predio: pick(ESTADOS),
    fecha_actualizacion: '2025-06-15',
  };
  features.push(feature(props.id_predio, props, geom));
  overlapPairs.push([anchor.properties.id_predio, props.id_predio, suffix]);
  addExpected(props.id_predio, ['TOP-001'], `superposición con ${anchor.properties.id_predio}`);
  addExpected(anchor.properties.id_predio, ['TOP-001'], `superposición con ${props.id_predio}`);
}
addOverlappingExtra(20, 'LC');
addOverlappingExtra(45, 'QU');

// 2.6 Dos predios con geometrías autointersecadas (bowtie)
for (const idx of [55, 59]) {
  const f = features[idx];
  const ring = f.geometry.coordinates[0];
  const cx = (ring[0][0] + ring[2][0]) / 2;
  const cy = (ring[0][1] + ring[2][1]) / 2;
  const wM = rand(18, 24);
  const hM = rand(16, 22);
  f.geometry = makeBowtie(cx, cy, wM, hM, rand(-10, 10));
  // Nota: al cancelarse las lóbulas opuestas del bowtie, turf.area devuelve ~0,
  // por lo que el validador también dispara GEO-006 junto a GEO-004.
  addExpected(f.properties.id_predio, ['GEO-004', 'GEO-006'], 'geometría autointersecada (bowtie; área neta ~0)');
}

// 2.7 Tres predios con diferencia de superficie > 5 %
const diffFactors = { 43: 1.12, 47: 0.85, 51: 1.25 };
for (const [idxStr, factor] of Object.entries(diffFactors)) {
  const f = features[Number(idxStr)];
  f.properties.area_terreno_m2 = round(f.properties.area_terreno_m2 * factor, 2);
  addExpected(f.properties.id_predio, ['SUP-001'],
    `diferencia de superficie ${(Math.abs(factor - 1) * 100).toFixed(0)} %`);
}

// 2.8 Dos predios con valores fuera de dominios
features[63].properties.uso_suelo = 'agrícola-urbano';
addExpected(features[63].properties.id_predio, ['ALP-007'], 'uso_suelo fuera de dominio');
features[65].properties.estado_predio = 'rematado';
addExpected(features[65].properties.id_predio, ['ALP-007'], 'estado_predio fuera de dominio');

// 2.9 Extras documentados (no exigidos pero ilustrativos)
features[60].properties.pisos = -2;
addExpected(features[60].properties.id_predio, ['ALP-006'], 'pisos negativo');
features[64].properties.area_construida_m2 = round(features[64].properties.area_construida_m2 * 12, 2);
addExpected(features[64].properties.id_predio, ['ALP-008'], 'área construida implausible para su número de pisos');

// Ordenar esperados por id para lectura estable
expectedIssues.sort((a, b) => a.predio_id.localeCompare(b.predio_id));

// ---------------------------------------------------------------------------
// 3. Salida
// ---------------------------------------------------------------------------
const fc = {
  type: 'FeatureCollection',
  name: 'quito_predios_sinteticos',
  metadata: {
    aviso: 'Datos catastrales sintéticos con fines educativos y experimentales. No representan información oficial del Municipio del Distrito Metropolitano de Quito.',
    semilla: SEED,
    crs: 'EPSG:4326 (WGS84 geográfico, orden [longitud, latitud] según RFC 7946)',
    generado_por: 'scripts/generate-data.mjs',
  },
  features,
};

mkdirSync(join(ROOT, 'public', 'data'), { recursive: true });
mkdirSync(join(ROOT, 'data'), { recursive: true });
writeFileSync(join(ROOT, 'public', 'data', 'quito_predios_sinteticos.geojson'),
  JSON.stringify(fc, null, 1));

const expectedDoc = {
  descripcion: 'Referencia de los errores introducidos intencionalmente por el generador. Es un artefacto de generación, NO una prueba independiente de la corrección del validador.',
  semilla: SEED,
  total_predios: features.length,
  coexistencia: 'Algunos predios presentan más de un error inyectado (p. ej. claves duplicadas comparten la clave con otro predio; los predios con área negativa o de tipo incorrecto tampoco permiten evaluar SUP).',
  errores_requeridos: {
    claves_catastrales_duplicadas: '3 predios (6 features marcadas: original y duplicado)',
    atributos_obligatorios_nulos: '3 predios',
    superficies_negativas: '2 predios',
    tipos_de_datos_incorrectos: '2 predios',
    superposiciones: '2 pares (4 features marcadas)',
    autointersecciones: '2 predios',
    diferencias_superficie_mayores_5pct: '3 predios',
    valores_fuera_de_dominio: '2 predios',
    extras: '1 predio con pisos negativos, 1 predio con inconsistencia área/pisos',
  },
  pares_que_comparten_borde_sin_solaparse: sharedBorderPairs.slice(0, 5),
  total_pares_que_comparten_borde: sharedBorderPairs.length,
  pares_superpuestos: overlapPairs.map(([a, b]) => [a, b]),
  issues: expectedIssues,
};

writeFileSync(join(ROOT, 'data', 'expected_issues.json'), JSON.stringify(expectedDoc, null, 2));

console.log(`Generados ${features.length} predios (semilla ${SEED}).`);
console.log(`Pares que comparten borde sin solaparse: ${sharedBorderPairs.length}`);
console.log(`Errores documentados: ${expectedIssues.length} entradas en data/expected_issues.json`);
