/**
 * Tabla de incidencias: render sin innerHTML (API DOM + textContent).
 */

export function renderIncidentsTable(tbody, incidents, onSelect) {
  tbody.textContent = '';
  if (!incidents.length) {
    const tr = document.createElement('tr');
    tr.className = 'empty-row';
    const td = document.createElement('td');
    td.colSpan = 8;
    td.textContent = 'Sin incidencias que mostrar con los filtros actuales.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  for (const inc of incidents) {
    const tr = document.createElement('tr');
    const cells = [
      inc.id,
      inc.rule_code,
      inc.feature_ref ?? '(dataset)',
      inc.dimension,
      inc.severity,
      inc.description,
      inc.observed_value === null ? '' : String(inc.observed_value),
      inc.criterion,
    ];
    cells.forEach((text, i) => {
      const td = document.createElement('td');
      td.textContent = text;
      if (i === 4) td.className = `sev-${inc.severity}`;
      tr.appendChild(td);
    });
    if (onSelect) {
      tr.addEventListener('click', () => onSelect(inc));
    }
    tbody.appendChild(tr);
  }
}

/** Pobla el select de reglas con los códigos presentes en el dataset. */
export function populateRuleFilter(select, incidents) {
  const current = select.value;
  const codes = [...new Set(incidents.map((i) => i.rule_code))].sort();
  select.textContent = '';
  const todas = document.createElement('option');
  todas.value = 'todas';
  todas.textContent = 'Regla: todas';
  select.appendChild(todas);
  for (const code of codes) {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = code;
    select.appendChild(opt);
  }
  select.value = codes.includes(current) ? current : 'todas';
}
