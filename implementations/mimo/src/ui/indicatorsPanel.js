/**
 * Panel de indicadores (sin dependencias externas).
 */

const CARDS = [
  { key: 'total_predios', label: 'Total de predios', cls: '' },
  { key: 'predios_sin_errores', label: 'Predios sin errores', cls: 'ok' },
  { key: 'predios_con_errores', label: 'Predios con errores', cls: 'error' },
  { key: 'predios_solo_advertencias', label: 'Predios solo con advertencias', cls: 'warning' },
  { key: 'total_incidencias', label: 'N° de incidencias', cls: '' },
  { key: 'incidencias_error', label: 'Incidencias: errores', cls: 'error' },
  { key: 'incidencias_advertencia', label: 'Incidencias: advertencias', cls: 'warning' },
  { key: 'porcentaje_sin_errores', label: '% predios sin errores comprobados', cls: 'ok', pct: true },
];

export function renderIndicators(container, indicators) {
  container.textContent = '';
  if (!indicators) {
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = 'Sin datos cargados.';
    container.appendChild(p);
    return;
  }
  for (const card of CARDS) {
    const div = document.createElement('div');
    div.className = `indicator-card ${card.cls}`;
    const value = document.createElement('div');
    value.className = 'value';
    const raw = indicators[card.key] ?? 0;
    value.textContent = card.pct ? `${raw.toFixed(1)} %` : String(raw);
    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = card.label;
    div.append(value, label);
    container.appendChild(div);
  }

  const wide = document.createElement('div');
  wide.className = 'indicator-card wide';
  const label = document.createElement('div');
  label.className = 'label';
  label.textContent = 'Incidencias por regla';
  const list = document.createElement('div');
  list.style.fontSize = '0.75rem';
  const entries = Object.entries(indicators.incidencias_por_regla ?? {});
  list.textContent = entries.length
    ? entries.map(([code, n]) => `${code}: ${n}`).join(' · ')
    : 'Sin incidencias registradas.';
  wide.append(label, list);
  container.appendChild(wide);
}
