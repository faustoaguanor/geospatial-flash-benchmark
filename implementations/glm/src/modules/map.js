/**
 * Visualización del mapa con MapLibre GL JS.
 * Cartografía base gratuita (tiles ráster de OpenStreetMap, sin claves).
 * Los popups se construyen con escape de HTML para evitar inyección.
 */
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { QUITO_CENTER, QUITO_ZOOM } from './config.js';

const LAYER_FILL = 'predios-fill';
const LAYER_LINE = 'predios-line';
const LAYER_HIGHLIGHT = 'predios-highlight';
const SOURCE = 'predios';
const SOURCE_HL = 'predios-highlight-src';

export function createMap(container) {
  const map = new maplibregl.Map({
    container,
    style: {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© Colaboradores de OpenStreetMap'
        }
      },
      layers: [{ id: 'osm-tiles', type: 'raster', source: 'osm' }]
    },
    center: QUITO_CENTER,
    zoom: QUITO_ZOOM
  });
  map.addControl(new maplibregl.NavigationControl(), 'top-right');
  map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
  return map;
}

/** Añade (una sola vez) las capas de predios sobre el mapa. */
export function ensureLayers(map) {
  if (map.getSource(SOURCE)) return;
  map.addSource(SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({
    id: LAYER_FILL,
    type: 'fill',
    source: SOURCE,
    paint: {
      'fill-color': [
        'match', ['get', 'q_estado'],
        'error', '#c9302c',
        'warning', '#d98c0b',
        '#2e9e5b'
      ],
      'fill-opacity': 0.45
    }
  });
  map.addLayer({
    id: LAYER_LINE,
    type: 'line',
    source: SOURCE,
    paint: {
      'line-color': [
        'match', ['get', 'q_estado'],
        'error', '#8f1f1c',
        'warning', '#9a6206',
        '#1d6b3c'
      ],
      'line-width': 1.2
    }
  });
  map.addSource(SOURCE_HL, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({
    id: LAYER_HIGHLIGHT,
    type: 'line',
    source: SOURCE_HL,
    paint: { 'line-color': '#0b6bcb', 'line-width': 3 }
  });
}

/** Reemplaza los predios mostrados (features con propiedad q_estado). */
export function setPredios(map, features) {
  ensureLayers(map);
  map.getSource(SOURCE).setData({ type: 'FeatureCollection', features });
}

/** Filtra por sector (nombre de sector o null para todos). */
export function setSectorFilter(map, sectorNombre) {
  const filter = sectorNombre
    ? ['==', ['get', 'sector'], sectorNombre]
    : ['all'];
  if (map.getLayer(LAYER_FILL)) map.setFilter(LAYER_FILL, filter);
  if (map.getLayer(LAYER_LINE)) map.setFilter(LAYER_LINE, filter);
}

/** Resalta un predio y centra el mapa en él. */
export function focusPredio(map, feature) {
  ensureLayers(map);
  map.getSource(SOURCE_HL).setData({ type: 'FeatureCollection', features: [feature] });
  const bbox = boundsOf(feature);
  if (bbox) {
    map.fitBounds(bbox, { padding: 80, maxZoom: 18, duration: 600 });
  }
}

export function clearHighlight(map) {
  if (map.getSource(SOURCE_HL)) {
    map.getSource(SOURCE_HL).setData({ type: 'FeatureCollection', features: [] });
  }
}

/** Registra el comportamiento de clic sobre un predio (popup). */
export function onPredioClick(map, handler) {
  map.on('click', LAYER_FILL, (e) => {
    const feature = e.features && e.features[0];
    if (feature) handler(feature, e.lngLat);
  });
  // cursor pointer
  map.on('mouseenter', LAYER_FILL, () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', LAYER_FILL, () => { map.getCanvas().style.cursor = ''; });
}

/** Muestra un popup con una tabla de atributos (valores escapados). */
export function showPopup(map, lngLat, html) {
  new maplibregl.Popup({ closeButton: true, maxWidth: '300px' })
    .setLngLat(lngLat)
    .setHTML(html)
    .addTo(map);
}

/** Escapa texto para interpolarlo en HTML de forma segura. */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function boundsOf(feature) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const walk = (node) => {
    if (!Array.isArray(node)) return;
    if (node.length >= 2 && typeof node[0] === 'number' && typeof node[1] === 'number') {
      if (node[0] < minX) minX = node[0];
      if (node[0] > maxX) maxX = node[0];
      if (node[1] < minY) minY = node[1];
      if (node[1] > maxY) maxY = node[1];
      return;
    }
    node.forEach(walk);
  };
  walk(feature.geometry?.coordinates);
  if (minX === Infinity) return null;
  return [[minX, minY], [maxX, maxY]];
}
