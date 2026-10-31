#!/usr/bin/env node
/**
 * Generador reproducible de predios catastrales sintéticos para Quito.
 *
 * - Semilla fija (SEED): mismos resultados en cada ejecución.
 * - Coordenadas WGS84 en orden [longitud, latitud] (RFC 7946).
 * - Sectores de demostración, NO límites administrativos oficiales.
 * - Los errores intencionales se documentan en data/expected_issues.json.
 *
 * Uso: npm run generate:data
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { area as turfArea, feature as turfFeature } from '@turf/turf';
import { SECTORS } from '../src/core/constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SEED = 20261031;
const COLS = 4;
const ROWS = 3;
const DISCLAIMER =
  'Datos catastrales sintéticos con fines educativos y experimentales. No representan información oficial del Municipio del Distrito Metropolitano de Quito.';

const SECTOR_CODES = {
  'Centro Histórico': 'CH',
  Iñaquito: 'IN',
  'La Carolina': 'LC',
  'La Mariscal': 'LM',
  Quitumbe: 'QT',
  Calderón: 'CA'
};

function mulberry32(seed) {
  let value = seed >>> 0;
  return function random() {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(SEED);
const range = (min, max) => min + random() * (max - min);
const round = (value, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

function metersToLon(meters, latitude) {
  return meters / (111320 * Math.cos((latitude * Math.PI) / 180));
}
function metersToLat(meters) {
  return meters / 111320;
}

function squareMeters(ring) {
  return turfArea(turfFeature({ type: 'Polygon', coordinates: [ring] }));
}

function makeRing(x0, y0, x1, y1) {
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
    [x0, y0]
  ];
}

function shiftRing(ring, dx, dy = 0) {
  return ring.map(([x, y]) => [x + dx, y + dy]);
}

function pickUso() {
  const r = random();
  if (r < 0.55) return 'RESIDENCIAL';
  if (r < 0.75) return 'COMERCIAL';
  if (r < 0.9) return 'MIXTO';
  return 'EQUIPAMIENTO';
}

function pickEstado() {
  const r = random();
  if (r < 0.85) return 'ACTIVO';
  if (r < 0.95) return 'INACTIVO';
  return 'EN_REVISION';
}

function buildParcels() {
  const parcels = [];
  let globalIndex = 0;

  for (const sector of SECTORS) {
    const sectorCode = SECTOR_CODES[sector.nombre];
    const widthMeters = Array.from({ length: COLS }, () => range(20, 28));
    const heightMeters = Array.from({ length: ROWS }, () => range(22, 30));
    const totalWidth = widthMeters.reduce((sum, value) => sum + value, 0);
    const totalHeight = heightMeters.reduce((sum, value) => sum + value, 0);

    const [centerLon, centerLat] = sector.centro;
    const startLon = centerLon - metersToLon(totalWidth / 2, centerLat);
    const startLat = centerLat - metersToLat(totalHeight / 2);
    const lonEdges = [startLon];
    for (const width of widthMeters) {
      lonEdges.push(lonEdges[lonEdges.length - 1] + metersToLon(width, centerLat));
    }
    const latEdges = [startLat];
    for (const height of heightMeters) {
      latEdges.push(latEdges[latEdges.length - 1] + metersToLat(height));
    }

    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const seq = row * COLS + col + 1;
        const ring = makeRing(
          lonEdges[col],
          latEdges[row],
          lonEdges[col + 1],
          latEdges[row + 1]
        );
        const geometry = { type: 'Polygon', coordinates: [ring] };
        const geometryArea = squareMeters(ring);
        const registeredArea = round(geometryArea * range(0.98, 1.02));
        const pisos = Math.floor(range(1, 6));
        const constructed = round(registeredArea * pisos * range(0.4, 0.7));

        const id = `QT-${sectorCode}-${String(seq).padStart(3, '0')}`;
        const properties = {
          id,
          clave_catastral: `DEMO-QT-${sectorCode}-${String(seq).padStart(4, '0')}`,
          sector: sector.nombre,
          manzana: `M${String(SECTORS.indexOf(sector) + 1).padStart(2, '0')}`,
          lote: `L${String(seq).padStart(2, '0')}`,
          direccion_ficticia: `Calle Demo ${100 + globalIndex}, ${sector.nombre}`,
          uso_suelo: pickUso(),
          estado: pickEstado(),
          area_terreno_m2: registeredArea,
          area_construida_m2: constructed,
          numero_pisos: pisos,
          anio_construccion: Math.floor(range(1950, 2025)),
          avaluo_ficticio_usd: Math.round(registeredArea * range(120, 320)),
          fuente: 'SINTETICO'
        };

        parcels.push({
          index: globalIndex,
          sector: sector.nombre,
          seq,
          ring,
          widthDeg: lonEdges[col + 1] - lonEdges[col],
          heightDeg: latEdges[row + 1] - latEdges[row],
          properties,
          geometry,
          feature: {
            type: 'Feature',
            id,
            properties,
            geometry
          }
        });
        globalIndex += 1;
      }
    }
  }
  return parcels;
}

function main() {
  const parcels = buildParcels();
  const byIndex = (index) => parcels[index];
  const idOf = (index) => byIndex(index).properties.id;
  const terreno = (index) => byIndex(index).properties.area_terreno_m2;

  const defects = {
    claves_catastrales_duplicadas: [],
    campos_obligatorios_nulos: [],
    superficies_negativas: [],
    tipos_de_datos_incorrectos: [],
    superposiciones: [],
    autointersecciones: [],
    diferencias_superficie: [],
    valores_fuera_de_dominio: [],
    inconsistencias_area_construida: []
  };

  // 1) Tres predios con la misma clave catastral ficticia.
  const duplicateKey = 'DEMO-QT-DUP-0001';
  const duplicated = [10, 25, 40];
  for (const index of duplicated) {
    byIndex(index).properties.clave_catastral = duplicateKey;
  }
  defects.claves_catastrales_duplicadas.push({
    predios: duplicated.map(idOf),
    campo: 'clave_catastral',
    valor: duplicateKey,
    reglas_esperadas: ['ALF-002']
  });

  // 2) Tres campos obligatorios nulos.
  const nullCases = [
    { index: 15, campo: 'clave_catastral' },
    { index: 30, campo: 'uso_suelo' },
    { index: 45, campo: 'area_terreno_m2' }
  ];
  for (const item of nullCases) {
    byIndex(item.index).properties[item.campo] = null;
    defects.campos_obligatorios_nulos.push({
      predio: idOf(item.index),
      campo: item.campo,
      reglas_esperadas:
        item.campo === 'area_terreno_m2' ? ['ALF-003', 'SUP-003'] : ['ALF-003']
    });
  }

  // 3) Dos superficies negativas.
  for (const [index, value] of [
    [20, -450.25],
    [50, -180.5]
  ]) {
    byIndex(index).properties.area_terreno_m2 = value;
    defects.superficies_negativas.push({
      predio: idOf(index),
      campo: 'area_terreno_m2',
      valor: value,
      reglas_esperadas: ['ALF-005', 'SUP-003']
    });
  }

  // 4) Dos tipos de datos incorrectos.
  byIndex(5).properties.area_terreno_m2 = '520.40';
  defects.tipos_de_datos_incorrectos.push({
    predio: idOf(5),
    campo: 'area_terreno_m2',
    valor: '520.40',
    tipo: 'string',
    reglas_esperadas: ['ALF-004', 'SUP-003']
  });
  byIndex(60).properties.numero_pisos = '4';
  defects.tipos_de_datos_incorrectos.push({
    predio: idOf(60),
    campo: 'numero_pisos',
    valor: '4',
    tipo: 'string',
    reglas_esperadas: ['ALF-004']
  });

  // 5) Dos pares de predios superpuestos (desplazamiento de una parcela).
  for (const [first, second] of [
    [0, 1],
    [12, 13]
  ]) {
    const target = byIndex(second);
    const dx = -0.55 * target.widthDeg;
    target.ring = shiftRing(target.ring, dx);
    target.feature.geometry = { type: 'Polygon', coordinates: [target.ring] };
    defects.superposiciones.push({
      predios: [idOf(first), idOf(second)],
      area_aproximada_m2: round(
        Math.min(0.55 * squareMeters(byIndex(first).ring), squareMeters(target.ring))
      ),
      reglas_esperadas: ['GEO-007']
    });
  }

  // 6) Dos polígonos autointersectados (cuadrilátero cruzado).
  for (const index of [35, 55]) {
    const parcel = byIndex(index);
    const xs = parcel.ring.map((position) => position[0]);
    const ys = parcel.ring.map((position) => position[1]);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    const width = x1 - x0;
    const height = y1 - y0;
    const crossed = [
      [x0, y0],
      [x0 + 0.6 * width, y0 + 0.7 * height],
      [x0, y0 + 0.7 * height],
      [x0 + width, y0],
      [x0, y0]
    ];
    parcel.ring = crossed;
    parcel.feature.geometry = { type: 'Polygon', coordinates: [crossed] };
    const crossedArea = squareMeters(crossed);
    parcel.properties.area_terreno_m2 = round(crossedArea * range(0.99, 1.01));
    parcel.properties.area_construida_m2 = round(
      parcel.properties.area_terreno_m2 *
        parcel.properties.numero_pisos *
        range(0.4, 0.7)
    );
    parcel.properties.avaluo_ficticio_usd = Math.round(
      parcel.properties.area_terreno_m2 * range(120, 320)
    );
    defects.autointersecciones.push({
      predio: idOf(index),
      reglas_esperadas: ['GEO-004'],
      nota: 'La superficie registrada se recalculó sobre la geometría cruzada para aislar el defecto de autointersección.'
    });
  }

  // 7) Tres diferencias de superficie superiores al 5 %.
  for (const [index, factor] of [
    [3, 1.12],
    [24, 0.88],
    [44, 1.1]
  ]) {
    const geometryArea = squareMeters(byIndex(index).ring);
    byIndex(index).properties.area_terreno_m2 = round(geometryArea * factor);
    defects.diferencias_superficie.push({
      predio: idOf(index),
      factor,
      diferencia_porcentual_aproximada: round(Math.abs(factor - 1) * 100),
      reglas_esperadas: ['SUP-001']
    });
  }

  // 8) Dos valores fuera de dominio.
  byIndex(17).properties.uso_suelo = 'ESPACIAL';
  defects.valores_fuera_de_dominio.push({
    predio: idOf(17),
    campo: 'uso_suelo',
    valor: 'ESPACIAL',
    reglas_esperadas: ['ALF-007']
  });
  byIndex(47).properties.estado = 'DESCONOCIDO';
  defects.valores_fuera_de_dominio.push({
    predio: idOf(47),
    campo: 'estado',
    valor: 'DESCONOCIDO',
    reglas_esperadas: ['ALF-007']
  });

  // 9) Dos inconsistencias área construida / número de pisos (advertencias).
  for (const [index, factor] of [
    [34, 1.6],
    [58, 1.7]
  ]) {
    const props = byIndex(index).properties;
    props.area_construida_m2 = round(props.area_terreno_m2 * props.numero_pisos * factor);
    defects.inconsistencias_area_construida.push({
      predio: idOf(index),
      factor_edificabilidad: factor,
      reglas_esperadas: ['ALF-008']
    });
  }

  const collection = {
    type: 'FeatureCollection',
    name: 'quito_predios_sinteticos',
    description:
      'Predios catastrales sintéticos de demostración para seis sectores aproximados de Quito. No son datos oficiales.',
    generador: 'scripts/generate-data.mjs',
    semilla: SEED,
    aviso: DISCLAIMER,
    features: parcels.map((parcel) => parcel.feature)
  };

  const touched = new Set([
    ...duplicated,
    ...nullCases.map((item) => item.index),
    20,
    50,
    5,
    60,
    0,
    1,
    12,
    13,
    35,
    55,
    3,
    24,
    44,
    17,
    47,
    34,
    58
  ]);

  const correctParcels = parcels
    .filter((parcel) => !touched.has(parcel.index))
    .map((parcel) => parcel.properties.id);

  const expected = {
    dataset: 'public/data/quito_predios_sinteticos.geojson',
    semilla: SEED,
    total_predios: parcels.length,
    sectores: SECTORS.map((sector) => ({
      nombre: sector.nombre,
      predios: parcels.filter((parcel) => parcel.sector === sector.nombre).length
    })),
    aviso: DISCLAIMER,
    nota:
      'Archivo de referencia de generación, no una prueba independiente del validador. Los errores pueden coexistir en un mismo predio; las reglas esperadas por defecto se listan en cada entrada. Las reglas se comprueban de forma independiente en tests/dataset.test.js.',
    errores_intencionales: defects,
    casos_correctos: {
      par_comparte_borde: {
        predios: [idOf(6), idOf(7)],
        relacion_esperada: 'borde compartido sin superposición',
        reglas_que_no_deben_aparecer: ['GEO-007']
      },
      predios_sin_errores_esperados: correctParcels
    },
    coexistencia: [
      'Los predios con tipo de dato incorrecto en area_terreno_m2 no pueden evaluarse en superficie; se espera ALF-004 y SUP-003.',
      'Los predios con superficie negativa no pueden compararse porcentualmente; se espera ALF-005 y SUP-003.',
      'Los predios con superficie nula producen ALF-003 y SUP-003.',
      'Los polígonos autointersectados conservan su superficie registrada coherente con el área calculable para aislar GEO-004 de SUP-001.',
      'Una geometría duplicada, si existiera, también produciría GEO-007 por superposición total; en este conjunto no se inyectaron duplicados geométricos.'
    ]
  };

  return { collection, expected, parcels, touched };
}

const { collection, expected } = main();

const dataDir = path.join(ROOT, 'public', 'data');
const expectedDir = path.join(ROOT, 'data');
await mkdir(dataDir, { recursive: true });
await mkdir(expectedDir, { recursive: true });

const geojsonPath = path.join(dataDir, 'quito_predios_sinteticos.geojson');
const expectedPath = path.join(expectedDir, 'expected_issues.json');

await writeFile(geojsonPath, `${JSON.stringify(collection, null, 2)}\n`, 'utf8');
await writeFile(expectedPath, `${JSON.stringify(expected, null, 2)}\n`, 'utf8');

console.log(`Generados ${collection.features.length} predios sintéticos (semilla ${SEED}).`);
console.log(`GeoJSON: ${path.relative(ROOT, geojsonPath)}`);
console.log(`Referencia de errores: ${path.relative(ROOT, expectedPath)}`);
console.log(`Predios sin errores esperados: ${expected.casos_correctos.predios_sin_errores_esperados.length}`);
