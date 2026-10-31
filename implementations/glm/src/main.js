/**
 * Punto de entrada de la aplicación. Orquesta carga de datos, evaluación,
 * mapa, tabla, filtros y exportación. La lógica de evaluación vive en
 * módulos independientes del DOM (ver src/modules/).
 */
import { runQualityAnalysis } from './modules/qualityEngine.js';
import { readGeoJsonFile } from './modules/fileLoader.js';
import { RULE_CATALOG, QUITO_CENTER } from './modules/config.js';
import {
  createMap, setPredios, setSectorFilter, focusPredio, clearHighlight,
  onPredioClick, showPopup, escapeHtml
} from './modules/map.js';
import {
  showMessage, renderIndicators, renderRulesList, populateRuleFilter,
  populateSectorSelect, renderIncidentsTable, getTableFilters
} from './modules/ui.js';
import {
  incidentsToCsv, incidentsToJson, summaryToJson, downloadTextFile
} from './modules/exporter.js';

const $ = (id) => document.getElementById(id);

const state = {
  map: null,
  features: [],
  incidents: [],
  result: null,
  tolerance: 0.05,
  enabledRules: new Set(RULE_CATALOG.filter((r) => r.configurable).map((r) => r.code))
};

/* ---------- Utilidades ---------- */

/** Construye el estado de calidad por predio a partir de las incidencias. */
function qualityByPredio(incidents) {
  const byId = new Map();
  for (const inc of incidents) {
    if (!inc.predio_id) continue;
    if (!byId.has(inc.predio_id)) byId.set(inc.predio_id, { worst: null, codes: new Set() });
    const entry = byId.get(inc.predio_id);
    entry.codes.add(inc.codigo_regla);
    if (inc.severidad === 'error') entry.worst = 'error';
    else if (inc.severidad === 'warning' && entry.worst !== 'error') entry.worst = 'warning';
    else if (inc.severidad === 'info' && !entry.worst) entry.worst = 'info';
  }
  return byId;
}

function featuresForMap(features, incidents) {
  const byId = qualityByPredio(incidents);
  return features.map((f) => ({
    ...f,
    properties: {
      ...f.properties,
      q_estado: byId.get(f.properties.id_predio)?.worst || 'ok'
    }
  }));
}

function popupHtml(feature, incidents) {
  const p = feature.properties || {};
  const byId = qualityByPredio(incidents);
  const entry = byId.get(p.id_predio);
  const rows = [
    ['Predio', p.id_predio],
    ['Clave catastral', p.clave_catastral],
    ['Sector', p.sector],
    ['Dirección', p.direccion],
    ['Área terreno (m²)', p.area_terreno_m2],
    ['Área construida (m²)', p.area_construida_m2],
    ['Nº pisos', p.num_pisos],
    ['Año construcción', p.ano_construccion],
    ['Uso de suelo', p.uso_suelo],
    ['Estado conservación', p.estado_conservacion]
  ];
  const tableRows = rows
    .map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v ?? '—')}</td></tr>`)
    .join('');
  const incidentsHtml = entry
    ? `<p><strong>Incidencias (${entry.codes.size}):</strong> ${escapeHtml([...entry.codes].join(', '))}</p>`
    : '<p>Sin incidencias registradas.</p>';
  return `<div><table class="popup-table">${tableRows}</table>${incidentsHtml}</div>`;
}

/* ---------- Flujo principal ---------- */

function runEvaluation() {
  if (!state.rawGeojson) {
    showMessage('No hay datos cargados. Carga un GeoJSON o los datos de demostración.', 'warning');
    return;
  }
  const result = runQualityAnalysis(state.rawGeojson, {
    tolerance: state.tolerance,
    enabledRules: state.enabledRules
  });
  state.result = result;
  state.incidents = result.incidents;
  state.features = result.features;

  renderIndicators(result.indicators);
  populateRuleFilter(result.incidents);

  const sectores = [...new Set(result.features.map((f) => f.properties.sector).filter(Boolean))].sort();
  populateSectorSelect(sectores);

  setPredios(state.map, featuresForMap(result.features, result.incidents));
  setSectorFilter(state.map, $('sector-select').value !== '__all__' ? $('sector-select').value : null);
  renderIncidentsTable(result.incidents, getTableFilters());

  if (result.structuralFatal) {
    showMessage('Los datos tienen problemas estructurales que impiden la evaluación completa (ver tabla de incidencias).', 'error');
  } else {
    const ind = result.indicators;
    showMessage(`Evaluación completada: ${ind.total_predios} predios, ${ind.total_incidencias} incidencias (${ind.pct_sin_errores.toFixed(1)} % sin errores comprobados).`, 'info');
    if (result.notEvaluatedRules.length > 0) {
      showMessage(`Reglas no evaluadas por falta de datos: ${result.notEvaluatedRules.join(', ')}`, 'warning');
    }
  }
}

async function loadDemoData() {
  try {
    const res = await fetch('data/quito_predios_sinteticos.geojson');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const geojson = await res.json();
    state.rawGeojson = geojson;
    showMessage(`Datos de demostración cargados: ${(geojson.features || []).length} predios sintéticos (no oficiales).`, 'info');
    runEvaluation();
  } catch (err) {
    showMessage(`No se pudieron cargar los datos de demostración: ${err.message}`, 'error');
  }
}

async function handleFileSelected(event) {
  const file = event.target.files && event.target.files[0];
  const parsed = await readGeoJsonFile(file);
  if (!parsed.ok) {
    showMessage(parsed.error, 'error');
    return;
  }
  try {
    const geojson = JSON.parse(parsed.text);
    state.rawGeojson = geojson;
    showMessage(`Archivo "${file.name}" leído. Ejecutando evaluación…`, 'info');
    runEvaluation();
  } catch {
    showMessage('El archivo no contiene JSON válido.', 'error');
  } finally {
    event.target.value = '';
  }
}

/* ---------- Exportación ---------- */

function exportCsv() {
  if (!state.result) { showMessage('Ejecuta primero una evaluación.', 'warning'); return; }
  downloadTextFile('incidencias_quito.csv', incidentsToCsv(state.incidents), 'text/csv');
  showMessage('Incidencias exportadas a CSV.', 'info');
}

function exportJson() {
  if (!state.result) { showMessage('Ejecuta primero una evaluación.', 'warning'); return; }
  downloadTextFile('incidencias_quito.json', incidentsToJson(state.incidents));
  showMessage('Incidencias exportadas a JSON.', 'info');
}

function exportSummary() {
  if (!state.result) { showMessage('Ejecuta primero una evaluación.', 'warning'); return; }
  downloadTextFile('resumen_evaluacion_quito.json', summaryToJson(state.result));
  showMessage('Resumen de evaluación exportado.', 'info');
}

/* ---------- Inicialización ---------- */

function init() {
  state.map = createMap($('map'));

  onPredioClick(state.map, (feature, lngLat) => {
    showPopup(state.map, lngLat, popupHtml(feature, state.incidents));
  });

  renderRulesList(state.enabledRules);
  renderIndicators(null);

  $('file-input').addEventListener('change', handleFileSelected);
  $('btn-demo').addEventListener('click', loadDemoData);
  $('btn-run').addEventListener('click', () => runEvaluation());
  $('btn-export-csv').addEventListener('click', exportCsv);
  $('btn-export-json').addEventListener('click', exportJson);
  $('btn-export-summary').addEventListener('click', exportSummary);

  $('tolerance-input').addEventListener('change', (e) => {
    const value = Number(e.target.value);
    if (Number.isFinite(value) && value >= 0 && value <= 100) {
      state.tolerance = value / 100;
      showMessage(`Tolerancia de superficie configurada en ${value} % (parámetro experimental).`, 'info');
    } else {
      e.target.value = 5;
      state.tolerance = 0.05;
      showMessage('Tolerancia inválida; se restauró 5 %.', 'warning');
    }
  });

  $('sector-select').addEventListener('change', (e) => {
    setSectorFilter(state.map, e.target.value !== '__all__' ? e.target.value : null);
  });

  for (const id of ['search-input', 'severity-filter', 'rule-filter']) {
    $(id).addEventListener('input', () => renderIncidentsTable(state.incidents, getTableFilters()));
  }

  $('incidents-tbody').addEventListener('incident-selected', (e) => {
    const inc = e.detail;
    const feature = state.features.find((f) => f.properties?.id_predio === inc.predio_id)
      || state.features.find((f) => (inc.predios_relacionados || []).includes(f.properties?.id_predio));
    if (feature) {
      focusPredio(state.map, feature);
    } else {
      clearHighlight(state.map);
    }
  });

  // Carga automática de los predios sintéticos al iniciarse
  loadDemoData();
}

// Centrar vista inicial (referencia; el mapa ya se crea centrado en Quito)
void QUITO_CENTER;

init();
