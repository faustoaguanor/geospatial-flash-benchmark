import { QUALITY_DIMENSIONS, SEVERITIES } from '../core/constants.js';

const numberFormat = new Intl.NumberFormat('es-EC', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

const dateFormat = new Intl.DateTimeFormat('es-EC', {
  dateStyle: 'short',
  timeStyle: 'medium'
});

export function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value !== 'number' || !Number.isFinite(value)) return String(value);
  return numberFormat.format(value);
}

export function formatPercent(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${numberFormat.format(Math.round(value * 100) / 100)} %`;
}

export function formatDate(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso);
  return dateFormat.format(date);
}

export function severityLabel(value) {
  return SEVERITIES[value] ?? value;
}

export function dimensionLabel(value) {
  return QUALITY_DIMENSIONS[value] ?? value;
}
