import { computeAreaM2 } from './geometry.js';
import { makeIssue } from './issue.js';
import { DEFAULT_SURFACE_TOLERANCE_PCT } from './constants.js';

const round = (value, decimals = 2) => {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

/**
 * Compara el área registrada (area_terreno_m2) con el área geodésica
 * calculada por Turf sobre la geometría WGS84.
 */
export function evaluateSurface(item, options = {}) {
  const isRuleEnabled = options.isRuleEnabled ?? (() => true);
  const tolerancePct =
    Number.isFinite(options.tolerancePct) && options.tolerancePct >= 0
      ? options.tolerancePct
      : DEFAULT_SURFACE_TOLERANCE_PCT;
  const geometryArea =
    Number.isFinite(options.geometryArea) && options.geometryArea >= 0
      ? options.geometryArea
      : computeAreaM2(item.geometry);
  const registered = item.properties.area_terreno_m2;
  const issues = [];

  const analysis = {
    entidadId: item.entidadId,
    predioId: item.predioId,
    sector: item.sector,
    areaGeometricaM2: round(geometryArea),
    areaRegistradaM2: typeof registered === 'number' && Number.isFinite(registered) ? round(registered) : registered,
    diferenciaM2: null,
    diferenciaAbsM2: null,
    diferenciaPct: null,
    diferenciaAbsPct: null,
    toleranciaPct: tolerancePct,
    evaluada: false,
    motivo: null
  };

  const add = (code, payload) => {
    if (isRuleEnabled(code)) issues.push(makeIssue(code, payload));
  };

  const base = {
    predioId: item.predioId,
    entidadId: item.entidadId,
    sector: item.sector
  };

  if (typeof registered !== 'number' || !Number.isFinite(registered)) {
    analysis.motivo = 'La superficie registrada no es un número finito.';
    add('SUP-003', {
      ...base,
      descripcion: 'No se puede comparar la superficie: area_terreno_m2 no es numérica.',
      valorObservado: registered ?? 'ausente'
    });
    return { analysis, issues };
  }

  if (registered < 0) {
    analysis.motivo = 'La superficie registrada es negativa.';
    add('SUP-003', {
      ...base,
      descripcion: 'No se puede comparar la superficie: area_terreno_m2 es negativa.',
      valorObservado: registered
    });
    return { analysis, issues };
  }

  if (!Number.isFinite(geometryArea) || geometryArea === null) {
    analysis.motivo = 'No fue posible calcular el área geométrica.';
    add('SUP-003', {
      ...base,
      descripcion: 'No se puede comparar la superficie: el área geométrica no pudo calcularse.',
      valorObservado: registered
    });
    return { analysis, issues };
  }

  if (geometryArea <= 0) {
    analysis.motivo = 'El área geométrica es cero o negativa.';
    add('SUP-003', {
      ...base,
      descripcion: 'No se puede comparar porcentualmente: el área geométrica es cero.',
      valorObservado: registered
    });
    return { analysis, issues };
  }

  const difference = registered - geometryArea;
  const differencePct = (difference / geometryArea) * 100;
  analysis.diferenciaM2 = round(difference);
  analysis.diferenciaAbsM2 = round(Math.abs(difference));
  analysis.diferenciaPct = round(differencePct);
  analysis.diferenciaAbsPct = round(Math.abs(differencePct));

  if (registered === 0) {
    analysis.motivo = 'La superficie registrada es cero.';
    add('SUP-002', {
      ...base,
      descripcion: 'La superficie registrada es cero; no es un valor catastral válido.',
      valorObservado: 0
    });
    return { analysis, issues };
  }

  analysis.evaluada = true;

  if (Math.abs(differencePct) > tolerancePct) {
    add('SUP-001', {
      ...base,
      descripcion: `La superficie registrada (${round(registered)} m²) difiere de la geométrica (${round(geometryArea)} m²) en ${round(Math.abs(differencePct))} %, superando la tolerancia de ${tolerancePct} %.`,
      valorObservado: `registrada=${round(registered)} m²; geométrica=${round(geometryArea)} m²; diferencia=${round(Math.abs(difference))} m²; porcentaje=${round(Math.abs(differencePct))} %; tolerancia=${tolerancePct} %`
    });
  }

  return { analysis, issues };
}
