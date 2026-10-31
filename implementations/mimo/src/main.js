/**
 * Controlador principal de la aplicación.
 * Integra: carga → motor de calidad (sin DOM) → mapa, tabla, indicadores y exportación.
 */
import './styles.css';
import { parseGeoJSONText, featureRef, MAX_FILE_BYTES } from './core/dataLoader.js';
import { evaluateDataset } from './core/engine.js';
import { incidentsToCSV, incidentsToJSON, summaryToJSON, downloadText } from './core/exporters.js';
import { SECTORS, AVISO_SINTETICO } from './config/constants.js';
import { renderRuleToggles, getEnabledRules } from './ui/controls.js';
import { renderIndicators } from './ui/indicatorsPanel.js';
import { renderIncidentsTable, populateRuleFilter } from './ui/incidentsTable.js';

const el = (id) => document.getElementById(id);

const state = {
  features: [],
  datasetName: '—',
  result: null,
  parseIncidents: [],
  mapView: null,
  filters: { search: '', severity: 'todas', rule: 'todas' },
};

const DEMO_URL = `${import.meta.env.BASE_URL}data/quito_predios_sinteticos.geojson`;

// ---------------------------------------------------------------------------
// Flujo de datos
// ---------------------------------------------------------------------------

async function loadDemo() {
  setStatus('Cargando datos de demostración…');
  try {
    const res = await fetch(DEMO_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    ingestText(text, 'datos de demostración');
  } catch (err) {
    setStatus(`No se pudieron cargar los datos de demostración: ${err.message}. Puede cargar un archivo GeoJSON manualmente.`);
  }
}

function ingestText(text, datasetName) {
  const parsed = parseGeoJSONText(text);
  state.parseIncidents = parsed.incidents;
  state.datasetName = datasetName;
  if (!parsed.ok) {
    // Se informan los problemas estructurales sin bloquear la aplicación.
    state.features = [];
    state.result = null;
    renderAll();
    setStatus(`El dataset "${datasetName}" no es evaluable. Revise las incidencias estructurales en la tabla.`);
    return;
  }
  state.features = parsed.features;
  runEvaluation();
}

function currentConfig() {
  return {
    surfaceTolerancePercent: Number(el('tolerance').value) || 5,
    enabledRules: getEnabledRules(el('rule-toggles')),
  };
}

function runEvaluation() {
  if (!state.features.length) {
    setStatus('No hay predios cargados para evaluar.');
    return;
  }
  setStatus(`Evaluando ${state.features.length} predios (${state.datasetName})…`);
  // El motor se ejecuta sin DOM ni MapLibre.
  state.result = evaluateDataset(state.features, currentConfig());
  renderAll();
  const ind = state.result.indicators;
  setStatus(`Evaluación completada: ${ind.total_predios} predios, ${ind.total_incidencias} incidencias `
    + `(${ind.incidencias_error} errores / ${ind.incidencias_advertencia} advertencias). `
    + `Tolerancia de superficie: ${state.result.config.surfaceTolerancePercent} %.`);
}

function renderAll() {
  const result = state.result;

  // Mapa: enriquecer features con estado de calidad para la simbología
  const statusByRef = new Map();
  if (result) {
    for (const fr of result.featureResults) {
      statusByRef.set(fr.ref, fr);
    }
  }
  const enriched = state.features.map((f, i) => {
    const ref = featureRef(f, i);
    const fr = statusByRef.get(ref);
    const status = fr ? (fr.hasError ? 'error' : fr.hasWarning ? 'advertencia' : 'ok') : 'ok';
    const metrics = fr?.metrics ?? {};
    return {
      ...f,
      properties: {
        ...f.properties,
        qc_ref: ref,
        qc_status: status,
        qc_errors: fr?.errorCount ?? 0,
        qc_warnings: fr?.warningCount ?? 0,
        qc_geom_area: metrics.geomAreaM2 != null ? metrics.geomAreaM2.toFixed(2) : null,
        qc_diff_pct: metrics.diffPct != null ? metrics.diffPct.toFixed(2) : null,
      },
    };
  });
  state.mapView?.setParcels(enriched);

  // Indicadores
  renderIndicators(el('indicators'), result?.indicators ?? null);

  // Incidencias del dataset + estructurales de la carga
  const allIncidents = [...state.parseIncidents, ...(result?.incidents ?? [])];
  populateRuleFilter(el('rule-filter'), allIncidents);
  renderFilteredTable(allIncidents);

  // No evaluados
  renderNotEvaluated(result);

  // Exportación habilitada solo con resultados
  for (const id of ['btn-csv', 'btn-json', 'btn-summary']) {
    el(id).disabled = !result;
  }

  el('dataset-info').textContent = state.features.length
    ? `${state.datasetName} · ${state.features.length} predios · ${AVISO_SINTETICO.slice(0, 60)}…`
    : '';
}

function renderFilteredTable(allIncidents) {
  const { search, severity, rule } = state.filters;
  const filtered = allIncidents.filter((inc) => {
    if (severity !== 'todas' && inc.severity !== severity) return false;
    if (rule !== 'todas' && inc.rule_code !== rule) return false;
    if (search && !(inc.feature_ref ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  renderIncidentsTable(el('incidents-body'), filtered, onSelectIncident);
}

function onSelectIncident(inc) {
  if (!inc.feature_ref || !state.mapView) return;
  const idx = state.features.findIndex((f, i) => featureRef(f, i) === inc.feature_ref);
  if (idx >= 0) state.mapView.highlightAndZoom(state.features[idx]);
}

function renderNotEvaluated(result) {
  const container = el('not-evaluated');
  container.textContent = '';
  const ul = document.createElement('ul');
  const items = [
    ...(result?.notEvaluated ?? []).map((n) =>
      `${n.rule_code}${n.feature_ref ? ` (${n.feature_ref})` : ''}: ${n.reason}`),
    ...(result?.notEvaluatedDimensions ?? []).map((d) =>
      `Dimensión "${d.dimension}" no evaluada: ${d.reason}`),
    ...(result ? [] : ['No hay corrida de evaluación: las reglas no se han ejecutado.']),
  ];
  if (!items.length) items.push('Todas las reglas habilitadas fueron evaluadas en esta corrida.');
  for (const text of items) {
    const li = document.createElement('li');
    li.textContent = text;
    ul.appendChild(li);
  }
  container.appendChild(ul);
}

function setStatus(text) {
  el('status').textContent = text;
}

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------

function populateSectorFilter() {
  const select = el('sector-filter');
  const sectores = new Set(SECTORS);
  select.textContent = '';
  const todos = document.createElement('option');
  todos.value = 'todos';
  todos.textContent = 'Todos';
  select.appendChild(todos);
  for (const s of sectores) {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    select.appendChild(opt);
  }
}

function wireEvents() {
  el('btn-demo').addEventListener('click', loadDemo);

  el('file-input').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setStatus(`El archivo supera el límite recomendado de ${MAX_FILE_BYTES / 1024 / 1024} MB.`);
      return;
    }
    try {
      const text = await file.text();
      ingestText(text, file.name);
    } catch (err) {
      setStatus(`No se pudo leer el archivo: ${err.message}`);
    }
  });

  el('btn-eval').addEventListener('click', runEvaluation);

  el('tolerance').addEventListener('change', () => {
    if (state.features.length) runEvaluation();
  });

  el('rule-toggles').addEventListener('change', () => {
    if (state.features.length) runEvaluation();
  });

  el('sector-filter').addEventListener('change', (e) => {
    state.mapView?.setSector(e.target.value);
  });

  el('search').addEventListener('input', (e) => {
    state.filters.search = e.target.value;
    applyFilters();
  });
  el('severity-filter').addEventListener('change', (e) => {
    state.filters.severity = e.target.value;
    applyFilters();
  });
  el('rule-filter').addEventListener('change', (e) => {
    state.filters.rule = e.target.value;
    applyFilters();
  });

  el('btn-csv').addEventListener('click', () => {
    if (!state.result) return;
    downloadText('incidencias_quito.csv', incidentsToCSV(state.result.incidents), 'text/csv;charset=utf-8');
  });
  el('btn-json').addEventListener('click', () => {
    if (!state.result) return;
    downloadText('incidencias_quito.json', incidentsToJSON(state.result.incidents));
  });
  el('btn-summary').addEventListener('click', () => {
    if (!state.result) return;
    downloadText('resumen_evaluacion_quito.json', summaryToJSON(state.result, state.datasetName));
  });
}

function applyFilters() {
  const allIncidents = [...state.parseIncidents, ...(state.result?.incidents ?? [])];
  renderFilteredTable(allIncidents);
}

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------

async function boot() {
  renderRuleToggles(el('rule-toggles'));
  populateSectorFilter();
  wireEvents();
  try {
    const { createMapView } = await import('./map/mapView.js');
    state.mapView = createMapView(el('map'));
  } catch (err) {
    setStatus(`El mapa no pudo inicializarse (${err.message}); el análisis de calidad sigue disponible.`);
  }
  await loadDemo();
}

boot();
