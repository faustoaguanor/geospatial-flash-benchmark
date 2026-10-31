/**
 * Panel de control: toggles de reglas y lectura de configuración.
 */
import { RULES } from '../config/constants.js';

export function renderRuleToggles(container) {
  container.textContent = '';
  for (const [code, rule] of Object.entries(RULES)) {
    const label = document.createElement('label');
    label.className = 'rule-toggle';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    checkbox.dataset.rule = code;
    const codeSpan = document.createElement('span');
    codeSpan.className = 'code';
    codeSpan.textContent = code;
    const nameSpan = document.createElement('span');
    nameSpan.textContent = rule.name;
    label.append(checkbox, codeSpan, nameSpan);
    container.appendChild(label);
  }
}

export function getEnabledRules(container) {
  return [...container.querySelectorAll('input[data-rule]:checked')]
    .map((cb) => cb.dataset.rule);
}
