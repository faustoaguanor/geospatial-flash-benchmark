import {
  DEFAULT_SURFACE_TOLERANCE_PCT,
  QUALITY_DIMENSIONS,
  RULES,
  SECTORS,
  SEVERITIES,
  TOGGLEABLE_RULES
} from '../core/constants.js';
import { evaluateGeoJSONText, normalizeTolerance } from '../core/engine.js';
import {
  datedFilename,
  downloadText,
  issuesToCSV,
  issuesToJSON,
  summaryToJSON
} from '../core/export.js';
import { isPlainObject, resolvePredioId } from '../core/geojson.js';
import { clear, h } from './dom.js';
import { createParcelMap } from './map.js';
import {
  dimensionLabel,
  formatDate,
  formatNumber,
  formatPercent,
  severityLabel
} from './format.js';

const RULE_MAP = new Map(RULES.map((rule) => [rule.code, rule]));
const MAX_RENDERED_ROWS = 500;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

const state = {
  text: '',
  datasetName: 'quito_predios_sinteticos.geojson',
  collection: null,
  parcelIndex: new Map(),
  result: null,
  issues: [],
  filteredIssues: [],
  displayFeatures: [],
  enabledRules: Object.fromEntries(TOGGLEABLE_RULES.map((rule) => [rule.code, true])),
  tolerance: DEFAULT_SURFACE_TOLERANCE_PCT,
  sector: 'TODOS',
  search: '',
  severity: 'todas',
  rule: 'todas',
  selectedIssueIds: new Set(),
  tileError: null
};

let mapApi = null;
let evaluationChain = Promise.resolve();
let evalTimer = null;
let toastTimer = null;

const $ = (id) => document.getElementById(id);

function ui() {
  return {
    demoButton: $('reload-demo'),
    evaluateButton: $('evaluate-btn'),
    fileInput: $('file-input'),
    toleranceInput: $('tolerance-input'),
    sourceLabel: $('source-label'),
    datasetBadge: $('dataset-badge'),
    runMeta: $('run-meta'),
    rulesList: $('rules-list'),
    rulesCount: $('rules-count'),
    rulesAll: $('rules-all'),
    rulesNone: $('rules-none'),
    indicators: $('indicators'),
    notEvaluatedList: $('not-evaluated-list'),
    notEvaluatedCount: $('not-evaluated-count'),
    sectorSelect: $('sector-select'),
    fitAll: $('fit-all'),
    mapStatus: $('map-status'),
    searchInput: $('search-input'),
    severityFilter: $('severity-filter'),
    ruleFilter: $('rule-filter'),
    selectAll: $('select-all'),
    clearSelection: $('clear-selection'),
    locateSelected: $('locate-selected'),
    selectionCount: $('selection-count'),
    issuesBody: $('issues-body'),
    issuesCount: $('issues-count'),
    tableNote: $('table-note'),
    exportCsv: $('export-csv'),
    exportJson: $('export-json'),
    exportSummary: $('export-summary'),
    toast: $('toast')
  };
}

const dom = ui();

function showToast(message, type = 'info', duration = 4200) {
  if (!dom.toast) return;
  dom.toast.textContent = message;
  dom.toast.className = `toast visible ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    dom.toast.className = 'toast';
  }, duration);
}

function setMapStatus(message, tone = '') {
  if (!dom.mapStatus) return;
  dom.mapStatus.textContent = message;
  dom.mapStatus.className = `map-status ${tone}`.trim();
}

function hasAtLeastOnePosition(geometry) {
  const polygons =
    geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  if (!Array.isArray(polygons)) return false;
  return polygons.some(
    (rings) =>
      Array.isArray(rings) &&
      rings.some((ring) => Array.isArray(ring) && ring.length > 0)
  );
}

function isRenderable(feature) {
  if (!isPlainObject(feature) || feature.type !== 'Feature') return false;
  const geometry = feature.geometry;
  return (
    isPlainObject(geometry) &&
    (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') &&
    Array.isArray(geometry.coordinates) &&
    hasAtLeastOnePosition(geometry)
  );
}

function buildParcelIndex(collection) {
  const index = new Map();
  if (!collection || !Array.isArray(collection.features)) return index;
  collection.features.forEach((feature, position) => {
    if (!isPlainObject(feature) || feature.type !== 'Feature') return;
    if (!isPlainObject(feature.properties)) return;
    if (!isRenderable(feature)) return;
    const id = resolvePredioId(feature, position);
    if (!index.has(id)) index.set(id, []);
    index.get(id).push(feature);
  });
  return index;
}

function buildDisplayCollection(collection, result) {
  const features = [];
  if (!collection || !Array.isArray(collection.features) || !result) {
    return { type: 'FeatureCollection', features };
  }

  const errorIds = new Set();
  const warningIds = new Set();
  for (const issue of result.issues) {
    if (!issue.predioId) continue;
    if (issue.severidad === 'error') errorIds.add(issue.predioId);
    else if (issue.severidad === 'advertencia') warningIds.add(issue.predioId);
  }

  collection.features.forEach((feature, position) => {
    if (!isRenderable(feature)) return;
    if (!isPlainObject(feature.properties)) return;
    const id = resolvePredioId(feature, position);
    const estadoCalidad = errorIds.has(id)
      ? 'error'
      : warningIds.has(id)
        ? 'advertencia'
        : 'correcto';
    features.push({
      type: 'Feature',
      properties: { ...feature.properties, estado_calidad: estadoCalidad },
      geometry: feature.geometry
    });
  });

  return { type: 'FeatureCollection', features };
}

function populateStaticControls() {
  if (dom.sectorSelect) {
    dom.sectorSelect.append(h('option', { value: 'TODOS', selected: true }, 'Todos los sectores'));
    for (const sector of SECTORS) {
      dom.sectorSelect.append(h('option', { value: sector.nombre }, sector.nombre));
    }
  }

  if (dom.severityFilter) {
    dom.severityFilter.append(h('option', { value: 'todas', selected: true }, 'Todas las severidades'));
    for (const [value, label] of Object.entries(SEVERITIES)) {
      dom.severityFilter.append(h('option', { value }, label));
    }
  }

  if (dom.ruleFilter) {
    dom.ruleFilter.append(h('option', { value: 'todas', selected: true }, 'Todas las reglas'));
    for (const rule of RULES.filter((item) => item.evaluable).sort((a, b) => a.code.localeCompare(b.code))) {
      dom.ruleFilter.append(h('option', { value: rule.code }, `${rule.code} · ${rule.nombre}`));
    }
  }

  if (dom.toleranceInput) dom.toleranceInput.value = String(state.tolerance);
}

function renderRulesList() {
  if (!dom.rulesList) return;
  clear(dom.rulesList);

  const byDimension = new Map();
  for (const rule of TOGGLEABLE_RULES) {
    if (!byDimension.has(rule.dimension)) byDimension.set(rule.dimension, []);
    byDimension.get(rule.dimension).push(rule);
  }

  for (const [dimension, rules] of byDimension) {
    const group = h('div', { class: 'rule-group' }, [
      h('h4', { class: 'rule-group-title', text: QUALITY_DIMENSIONS[dimension] ?? dimension })
    ]);
    for (const rule of rules.sort((a, b) => a.code.localeCompare(b.code))) {
      const checkbox = h('input', {
        type: 'checkbox',
        checked: state.enabledRules[rule.code] !== false,
        dataset: { rule: rule.code },
        'aria-label': `${rule.code}: ${rule.nombre}`
      });
      group.append(
        h('label', { class: 'rule-toggle' }, [
          checkbox,
          h('span', { class: 'rule-code', text: rule.code }),
          h('span', { class: 'rule-name', text: rule.nombre }),
          h('span', {
            class: `severity-dot severity-${rule.severidad}`,
            title: severityLabel(rule.severidad)
          })
        ])
      );
    }
    dom.rulesList.append(group);
  }

  dom.rulesList.append(
    h('p', {
      class: 'hint rules-note',
      text: 'Las reglas estructurales (STR-*) están siempre activas. Las reglas REF-* no son evaluables con datos sintéticos y se informan como no evaluadas.'
    })
  );
  updateRulesSummary();
}

function updateRulesSummary() {
  if (!dom.rulesCount) return;
  const active = TOGGLEABLE_RULES.filter((rule) => state.enabledRules[rule.code] !== false).length;
  dom.rulesCount.textContent = `${active} de ${TOGGLEABLE_RULES.length} activas`;
}

function syncRuleCheckboxes() {
  if (!dom.rulesList) return;
  for (const checkbox of dom.rulesList.querySelectorAll('input[data-rule]')) {
    checkbox.checked = state.enabledRules[checkbox.dataset.rule] !== false;
  }
}

function renderIndicators() {
  if (!dom.indicators) return;
  clear(dom.indicators);
  const ind = state.result?.indicators;

  const cards = ind
    ? [
        {
          label: 'Total de predios',
          value: formatNumber(ind.totalPredios),
          hint: `${formatNumber(ind.totalEntidades)} entidades en el archivo`
        },
        {
          label: 'Predios sin errores',
          value: formatNumber(ind.prediosSinErrores),
          tone: 'ok',
          hint: 'Sin incidencias de severidad error'
        },
        {
          label: 'Predios con errores',
          value: formatNumber(ind.prediosConErrores),
          tone: 'error',
          hint: 'Al menos una incidencia de severidad error'
        },
        {
          label: 'Predios con advertencias',
          value: formatNumber(ind.prediosConAdvertencias),
          tone: 'warn',
          hint: 'Puede incluir predios que también tienen errores'
        },
        {
          label: 'Total de incidencias',
          value: formatNumber(ind.totalIncidencias),
          hint: `${formatNumber(ind.incidenciasError)} errores · ${formatNumber(ind.incidenciasAdvertencia)} advertencias`
        },
        {
          label: '% de predios sin errores',
          value: formatPercent(ind.porcentajePrediosSinErrores),
          tone: 'ok',
          hint: 'Sobre predios evaluables'
        }
      ]
    : [
        { label: 'Total de predios', value: '—' },
        { label: 'Predios sin errores', value: '—' },
        { label: 'Predios con errores', value: '—' },
        { label: 'Predios con advertencias', value: '—' },
        { label: 'Total de incidencias', value: '—' },
        { label: '% de predios sin errores', value: '—' }
      ];

  for (const card of cards) {
    dom.indicators.append(
      h('div', { class: `indicator-card ${card.tone ?? ''}`.trim(), title: card.hint ?? '' }, [
        h('span', { class: 'indicator-value', text: card.value }),
        h('span', { class: 'indicator-label', text: card.label })
      ])
    );
  }
}

function renderRunMeta() {
  if (!dom.runMeta) return;
  if (!state.result) {
    dom.runMeta.textContent = 'Sin evaluación. Cargue datos o pulse «Ejecutar evaluación».';
    return;
  }
  const { meta, structural, topology } = state.result;
  const parts = [
    formatDate(meta.generadoEn),
    `${formatNumber(structural.totalEntidades)} entidades`,
    `${formatNumber(structural.prediosEvaluables)} predios evaluables`,
    `tolerancia ${formatNumber(meta.toleranciaSuperficiePct)} %`,
    `${formatNumber(topology.pairsChecked)} pares topológicos`
  ];
  if (structural.entidadesOmitidas > 0) {
    parts.push(`${formatNumber(structural.entidadesOmitidas)} entidades omitidas por estructura inválida`);
  }
  dom.runMeta.textContent = parts.join(' · ');
}

function renderSource() {
  if (dom.sourceLabel) {
    if (!state.result) {
      dom.sourceLabel.textContent = `Fuente: ${state.datasetName}`;
    } else if (state.result.meta.errorDeCarga) {
      dom.sourceLabel.textContent = `Fuente: ${state.datasetName} · no se pudo interpretar el JSON`;
    } else {
      dom.sourceLabel.textContent = `Fuente: ${state.datasetName} · ${formatNumber(
        state.result.structural.totalEntidades
      )} entidades · ${formatNumber(state.result.structural.prediosEvaluables)} predios evaluables`;
    }
  }
  if (dom.datasetBadge) {
    if (!state.result) {
      dom.datasetBadge.textContent = 'Sin evaluación';
    } else {
      dom.datasetBadge.textContent = `${formatNumber(
        state.result.indicators.totalPredios
      )} predios evaluados · datos sintéticos`;
    }
  }
}

function renderNotEvaluated() {
  if (!dom.notEvaluatedList || !dom.notEvaluatedCount) return;
  clear(dom.notEvaluatedList);
  const entries = state.result?.notEvaluated ?? [];
  dom.notEvaluatedCount.textContent = String(entries.length);

  if (entries.length === 0) {
    dom.notEvaluatedList.append(h('li', { class: 'hint' }, 'No hay reglas no evaluadas.'));
    return;
  }

  for (const entry of entries) {
    dom.notEvaluatedList.append(
      h('li', {}, [
        h('div', { class: 'not-evaluated-head' }, [
          h('span', { class: 'rule-code', text: entry.codigoRegla }),
          h('span', { class: 'not-evaluated-name', text: entry.nombre })
        ]),
        h('p', { class: 'not-evaluated-reason', text: entry.motivo }),
        h('span', { class: 'dimension-tag', text: dimensionLabel(entry.dimension) })
      ])
    );
  }
}

function normalizeSearch(value) {
  return String(value ?? '').trim().toLowerCase();
}

function computeFilteredIssues() {
  const query = normalizeSearch(state.search);
  return state.issues.filter((issue) => {
    if (state.severity !== 'todas' && issue.severidad !== state.severity) return false;
    if (state.rule !== 'todas' && issue.codigoRegla !== state.rule) return false;
    if (query) {
      const predio = String(issue.predioId ?? '').toLowerCase();
      const id = String(issue.id ?? '').toLowerCase();
      if (!predio.includes(query) && !id.includes(query)) return false;
    }
    return true;
  });
}

function updateSelectionSummary() {
  if (dom.selectionCount) {
    dom.selectionCount.textContent = `${state.selectedIssueIds.size} seleccionada(s)`;
  }
  if (dom.selectAll) {
    const filtered = state.filteredIssues;
    const selectedVisible = filtered.filter((issue) => state.selectedIssueIds.has(issue.id)).length;
    if (filtered.length === 0) {
      dom.selectAll.checked = false;
      dom.selectAll.indeterminate = false;
    } else if (selectedVisible === 0) {
      dom.selectAll.checked = false;
      dom.selectAll.indeterminate = false;
    } else if (selectedVisible === filtered.length) {
      dom.selectAll.checked = true;
      dom.selectAll.indeterminate = false;
    } else {
      dom.selectAll.checked = false;
      dom.selectAll.indeterminate = true;
    }
  }
}

function makeSeverityBadge(severity) {
  return h('span', {
    class: `severity-badge severity-${severity}`,
    text: severityLabel(severity)
  });
}

function makeRuleCell(issue) {
  const rule = RULE_MAP.get(issue.codigoRegla);
  return h('div', { class: 'rule-cell', title: rule?.descripcion ?? '' }, [
    h('span', { class: 'rule-code', text: issue.codigoRegla }),
    h('span', { class: 'rule-cell-name', text: rule?.nombre ?? issue.codigoRegla })
  ]);
}

function locateFeatures(predioIds, successMessage) {
  if (!mapApi) {
    showToast('El mapa no está disponible en este navegador.', 'error');
    return;
  }
  const features = [];
  const missing = [];
  for (const id of predioIds) {
    const matches = state.parcelIndex.get(id) ?? [];
    if (matches.length === 0) {
      if (id) missing.push(id);
      continue;
    }
    features.push(...matches);
  }
  if (features.length === 0) {
    showToast('No se encontró una geometría de predio para localizar.', 'warning');
    return;
  }

  state.sector = 'TODOS';
  if (dom.sectorSelect) dom.sectorSelect.value = 'TODOS';
  mapApi.setSectorFilter('TODOS');
  mapApi.fitToFeatures(features);
  mapApi.setHighlight(features);
  updateSectorStatus();
  showToast(successMessage ?? `${features.length} predio(s) localizado(s) en el mapa.`);
  if (missing.length > 0) {
    showToast(
      `Localizados ${features.length} predio(s). No se encontraron geometrías para: ${missing
        .slice(0, 3)
        .join(', ')}${missing.length > 3 ? '…' : ''}.`,
      'warning',
      6000
    );
  }
}

function locateIssue(issue) {
  if (!issue.predioId) {
    showToast('Esta incidencia no está asociada a un predio con geometría.', 'warning');
    return;
  }
  locateFeatures([issue.predioId], `Predio ${issue.predioId} localizado en el mapa.`);
}

function renderIssues() {
  if (!dom.issuesBody) return;
  clear(dom.issuesBody);
  state.filteredIssues = computeFilteredIssues();
  const filtered = state.filteredIssues;
  const visible = filtered.slice(0, MAX_RENDERED_ROWS);

  if (dom.issuesCount) {
    dom.issuesCount.textContent = state.result
      ? `${formatNumber(state.issues.length)} en total`
      : '';
  }

  if (!state.result) {
    dom.issuesBody.append(
      h('tr', {}, [
        h('td', { colspan: 9, class: 'empty-row' }, 'Cargue un archivo o los datos de demostración para evaluar.')
      ])
    );
  } else if (visible.length === 0) {
    dom.issuesBody.append(
      h('tr', {}, [
        h('td', { colspan: 9, class: 'empty-row' }, 'No hay incidencias que coincidan con los filtros.')
      ])
    );
  } else {
    for (const issue of visible) {
      const checkbox = h('input', {
        type: 'checkbox',
        checked: state.selectedIssueIds.has(issue.id),
        'aria-label': `Seleccionar incidencia ${issue.id}`
      });
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) state.selectedIssueIds.add(issue.id);
        else state.selectedIssueIds.delete(issue.id);
        updateSelectionSummary();
      });

      const predioButton = h(
        'button',
        {
          class: 'link-button',
          type: 'button',
          title: 'Localizar predio en el mapa',
          disabled: !issue.predioId,
          on: { click: () => locateIssue(issue) }
        },
        issue.predioId ?? '—'
      );

      dom.issuesBody.append(
        h('tr', { dataset: { issueId: issue.id } }, [
          h('td', { class: 'cell-check' }, checkbox),
          h('td', { class: 'cell-id', text: issue.id }),
          h('td', { class: 'cell-predio' }, predioButton),
          h('td', {}, makeRuleCell(issue)),
          h('td', {}, makeSeverityBadge(issue.severidad)),
          h('td', { class: 'cell-dimension', text: dimensionLabel(issue.dimension) }),
          h('td', { class: 'cell-description', text: issue.descripcion }),
          h(
            'td',
            {
              class: 'cell-observed',
              title: issue.valorObservado ?? ''
            },
            issue.valorObservado ?? '—'
          ),
          h('td', { class: 'cell-action' }, [
            h(
              'button',
              {
                type: 'button',
                class: 'mini-button',
                disabled: !issue.predioId,
                on: { click: () => locateIssue(issue) }
              },
              'Localizar'
            )
          ])
        ])
      );
    }
  }

  if (dom.tableNote) {
    if (!state.result) {
      dom.tableNote.textContent = 'La evaluación se ejecuta localmente en el navegador.';
    } else if (filtered.length === 0) {
      dom.tableNote.textContent = `No hay incidencias para los filtros actuales. Total del conjunto: ${formatNumber(
        state.issues.length
      )}.`;
    } else if (filtered.length > MAX_RENDERED_ROWS) {
      dom.tableNote.textContent = `Mostrando ${MAX_RENDERED_ROWS} de ${formatNumber(
        filtered.length
      )} incidencias filtradas. Las exportaciones incluyen todas las filtradas.`;
    } else {
      dom.tableNote.textContent = `${formatNumber(
        filtered.length
      )} incidencia(s) filtrada(s) de ${formatNumber(state.issues.length)} totales. Las exportaciones incluyen las filtradas.`;
    }
  }

  updateSelectionSummary();
}

function updateSectorStatus() {
  if (!mapApi) return;
  if (state.tileError) {
    setMapStatus(state.tileError, 'warning');
    return;
  }
  const count =
    state.sector === 'TODOS'
      ? state.displayFeatures.length
      : state.displayFeatures.filter(
          (feature) => feature.properties?.sector === state.sector
        ).length;
  const label = state.sector === 'TODOS' ? 'Todos los sectores' : state.sector;
  setMapStatus(`${label} · ${formatNumber(count)} predio(s) visibles`);
}

function updateMap(fit = false) {
  if (!mapApi) return;
  const display = buildDisplayCollection(state.collection, state.result);
  state.displayFeatures = display.features;
  mapApi.setSectorFilter(state.sector);
  mapApi.setData(display, { fit });
  mapApi.setHighlight([]);
  updateSectorStatus();
}

function renderAll({ fit = false } = {}) {
  renderIndicators();
  renderRunMeta();
  renderSource();
  renderNotEvaluated();
  updateRulesSummary();
  updateMap(fit);
  renderIssues();
}

async function runEvaluation({ fit = false, notify = false } = {}) {
  if (!state.text) {
    showToast('No hay datos cargados para evaluar.', 'warning');
    return;
  }

  if (dom.evaluateButton) dom.evaluateButton.disabled = true;
  if (dom.runMeta) dom.runMeta.textContent = 'Evaluando…';
  if (dom.issuesBody) {
    clear(dom.issuesBody);
    dom.issuesBody.append(
      h('tr', {}, [h('td', { colspan: 9, class: 'empty-row' }, 'Ejecutando reglas de calidad…')])
    );
  }

  await new Promise((resolve) => setTimeout(resolve, 0));

  try {
    const result = evaluateGeoJSONText(state.text, {
      enabledRules: { ...state.enabledRules },
      tolerancePct: state.tolerance,
      datasetName: state.datasetName
    });
    state.result = result;
    state.issues = result.issues;
    state.selectedIssueIds.clear();
    state.filteredIssues = [];
    renderAll({ fit });

    if (notify) {
      if (result.meta.errorDeCarga) {
        showToast(
          'No se pudo interpretar el archivo como JSON. Se informa el problema estructural.',
          'error',
          6500
        );
      } else {
        showToast(
          `${formatNumber(result.indicators.prediosSinErrores)} predio(s) sin errores · ${formatNumber(
            result.indicators.totalIncidencias
          )} incidencia(s) detectada(s).`
        );
      }
    }
  } catch (error) {
    console.error(error);
    showToast(`Error inesperado durante la evaluación: ${error.message}`, 'error', 7000);
  } finally {
    if (dom.evaluateButton) dom.evaluateButton.disabled = false;
  }
}

function requestEvaluation(options = {}) {
  evaluationChain = evaluationChain
    .then(() => runEvaluation(options))
    .catch((error) => console.error('Evaluación fallida:', error));
  return evaluationChain;
}

function scheduleEvaluation() {
  if (evalTimer) clearTimeout(evalTimer);
  evalTimer = setTimeout(() => {
    evalTimer = null;
    requestEvaluation({});
  }, 180);
}

function parseCollection(text) {
  try {
    const data = JSON.parse(text);
    return isPlainObject(data) ? data : null;
  } catch {
    return null;
  }
}

async function applyText(text, { datasetName, focus = true } = {}) {
  state.text = text;
  if (datasetName) state.datasetName = datasetName;
  state.collection = parseCollection(text);
  state.parcelIndex = buildParcelIndex(state.collection);
  state.selectedIssueIds.clear();
  state.tileError = null;
  await requestEvaluation({ fit: focus, notify: true });
}

async function loadDemoData() {
  if (dom.demoButton) dom.demoButton.disabled = true;
  setMapStatus('Cargando datos de demostración…');
  try {
    const url = new URL(
      `${import.meta.env.BASE_URL}data/quito_predios_sinteticos.geojson`,
      document.baseURI
    ).href;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`respuesta HTTP ${response.status}`);
    }
    const text = await response.text();
    await applyText(text, { datasetName: 'quito_predios_sinteticos.geojson', focus: true });
  } catch (error) {
    console.error(error);
    setMapStatus('No se pudieron cargar los datos de demostración.', 'error');
    showToast(
      `No se pudieron cargar los datos de demostración: ${error.message}. Puede cargar un GeoJSON local.`,
      'error',
      8000
    );
  } finally {
    if (dom.demoButton) dom.demoButton.disabled = false;
  }
}

async function handleFile(file) {
  if (!file) return;
  const name = file.name.toLowerCase();
  if (!name.endsWith('.geojson') && !name.endsWith('.json')) {
    showToast('Formato no admitido. Seleccione un archivo .geojson o .json.', 'error');
    return;
  }
  if (file.size > MAX_FILE_BYTES) {
    showToast(
      `El archivo supera el límite de ${MAX_FILE_BYTES / (1024 * 1024)} MB. El análisis es local y O(n²) en topología.`,
      'error'
    );
    return;
  }
  try {
    const text = await file.text();
    await applyText(text, { datasetName: file.name, focus: true });
  } catch (error) {
    showToast(`No se pudo leer el archivo: ${error.message}`, 'error');
  }
}

function exportFilteredCSV() {
  if (!state.result) {
    showToast('Ejecute una evaluación antes de exportar.', 'warning');
    return;
  }
  const csv = issuesToCSV(state.filteredIssues);
  downloadText(
    datedFilename('incidencias_quito', 'csv'),
    `\uFEFF${csv}`,
    'text/csv;charset=utf-8'
  );
  showToast(`${formatNumber(state.filteredIssues.length)} incidencia(s) exportadas a CSV.`);
}

function exportFilteredJSON() {
  if (!state.result) {
    showToast('Ejecute una evaluación antes de exportar.', 'warning');
    return;
  }
  downloadText(
    datedFilename('incidencias_quito', 'json'),
    issuesToJSON(state.filteredIssues),
    'application/json;charset=utf-8'
  );
  showToast(`${formatNumber(state.filteredIssues.length)} incidencia(s) exportadas a JSON.`);
}

function exportSummary() {
  if (!state.result) {
    showToast('Ejecute una evaluación antes de exportar.', 'warning');
    return;
  }
  downloadText(
    datedFilename('resumen_evaluacion_quito', 'json'),
    summaryToJSON(state.result, state.datasetName),
    'application/json;charset=utf-8'
  );
  showToast('Resumen de evaluación exportado.');
}

function bindEvents() {
  dom.demoButton?.addEventListener('click', () => loadDemoData());
  dom.evaluateButton?.addEventListener('click', () => requestEvaluation({ notify: true }));

  dom.fileInput?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    await handleFile(file);
  });

  dom.toleranceInput?.addEventListener('change', () => {
    const normalized = normalizeTolerance(dom.toleranceInput.value);
    dom.toleranceInput.value = String(normalized);
    if (normalized === state.tolerance) return;
    state.tolerance = normalized;
    requestEvaluation({});
  });

  dom.rulesList?.addEventListener('change', (event) => {
    const checkbox = event.target.closest('input[data-rule]');
    if (!checkbox) return;
    state.enabledRules[checkbox.dataset.rule] = checkbox.checked;
    updateRulesSummary();
    scheduleEvaluation();
  });

  dom.rulesAll?.addEventListener('click', () => {
    for (const rule of TOGGLEABLE_RULES) state.enabledRules[rule.code] = true;
    syncRuleCheckboxes();
    updateRulesSummary();
    requestEvaluation({});
  });

  dom.rulesNone?.addEventListener('click', () => {
    for (const rule of TOGGLEABLE_RULES) state.enabledRules[rule.code] = false;
    syncRuleCheckboxes();
    updateRulesSummary();
    requestEvaluation({});
  });

  dom.searchInput?.addEventListener('input', () => {
    state.search = dom.searchInput.value;
    renderIssues();
  });

  dom.severityFilter?.addEventListener('change', () => {
    state.severity = dom.severityFilter.value;
    renderIssues();
  });

  dom.ruleFilter?.addEventListener('change', () => {
    state.rule = dom.ruleFilter.value;
    renderIssues();
  });

  dom.selectAll?.addEventListener('change', () => {
    if (!dom.selectAll) return;
    if (dom.selectAll.checked) {
      for (const issue of state.filteredIssues) state.selectedIssueIds.add(issue.id);
    } else {
      for (const issue of state.filteredIssues) state.selectedIssueIds.delete(issue.id);
    }
    renderIssues();
  });

  dom.clearSelection?.addEventListener('click', () => {
    state.selectedIssueIds.clear();
    mapApi?.setHighlight([]);
    if (dom.selectAll) {
      dom.selectAll.checked = false;
      dom.selectAll.indeterminate = false;
    }
    renderIssues();
  });

  dom.locateSelected?.addEventListener('click', () => {
    if (state.selectedIssueIds.size === 0) {
      showToast('Seleccione al menos una incidencia en la tabla.', 'warning');
      return;
    }
    const selected = state.issues.filter((issue) => state.selectedIssueIds.has(issue.id));
    const predioIds = [
      ...new Set(selected.map((issue) => issue.predioId).filter((value) => Boolean(value)))
    ];
    if (predioIds.length === 0) {
      showToast('Las incidencias seleccionadas no tienen un predio con geometría.', 'warning');
      return;
    }
    locateFeatures(predioIds, `${predioIds.length} predio(s) seleccionado(s) localizado(s).`);
  });

  dom.exportCsv?.addEventListener('click', exportFilteredCSV);
  dom.exportJson?.addEventListener('click', exportFilteredJSON);
  dom.exportSummary?.addEventListener('click', exportSummary);

  dom.sectorSelect?.addEventListener('change', () => {
    state.sector = dom.sectorSelect.value;
    mapApi?.setSectorFilter(state.sector);
    if (state.sector !== 'TODOS') {
      const features = state.displayFeatures.filter(
        (feature) => feature.properties?.sector === state.sector
      );
      mapApi?.fitToFeatures(features);
    } else {
      mapApi?.fitToData();
    }
    updateSectorStatus();
  });

  dom.fitAll?.addEventListener('click', () => {
    state.sector = 'TODOS';
    if (dom.sectorSelect) dom.sectorSelect.value = 'TODOS';
    mapApi?.setSectorFilter('TODOS');
    mapApi?.fitToData();
    updateSectorStatus();
  });
}

function initMap() {
  try {
    mapApi = createParcelMap($('map'), {
      onStatus: (status) => {
        if (status.type === 'ready') {
          setMapStatus(`Cartografía base lista · ${formatNumber(status.count)} predios en memoria`);
        } else if (status.type === 'data') {
          if (!state.tileError) {
            setMapStatus(`${formatNumber(status.count)} predio(s) cargados en el mapa`);
          }
        } else if (status.type === 'tile-error') {
          state.tileError = status.message;
          setMapStatus(status.message, 'warning');
        }
      },
      onParcelClick: (properties) => {
        if (!properties?.id) return;
        const features = state.parcelIndex.get(properties.id) ?? [];
        if (features.length > 0) mapApi?.setHighlight(features);
      },
      onError: (error) => console.warn('MapLibre:', error)
    });
  } catch (error) {
    console.error('No se pudo inicializar MapLibre:', error);
    setMapStatus(
      'No se pudo inicializar el mapa (posible falta de WebGL). La evaluación y las exportaciones siguen disponibles.',
      'error'
    );
    mapApi = null;
  }
}

export async function initApp() {
  populateStaticControls();
  renderRulesList();
  renderIndicators();
  renderRunMeta();
  renderSource();
  renderNotEvaluated();
  renderIssues();
  initMap();
  bindEvents();

  window.addEventListener('resize', () => mapApi?.resize());

  await loadDemoData();
}
