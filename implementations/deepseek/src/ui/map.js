import maplibregl from 'maplibre-gl';
import { bboxOfGeometry, unionBboxes, isPlainObject } from '../core/geojson.js';
import { FIELD_LABELS } from '../core/constants.js';
import { formatNumber } from './format.js';
import { h } from './dom.js';

const EMPTY_FC = { type: 'FeatureCollection', features: [] };

const STATUS_COLORS = {
  error: '#dc2626',
  advertencia: '#d97706',
  correcto: '#16a34a'
};

const STATUS_LABELS = {
  error: 'Con errores',
  advertencia: 'Con advertencias',
  correcto: 'Sin errores comprobados'
};

const BASE_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© colaboradores de OpenStreetMap'
    }
  },
  layers: [
    {
      id: 'osm-base',
      type: 'raster',
      source: 'osm'
    }
  ]
};

const POPUP_FIELDS = [
  'clave_catastral',
  'sector',
  'manzana',
  'lote',
  'uso_suelo',
  'estado',
  'area_terreno_m2',
  'area_construida_m2',
  'numero_pisos',
  'anio_construccion',
  'avaluo_ficticio_usd',
  'direccion_ficticia'
];

function isRenderableFeature(feature) {
  if (!feature || feature.type !== 'Feature') return false;
  const geometry = feature.geometry;
  if (!geometry || !isPlainObject(geometry)) return false;
  if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') return false;
  return Array.isArray(geometry.coordinates);
}

function buildPopupContent(properties) {
  const status = properties.estado_calidad;
  const wrapper = h('div', { class: 'parcel-popup' }, [
    h('h3', { text: properties.id ?? 'Predio sin identificador' }),
    h('span', {
      class: `quality-pill quality-${status ?? 'correcto'}`,
      text: STATUS_LABELS[status] ?? 'Sin evaluar'
    })
  ]);

  const list = h('dl', { class: 'popup-attributes' });
  for (const field of POPUP_FIELDS) {
    const value = properties[field];
    if (value === null || value === undefined || value === '') continue;
    const label = FIELD_LABELS[field] ?? field;
    let display = value;
    if (field === 'area_terreno_m2' || field === 'area_construida_m2') {
      display = `${formatNumber(value)} m²`;
    } else if (field === 'avaluo_ficticio_usd') {
      display = `${formatNumber(value)} USD`;
    } else if (typeof value === 'number') {
      display = formatNumber(value);
    }
    list.append(h('dt', { text: label }), h('dd', { text: String(display) }));
  }
  wrapper.append(list);
  wrapper.append(
    h('p', {
      class: 'popup-note',
      text: 'Predio sintético de demostración. No es información catastral oficial.'
    })
  );
  return wrapper;
}

export function createParcelMap(container, options = {}) {
  const onStatus = options.onStatus ?? (() => {});
  const onParcelClick = options.onParcelClick ?? (() => {});

  const map = new maplibregl.Map({
    container,
    style: BASE_STYLE,
    center: [-78.48, -0.19],
    zoom: 11.2,
    minZoom: 8,
    maxZoom: 19,
    attributionControl: false
  });

  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
  map.addControl(new maplibregl.FullscreenControl(), 'top-right');
  map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');
  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

  const popup = new maplibregl.Popup({ maxWidth: '360px', closeButton: true, offset: 10 });

  let ready = false;
  let data = EMPTY_FC;
  let highlight = EMPTY_FC;
  let sector = 'TODOS';
  let pendingFit = false;
  let tileErrorReported = false;

  const source = () => map.getSource('predios');
  const highlightSource = () => map.getSource('seleccion');

  function applySectorFilter() {
    if (!ready) return;
    const filter = sector && sector !== 'TODOS' ? ['==', ['get', 'sector'], sector] : null;
    if (map.getLayer('predios-fill')) map.setFilter('predios-fill', filter);
    if (map.getLayer('predios-line')) map.setFilter('predios-line', filter);
  }

  function featureBbox(features) {
    return unionBboxes(
      features.filter(isRenderableFeature).map((feature) => bboxOfGeometry(feature.geometry))
    );
  }

  function fitBbox(box) {
    if (!box) return;
    let [minX, minY, maxX, maxY] = box;
    if (maxX - minX < 1e-6) {
      minX -= 0.005;
      maxX += 0.005;
    }
    if (maxY - minY < 1e-6) {
      minY -= 0.005;
      maxY += 0.005;
    }
    map.fitBounds(
      [
        [minX, minY],
        [maxX, maxY]
      ],
      { padding: 70, maxZoom: 15, duration: 700 }
    );
  }

  function fitToData() {
    fitBbox(featureBbox(data.features ?? []));
  }

  function fitToFeatures(features) {
    fitBbox(featureBbox(features ?? []));
  }

  function setData(geojson, { fit = false } = {}) {
    data = geojson ?? EMPTY_FC;
    if (ready && source()) {
      source().setData(data);
      applySectorFilter();
      if (fit) fitToData();
    } else {
      pendingFit = pendingFit || fit;
    }
    onStatus({ type: 'data', count: data.features?.length ?? 0 });
  }

  function setHighlight(features) {
    highlight = { type: 'FeatureCollection', features: (features ?? []).filter(isRenderableFeature) };
    if (ready && highlightSource()) {
      highlightSource().setData(highlight);
    }
  }

  function setSectorFilter(value) {
    sector = value ?? 'TODOS';
    applySectorFilter();
  }

  map.on('load', () => {
    map.addSource('predios', { type: 'geojson', data });
    map.addLayer({
      id: 'predios-fill',
      type: 'fill',
      source: 'predios',
      paint: {
        'fill-color': [
          'match',
          ['get', 'estado_calidad'],
          'error',
          STATUS_COLORS.error,
          'advertencia',
          STATUS_COLORS.advertencia,
          'correcto',
          STATUS_COLORS.correcto,
          '#64748b'
        ],
        'fill-opacity': 0.5
      }
    });
    map.addLayer({
      id: 'predios-line',
      type: 'line',
      source: 'predios',
      paint: {
        'line-color': [
          'match',
          ['get', 'estado_calidad'],
          'error',
          '#991b1b',
          'advertencia',
          '#92400e',
          'correcto',
          '#166534',
          '#475569'
        ],
        'line-width': 1.1,
        'line-opacity': 0.9
      }
    });

    map.addSource('seleccion', { type: 'geojson', data: highlight });
    map.addLayer({
      id: 'seleccion-fill',
      type: 'fill',
      source: 'seleccion',
      paint: {
        'fill-color': '#2563eb',
        'fill-opacity': 0.22
      }
    });
    map.addLayer({
      id: 'seleccion-line',
      type: 'line',
      source: 'seleccion',
      paint: {
        'line-color': '#1d4ed8',
        'line-width': 3
      }
    });

    ready = true;
    applySectorFilter();
    if (pendingFit) fitToData();
    pendingFit = false;
    onStatus({ type: 'ready', count: data.features?.length ?? 0 });
  });

  map.on('click', 'predios-fill', (event) => {
    const feature = event.features?.[0];
    if (!feature) return;
    const properties = feature.properties ?? {};
    popup.setLngLat(event.lngLat).setDOMContent(buildPopupContent(properties)).addTo(map);
    onParcelClick(properties, event.lngLat);
  });

  map.on('mouseenter', 'predios-fill', () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', 'predios-fill', () => {
    map.getCanvas().style.cursor = '';
  });

  map.on('error', (event) => {
    if (tileErrorReported) return;
    tileErrorReported = true;
    onStatus({
      type: 'tile-error',
      message: 'No se pudo cargar la cartografía base. Los predios siguen visibles sobre el fondo del mapa.'
    });
    if (options.onError) options.onError(event?.error ?? event);
  });

  return {
    map,
    setData,
    setHighlight,
    setSectorFilter,
    fitToData,
    fitToFeatures,
    resize: () => map.resize()
  };
}

export { EMPTY_FC, STATUS_LABELS };
