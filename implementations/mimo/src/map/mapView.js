/**
 * Visualización de mapa con MapLibre GL JS.
 * Este es el ÚNICO módulo que depende de MapLibre; el motor de evaluación no lo importa.
 * Cartografía base: OpenFreeMap (https://openfreemap.org), gratuita y sin claves.
 */
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const FALLBACK_STYLE = {
  version: 8,
  name: 'estilo-minimo-offline',
  sources: {},
  layers: [{ id: 'fondo', type: 'background', paint: { 'background-color': '#e8eef3' } }],
};

const COLORS = { error: '#e5484d', advertencia: '#f5a623', ok: '#30a46c' };

function featureBBox(geometry) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const walk = (coords) => {
    if (typeof coords[0] === 'number') {
      minX = Math.min(minX, coords[0]); maxX = Math.max(maxX, coords[0]);
      minY = Math.min(minY, coords[1]); maxY = Math.max(maxY, coords[1]);
      return;
    }
    coords.forEach(walk);
  };
  walk(geometry.coordinates);
  return [minX, minY, maxX, maxY];
}

export function createMapView(container) {
  const map = new maplibregl.Map({
    container,
    style: STYLE_URL,
    center: [-78.4965, -0.2048],
    zoom: 11.2,
    attributionControl: { compact: true },
  });
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'top-right');

  const pending = {
    features: null,
    sector: 'todos',
    highlightRef: null,
  };
  let popup = null;

  const applyPending = () => {
    if (!map.getSource('predios')) {
      const collection = pending.features
        ? { type: 'FeatureCollection', features: pending.features }
        : { type: 'FeatureCollection', features: [] };
      map.addSource('predios', { type: 'geojson', data: collection });
      map.addLayer({
        id: 'predios-fill',
        type: 'fill',
        source: 'predios',
        paint: {
          'fill-color': ['match', ['get', 'qc_status'], 'error', COLORS.error, 'advertencia', COLORS.advertencia, COLORS.ok],
          'fill-opacity': 0.35,
        },
      });
      map.addLayer({
        id: 'predios-line',
        type: 'line',
        source: 'predios',
        paint: {
          'line-color': ['match', ['get', 'qc_status'], 'error', COLORS.error, 'advertencia', COLORS.advertencia, COLORS.ok],
          'line-width': ['case', ['==', ['get', 'qc_ref'], pending.highlightRef], 3, 1.2],
        },
      });
      bindInteractions();
    } else {
      const source = map.getSource('predios');
      source.setData(pending.features ? { type: 'FeatureCollection', features: pending.features } : { type: 'FeatureCollection', features: [] });
    }
    applySectorFilter();
  };

  const applySectorFilter = () => {
    if (!map.getLayer('predios-fill')) return;
    const filter = pending.sector === 'todos' ? null : ['==', ['get', 'sector'], pending.sector];
    map.setFilter('predios-fill', filter);
    map.setFilter('predios-line', filter);
  };

  const bindInteractions = () => {
    map.on('mouseenter', 'predios-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'predios-fill', () => { map.getCanvas().style.cursor = ''; });
    map.on('click', 'predios-fill', (e) => {
      if (!e.features?.length) return;
      const f = e.features[0];
      showPopup(e.lngLat, f.properties);
    });
  };

  // Popup construido con API DOM (textContent): sin inyección HTML.
  function showPopup(lngLat, props) {
    popup?.remove();
    const div = document.createElement('div');
    div.className = 'popup';
    const h = document.createElement('h3');
    h.textContent = props.id_predio || 'Predio';
    div.appendChild(h);
    const dl = document.createElement('dl');
    const rows = [
      ['Clave catastral', props.clave_catastral],
      ['Sector', props.sector],
      ['Dirección', props.direccion],
      ['Área registrada (m²)', props.area_terreno_m2],
      ['Área geométrica (m²)', props.qc_geom_area],
      ['Diferencia (%)', props.qc_diff_pct],
      ['Pisos', props.pisos],
      ['Uso de suelo', props.uso_suelo],
      ['Estado', props.estado_predio],
      ['Incidencias', `${props.qc_errors ?? 0} error(es), ${props.qc_warnings ?? 0} advertencia(s)`],
    ];
    for (const [k, v] of rows) {
      if (v === undefined || v === null || v === '') continue;
      const dt = document.createElement('dt');
      dt.textContent = k;
      const dd = document.createElement('dd');
      dd.textContent = String(v);
      dl.append(dt, dd);
    }
    div.appendChild(dl);
    popup = new maplibregl.Popup({ maxWidth: '280px' }).setLngLat(lngLat).setDOMContent(div).addTo(map);
  }

  return {
    /** features ya enriquecidas con qc_status/qc_ref para simbología. */
    setParcels(features) {
      pending.features = features;
      if (map.isStyleLoaded()) applyPending();
      else map.once('load', applyPending);
    },
    setSector(sector) {
      pending.sector = sector;
      applySectorFilter();
    },
    highlightAndZoom(feature) {
      if (!feature?.geometry) return;
      popup?.remove();
      pending.highlightRef = feature.properties?.id_predio ?? null;
      if (map.getLayer('predios-line')) {
        map.setPaintProperty('predios-line', 'line-width',
          ['case', ['==', ['get', 'qc_ref'], pending.highlightRef], 3, 1.2]);
      }
      const [minX, minY, maxX, maxY] = featureBBox(feature.geometry);
      map.fitBounds([[minX, minY], [maxX, maxY]], { padding: 60, maxZoom: 16, duration: 800 });
    },
    destroy() {
      map.remove();
    },
  };
}
