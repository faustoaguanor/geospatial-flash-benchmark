/**
 * Generador reproducible de predios catastrales sintéticos de Quito.
 *
 * Uso: npm run generate:data
 * Salidas:
 *   - public/data/quito_predios_sinteticos.geojson
 *   - data/expected_issues.json
 *
 * Semilla fija (SEED) → el conjunto generado es determinista.
 * Todos los identificadores son inequívocamente ficticios (prefijo SIM).
 * Coordenadas WGS84 en orden [longitud, latitud].
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import turfArea from '@turf/area';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SEED = 20260214;
const LOTS_PER_SECTOR = 12; // 6 sectores × 12 = 72 predios

// PRNG determinista (mulberry32)
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);
const randRange = (min, max) => min + rand() * (max - min);
const randInt = (min, max) => Math.floor(randRange(min, max + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const SECTORS = [
  { id: 'centro_historico', nombre: 'Centro Histórico', lon: -78.5183, lat: -0.2203, rot: 0.10, lotes: 12 },
  { id: 'inaquito', nombre: 'Iñaquito', lon: -78.4860, lat: -0.1690, rot: -0.35, lotes: 12 },
  { id: 'la_carolina', nombre: 'La Carolina', lon: -78.4875, lat: -0.1795, rot: 0.02, lotes: 12 },
  { id: 'la_mariscal', nombre: 'La Mariscal', lon: -78.4925, lat: -0.2020, rot: -0.12, lotes: 12 },
  { id: 'quitumbe', nombre: 'Quitumbe', lon: -78.5600, lat: -0.2920, rot: 0.42, lotes: 12 },
  { id: 'calderon', nombre: 'Calderón', lon: -78.4560, lat: -0.0700, rot: 0.25, lotes: 12 }
];

const USOS = ['Residencial', 'Comercial', 'Mixto', 'Institucional', 'Recreación'];
const ESTADOS = ['Bueno', 'Regular', 'Malo'];

// Conversión metros → grados (aproximación local, suficiente para lotes ~30 m)
const M_PER_DEG_LAT = 110574;
const mPerDegLon = (lat) => 111320 * Math.cos((lat * Math.PI) / 180);

const expectedIssues = [];

function rectPolygon(lon0, lat0, widthM, depthM, rotationRad, jitterM = 0) {
  const mLon = mPerDegLon(lat0);
  const corners = [
    [-widthM / 2, -depthM / 2],
    [widthM / 2, -depthM / 2],
    [widthM / 2, depthM / 2],
    [-widthM / 2, depthM / 2]
  ];
  const ring = corners.map(([dx, dy]) => {
    if (jitterM > 0) {
      dx += randRange(-jitterM, jitterM);
      dy += randRange(-jitterM, jitterM);
    }
    const xr = dx * Math.cos(rotationRad) - dy * Math.sin(rotationRad);
    const yr = dx * Math.sin(rotationRad) + dy * Math.cos(rotationRad);
    return [
      Number((lon0 + xr / mLon).toFixed(7)),
      Number((lat0 + yr / M_PER_DEG_LAT).toFixed(7))
    ];
  });
  ring.push([ring[0][0], ring[0][1]]); // cerrar anillo (copia, no referencia)
  return ring;
}

// Construcción base
const features = [];
let seq = 0;

for (const sector of SECTORS) {
  const gridCols = 4;
  const spacingX = 50; // metros entre centros
  const spacingY = 55;
  for (let k = 0; k < LOTS_PER_SECTOR; k++) {
    seq++;
    const col = k % gridCols;
    const row = Math.floor(k / gridCols);
    const dxM = (col - (gridCols - 1) / 2) * spacingX;
    const dyM = (row - 1.5) * spacingY;
    const mLon = mPerDegLon(sector.lat);
    const lon = sector.lon + dxM / mLon;
    const lat = sector.lat + dyM / M_PER_DEG_LAT;

    const width = randRange(14, 26);
    const depth = randRange(18, 32);
    const ring = rectPolygon(lon, lat, width, depth, sector.rot, 0.6);

    const geom = { type: 'Polygon', coordinates: [ring] };
    const geomArea = turfArea(geom);
    const pisos = randInt(1, 4);
    const uso = pick(USOS);
    const factorHuella = uso === 'Institucional' ? randRange(0.5, 0.8) : randRange(0.6, 0.9);
    const registeredArea = Number((geomArea * (1 + randRange(-0.02, 0.02))).toFixed(2));
    const construida = Number((geomArea * pisos * factorHuella).toFixed(2));

    const id = `SIM-${sector.id.toUpperCase().slice(0, 4)}-${String(seq).padStart(4, '0')}`;
    const clave = `SIM-90-${sector.id.slice(0, 3).toUpperCase()}-${String(seq).padStart(5, '0')}`;

    features.push({
      type: 'Feature',
      properties: {
        id_predio: id,
        clave_catastral: clave,
        sector: sector.nombre,
        direccion: `Calle sintética ${randInt(1, 40)} N${String(seq).padStart(3, '0')}-${randInt(10, 99)} (dato ficticio)`,
        area_terreno_m2: registeredArea,
        area_construida_m2: construida,
        num_pisos: pisos,
        ano_construccion: randInt(1975, 2024),
        uso_suelo: uso,
        estado_conservacion: pick(ESTADOS),
        fuente: 'Datos sintéticos generados con semilla fija — no oficiales'
      },
      geometry: geom
    });
  }
}

const props = (i) => features[i].properties;

// ---------------------------------------------------------------------------
// Errores intencionales (documentados también en data/expected_issues.json)
// ---------------------------------------------------------------------------

function addExpected(index, codigo_regla, descripcion, extra = {}) {
  expectedIssues.push({
    id_predio: props(index).id_predio,
    clave_catastral: props(index).clave_catastral,
    codigo_regla,
    descripcion,
    ...extra
  });
}

// 1) Claves catastrales duplicadas (3 predios)
const dupKeyPairs = [
  [3, 0], [15, 12], [27, 24]
];
for (const [dst, src] of dupKeyPairs) {
  props(dst).clave_catastral = props(src).clave_catastral;
  addExpected(dst, 'ALFA_CLAVE_DUPLICADA',
    `Clave catastral duplicada con ${props(src).id_predio} (error intencional).`,
    { predios_relacionados: [props(src).id_predio, props(dst).id_predio] });
}

// 2) Atributos obligatorios nulos (3 predios)
props(4).uso_suelo = null;
addExpected(4, 'ALFA_CAMPO_OBLIGATORIO_NULO', 'uso_suelo = null (error intencional).');
props(16).direccion = null;
addExpected(16, 'ALFA_CAMPO_OBLIGATORIO_NULO', 'direccion = null (error intencional).');
props(28).num_pisos = null;
addExpected(28, 'ALFA_CAMPO_OBLIGATORIO_NULO', 'num_pisos = null (error intencional).');

// 3) Superficies negativas (2 predios)
props(5).area_terreno_m2 = -150.5;
addExpected(5, 'ALFA_SUPERFICIE_NEGATIVA', 'area_terreno_m2 = -150.5 (error intencional).');
addExpected(5, 'SUP_VALOR_INVALIDO', 'area_terreno_m2 negativa: comparación de superficies no evaluable (coexiste con ALFA_SUPERFICIE_NEGATIVA).');
props(17).area_construida_m2 = -80.25;
addExpected(17, 'ALFA_SUPERFICIE_NEGATIVA', 'area_construida_m2 = -80.25 (error intencional).');

// 4) Tipos de dato incorrectos (2 predios)
props(6).num_pisos = '2';
addExpected(6, 'ALFA_TIPO_DATO_INCORRECTO', 'num_pisos = "2" (cadena en lugar de entero, error intencional).');
props(18).area_terreno_m2 = '180.5';
addExpected(18, 'ALFA_TIPO_DATO_INCORRECTO', 'area_terreno_m2 = "180.5" (cadena en lugar de número, error intencional).');
addExpected(18, 'SUP_VALOR_INVALIDO', 'area_terreno_m2 no numérica: comparación de superficies no evaluable (coexiste con ALFA_TIPO_DATO_INCORRECTO).');

// 5) Pares de predios superpuestos (2 pares): rectángulos explícitos que se
//    superponen con certeza, ubicados fuera de la retícula de lotes.
function placePair(idxA, idxB, offsetM, dxCenter, dyCenter) {
  const sector = SECTORS[Math.floor(idxA / LOTS_PER_SECTOR)];
  const width = 20, depth = 25;
  const mLon = mPerDegLon(sector.lat);
  const lon0 = sector.lon + dxCenter / mLon;
  const lat0 = sector.lat + dyCenter / M_PER_DEG_LAT;
  const corner = (dx, dy) => [
    Number((lon0 + dx / mLon).toFixed(7)),
    Number((lat0 + dy / M_PER_DEG_LAT).toFixed(7))
  ];
  const ringA = [corner(-width / 2, -depth / 2), corner(width / 2, -depth / 2), corner(width / 2, depth / 2), corner(-width / 2, depth / 2), corner(-width / 2, -depth / 2)];
  const ringB = ringA.map(([lon, lat]) => [Number((lon + offsetM / mLon).toFixed(7)), lat]);
  const areaA = turfArea({ type: 'Polygon', coordinates: [ringA] });
  const areaB = turfArea({ type: 'Polygon', coordinates: [ringB] });
  features[idxA].geometry.coordinates = [ringA];
  props(idxA).area_terreno_m2 = Number((areaA * 1.01).toFixed(2));
  props(idxA).area_construida_m2 = Number((areaA * props(idxA).num_pisos * 0.7).toFixed(2));
  features[idxB].geometry.coordinates = [ringB];
  props(idxB).area_terreno_m2 = Number((areaB * 0.99).toFixed(2));
  props(idxB).area_construida_m2 = Number((areaB * props(idxB).num_pisos * 0.7).toFixed(2));
}
// par 1: solapamiento parcial (desplazamiento 10 m sobre ancho 20 m)
placePair(40, 41, 10, 20, -140);
addExpected(40, 'TOPO_SOLAPAMIENTO', 'Solapamiento parcial intencional con el predio vecino.', { predios_relacionados: [props(41).id_predio, props(40).id_predio] });
// par 2: solapamiento mayor (desplazamiento 4 m)
placePair(42, 43, 4, 90, -140);
addExpected(42, 'TOPO_SOLAPAMIENTO', 'Solapamiento intencional de gran superficie con el predio vecino.', { predios_relacionados: [props(43).id_predio, props(42).id_predio] });

// 6) Geometrías autointersecadas (2 predios): anillo en forma de "moño"
function makeBowtie(index) {
  const ring = features[index].geometry.coordinates[0];
  // vértices: [A, B, C, D, A] → reordenar a [A, B, D, C, A] produce cruce
  const [a, b, c, d] = ring;
  features[index].geometry.coordinates[0] = [a, b, d, c, a];
}
makeBowtie(50);
addExpected(50, 'GEOM_AUTOINTERSECCION', 'Anillo autointersecado intencional (forma de moño). Nota: coexiste probablemente con SUP_FUERA_TOLERANCIA porque el área geodésica de un moño difiere del lote rectangular previsto.');
makeBowtie(51);
addExpected(51, 'GEOM_AUTOINTERSECCION', 'Anillo autointersecado intencional (forma de moño). Nota: coexiste probablemente con SUP_FUERA_TOLERANCIA porque el área geodésica de un moño difiere del lote rectangular previsto.');

// 7) Diferencias de superficie > 5 % (3 predios)
const disc = [[11, 1.30], [23, 0.55], [35, 1.18]];
for (const [index, factor] of disc) {
  const geomArea = turfArea(features[index].geometry);
  props(index).area_terreno_m2 = Number((geomArea * factor).toFixed(2));
  addExpected(index, 'SUP_FUERA_TOLERANCIA',
    `Área registrada desviada intencionalmente ≈ ${((factor - 1) * 100).toFixed(0)} % respecto al área geométrica.`);
}
// coexistencia documentada: el predio 23 (factor 0.55) también genera
// ALFA_INCONSISTENCIA_AREA_PISOS porque area_construida_m2 se mantuvo coherente
// con el área geométrica original y ahora supera al área registrada reducida.
addExpected(23, 'ALFA_INCONSISTENCIA_AREA_PISOS',
  'Coexistencia: el área registrada reducida (factor 0.55) hace que area_construida_m2 supere area_terreno_m2 × num_pisos (advertencia derivada, no introducida directamente).');

// 8) Valores fuera de dominio (2 predios)
props(12).uso_suelo = 'Agrícola';
addExpected(12, 'ALFA_VALOR_FUERA_DOMINIO', 'uso_suelo = "Agrícola" fuera del dominio configurado (error intencional).');
props(24).estado_conservacion = 'Excelente';
addExpected(24, 'ALFA_VALOR_FUERA_DOMINIO', 'estado_conservacion = "Excelente" fuera del dominio configurado (error intencional).');

// 9) Par de polígonos que comparten borde sin superponerse (lotes 60 y 61)
{
  const idxA = 60;
  const sector = SECTORS[Math.floor(idxA / LOTS_PER_SECTOR)];
  const width = 20, depth = 25;
  const mLon = mPerDegLon(sector.lat);
  const lon0 = sector.lon - 60 / mLon;
  const lat0 = sector.lat - 120 / M_PER_DEG_LAT;
  // anillo compartido exacto: mismo vértice intermedio, sin jitter
  const rot = sector.rot;
  const corner = (dx, dy) => {
    const xr = dx * Math.cos(rot) - dy * Math.sin(rot);
    const yr = dx * Math.sin(rot) + dy * Math.cos(rot);
    return [Number((lon0 + xr / mLon).toFixed(7)), Number((lat0 + yr / M_PER_DEG_LAT).toFixed(7))];
  };
  const sharedE = corner(width / 2, depth / 2);
  const sharedSE = corner(width / 2, -depth / 2);
  const ringA = [corner(-width / 2, -depth / 2), sharedSE, sharedE, corner(-width / 2, depth / 2), corner(-width / 2, -depth / 2)];
  const ringB = [sharedSE, corner(width * 1.5, -depth / 2), corner(width * 1.5, depth / 2), sharedE, sharedSE];
  const geomAreaA = turfArea({ type: 'Polygon', coordinates: [ringA] });
  const geomAreaB = turfArea({ type: 'Polygon', coordinates: [ringB] });
  features[idxA].geometry.coordinates = [ringA];
  props(idxA).area_terreno_m2 = Number(geomAreaA.toFixed(2));
  props(idxA).area_construida_m2 = Number((geomAreaA * props(idxA).num_pisos * 0.7).toFixed(2));
  features[idxA + 1].geometry.coordinates = [ringB];
  props(idxA + 1).area_terreno_m2 = Number(geomAreaB.toFixed(2));
  props(idxA + 1).area_construida_m2 = Number((geomAreaB * props(idxA + 1).num_pisos * 0.7).toFixed(2));
  expectedIssues.push({
    id_predio: props(idxA + 1).id_predio,
    clave_catastral: props(idxA + 1).clave_catastral,
    codigo_regla: 'TOPO_CONTACTO_BORDE',
    descripcion: `Comparte borde con ${props(idxA).id_predio} sin superponerse (caso válido intencional; genera incidencia informativa, no error).`,
    predios_relacionados: [props(idxA).id_predio, props(idxA + 1).id_predio]
  });
}

// 10) Geometrías duplicadas (par 62/63): geometría exactamente igual
{
  features[63].geometry = JSON.parse(JSON.stringify(features[62].geometry));
  // mantener coherencia alfanumérica para que el único error del par sea la duplicidad
  props(63).area_terreno_m2 = props(62).area_terreno_m2;
  props(63).area_construida_m2 = props(62).area_construida_m2;
  addExpected(63, 'GEOM_DUPLICADA', `Geometría idéntica a ${props(62).id_predio} (error intencional).`, { predios_relacionados: [props(62).id_predio, props(63).id_predio] });
}

// ---------------------------------------------------------------------------
// Escritura de archivos
// ---------------------------------------------------------------------------

const geojson = {
  type: 'FeatureCollection',
  name: 'quito_predios_sinteticos',
  metadata: {
    descripcion: 'Predios catastrales sintéticos del Distrito Metropolitano de Quito con fines educativos y experimentales. No representan información oficial del Municipio del DMQ.',
    semilla: SEED,
    generador: 'scripts/generate-predios.mjs',
    sistema_referencia: 'WGS84 (RFC 7946), orden [longitud, latitud]',
    total_predios: features.length,
    errores_intencionales: 'Ver data/expected_issues.json'
  },
  features
};

const outGeo = join(ROOT, 'public', 'data', 'quito_predios_sinteticos.geojson');
mkdirSync(dirname(outGeo), { recursive: true });
writeFileSync(outGeo, JSON.stringify(geojson, null, 2));

const expected = {
  meta: {
    descripcion: 'Errores intencionales introducidos en el conjunto sintético. Este archivo es la referencia de generación: NO es una prueba independiente de que el validador sea correcto.',
    semilla: SEED,
    total_predios: features.length,
    aviso: 'Datos catastrales sintéticos con fines educativos y experimentales. No representan información oficial del Municipio del Distrito Metropolitano de Quito.'
  },
  notas: [
    'Los errores pueden coexistir en un mismo predio; cada coexistencia conocida está documentada en la descripción de la incidencia.',
    'Los predios autointersecados (moño) probablemente generen además SUP_FUERA_TOLERANCIA, porque el área geodésica de un anillo autointersecado difiere del lote rectangular previsto.',
    'El predio con area_terreno_m2 como cadena genera SUP_VALOR_INVALIDO además de ALFA_TIPO_DATO_INCORRECTO.',
    'Los pares superpuestos y la geometría duplicada pueden generar incidencias adicionales derivadas (p. ej. el par 62/63 se reporta solo como GEOM_DUPLICADA y no como solapamiento).',
    'El par que comparte borde (TOPO_CONTACTO_BORDE) es un caso topológicamente VÁLIDO: genera incidencia informativa, nunca un error.'
  ],
  incidencias_esperadas: expectedIssues
};

const outExp = join(ROOT, 'data', 'expected_issues.json');
mkdirSync(dirname(outExp), { recursive: true });
writeFileSync(outExp, JSON.stringify(expected, null, 2));

console.log(`Generados ${features.length} predios sintéticos → ${outGeo}`);
console.log(`Incidencias esperadas: ${expectedIssues.length} → ${outExp}`);
