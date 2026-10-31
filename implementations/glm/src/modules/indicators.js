/**
 * Indicadores de calidad. Cuenta predios únicos por categoría para evitar
 * el doble conteo cuando un predio presenta varias incidencias.
 *
 * Definiciones (experimento):
 *  - totalPredios: número de predios evaluables (estructuralmente válidos).
 *  - prediosSinErrores: predios sin ninguna incidencia de severidad "error".
 *    (pueden tener advertencias o incidencias informativas).
 *  - prediosConErrores: predios con al menos una incidencia "error" (conjunto único).
 *  - prediosConAdvertencias: predios con al menos una incidencia "warning"
 *    (conjunto único; un predio con error y advertencia aparece en ambos
 *     conjuntos, pero nunca se cuenta dos veces dentro de un mismo indicador).
 *  - totalIncidencias: número total de incidencias generadas.
 *  - pctSinErrores: prediosSinErrores / totalPredios × 100.
 */
export function computeIndicators(incidents, features) {
  const errorPredios = new Set();
  const warningPredios = new Set();

  for (const inc of incidents) {
    if (!inc.predio_id) continue;
    if (inc.severidad === 'error') errorPredios.add(inc.predio_id);
    else if (inc.severidad === 'warning') warningPredios.add(inc.predio_id);
  }

  const ids = new Set(features.map((f) => f.properties?.id_predio ?? null));
  // features sin id no pueden cruzarse con incidencias: se cuentan por posición
  const totalPredios = features.length;

  let sinErrores = 0;
  for (const feature of features) {
    const id = feature.properties?.id_predio ?? `__idx__${feature.__index}`;
    if (!errorPredios.has(id)) sinErrores++;
  }

  return {
    total_predios: totalPredios,
    predios_sin_errores: sinErrores,
    predios_con_errores: errorPredios.size,
    predios_con_advertencias: warningPredios.size,
    total_incidencias: incidents.length,
    pct_sin_errores: totalPredios > 0 ? (sinErrores / totalPredios) * 100 : 0,
    _sets: {
      ids: Array.from(ids),
      errores: Array.from(errorPredios),
      advertencias: Array.from(warningPredios)
    }
  };
}
