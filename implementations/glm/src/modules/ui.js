/**
 * Interfaz y controles del dashboard: indicadores, tabla de incidencias,
 * filtros, reglas activables y mensajes de estado. Manipula el DOM.
 */
import { RULE_CATALOG, SEVERITIES } from './config.js';
import { escapeHtml } from './map.js';

const $ = (id) => document.getElementById(id);

/* ---------- Mensajes de estado ---------- */
export function showMessage(text, type = 'info') {
  const box = $('status-messages');
  const div = document.createElement('div');
  div.className = `status-message status-message--${type}`;
  div.textContent = text;
  box.prepend(div);
  while (box.children.length > 4) box.removeChild(box.lastChild);
}

/* ---------- Indicadores ---------- */
const INDICATOR_DEFS = [
  ['total_predios', 'Total de predios'],
  ['predios_sin_errores', 'Sin errores'],
  ['predios_con_errores', 'Con errores'],
  ['predios_con_advertencias', 'Con advertencias'],
  ['total_incidencias', 'Incidencias'],
  ['pct_sin_errores', '% sin errores comprobados']
];

export function renderIndicators(indicators) {
  const box = $('indicators');
  box.innerHTML = '';
  if (!indicators) {
    box.innerHTML = '<p class="table-empty">Sin evaluación ejecutada.</p>';
    return;
  }
  for (const [key, label] of INDICATOR_DEFS) {
    const div = document.createElement('div');
    div.className = 'indicator';
    const value = key === 'pct_sin_errores'
      ? `${indicators[key].toFixed(1)} %`
      : String(indicators[key]);
    div.innerHTML = `<div class="indicator__value">${escapeHtml(value)}</div><div class="indicator__label">${escapeHtml(label)}</div>`;
    box.appendChild(div);
  }
}

/* ---------- Reglas activables ---------- */
export function renderRulesList(enabledRules) {
  const box = $('rules-list');
  box.innerHTML = '';
  for (const rule of RULE_CATALOG) {
    if (!rule.configurable) continue;
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = rule.code;
    checkbox.checked = enabledRules.has(rule.code);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) enabledRules.add(rule.code);
      else enabledRules.delete(rule.code);
    });
    label.appendChild(checkbox);
    const code = document.createElement('code');
    code.textContent = rule.code;
    label.appendChild(code);
    label.appendChild(document.createTextNode(` ${rule.description}`));
    box.appendChild(label);
  }
}

/* ---------- Filtros de la tabla ---------- */
export function populateRuleFilter(incidents) {
  const select = $('rule-filter');
  const current = select.value;
  const codes = [...new Set(incidents.map((i) => i.codigo_regla))].sort();
  select.innerHTML = '<option value="__all__">Todas las reglas</option>';
  for (const code of codes) {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = code;
    select.appendChild(opt);
  }
  if (codes.includes(current)) select.value = current;
}

export function populateSectorSelect(sectores) {
  const select = $('sector-select');
  select.innerHTML = '<option value="__all__">Todos los sectores</option>';
  for (const nombre of sectores) {
    const opt = document.createElement('option');
    opt.value = nombre;
    opt.textContent = nombre;
    select.appendChild(opt);
  }
}

/* ---------- Tabla de incidencias ---------- */
const SEVERITY_LABEL = { error: 'Error', warning: 'Advertencia', info: 'Info' };

export function renderIncidentsTable(incidents, { search = '', severity = '__all__', rule = '__all__' } = {}) {
  const tbody = $('incidents-tbody');
  const empty = $('table-empty');
  tbody.innerHTML = '';

  const term = search.trim().toLowerCase();
  const filtered = incidents.filter((inc) => {
    if (severity !== '__all__' && inc.severidad !== severity) return false;
    if (rule !== '__all__' && inc.codigo_regla !== rule) return false;
    if (term) {
      const hay = `${inc.predio_id} ${inc.codigo_regla} ${(inc.predios_relacionados || []).join(' ')}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    empty.textContent = incidents.length === 0 ? 'Sin incidencias que mostrar.' : 'Ninguna incidencia coincide con los filtros.';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  for (const inc of filtered) {
    const tr = document.createElement('tr');
    tr.dataset.predioId = inc.predio_id ?? '';
    tr.innerHTML = `
      <td>${escapeHtml(inc.id)}</td>
      <td><code>${escapeHtml(inc.codigo_regla)}</code></td>
      <td>${escapeHtml(inc.predio_id ?? '—')}</td>
      <td><span class="severity-badge severity-badge--${escapeHtml(inc.severidad)}">${escapeHtml(SEVERITY_LABEL[inc.severidad] || inc.severidad)}</span></td>
      <td>${escapeHtml(inc.dimension)}</td>
      <td>${escapeHtml(inc.descripcion)}</td>`;
    tr.addEventListener('click', () => {
      tbody.querySelectorAll('tr.selected').forEach((el) => el.classList.remove('selected'));
      tr.classList.add('selected');
      tr.dispatchEvent(new CustomEvent('incident-selected', { bubbles: true, detail: inc }));
    });
    tbody.appendChild(tr);
  }
}

export function getTableFilters() {
  return {
    search: $('search-input').value,
    severity: $('severity-filter').value,
    rule: $('rule-filter').value
  };
}
