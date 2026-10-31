/**
 * Indicadores agregados de la evaluación.
 * Regla clave: un predio con varias incidencias se cuenta UNA sola vez.
 */

/**
 * @param {number} totalFeatures
 * @param {object[]} featureResults resultados por predio (hasError/hasWarning)
 * @param {object[]} incidents todas las incidencias
 */
export function computeIndicators(totalFeatures, featureResults, incidents) {
  let sinErrores = 0;
  let conErrores = 0;
  let conAdvertencias = 0;
  let soloAdvertencias = 0;
  let sinIncidencias = 0;

  for (const r of featureResults) {
    if (r.hasError) conErrores += 1;
    else sinErrores += 1;
    if (r.hasWarning) conAdvertencias += 1;
    if (r.hasWarning && !r.hasError) soloAdvertencias += 1;
    if (!r.hasError && !r.hasWarning) sinIncidencias += 1;
  }

  const errores = incidents.filter((i) => i.severity === 'error').length;
  const advertencias = incidents.filter((i) => i.severity === 'advertencia').length;

  const porPorRegla = {};
  for (const inc of incidents) {
    porPorRegla[inc.rule_code] = (porPorRegla[inc.rule_code] ?? 0) + 1;
  }

  return {
    total_predios: totalFeatures,
    predios_sin_errores: sinErrores,
    predios_con_errores: conErrores,
    predios_con_advertencias: conAdvertencias,
    predios_solo_advertencias: soloAdvertencias,
    predios_sin_incidencias: sinIncidencias,
    total_incidencias: incidents.length,
    incidencias_error: errores,
    incidencias_advertencia: advertencias,
    porcentaje_sin_errores: totalFeatures > 0 ? (sinErrores / totalFeatures) * 100 : 0,
    incidencias_por_regla: porPorRegla,
  };
}
