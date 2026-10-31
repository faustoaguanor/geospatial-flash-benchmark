/**
 * Motor de calidad: orquesta todas las reglas. No inicializa MapLibre ni
 * accede al DOM: puede ejecutarse en Node (Vitest) o en el navegador.
 *
 * Flujo:
 *  1. Validación estructural (si es fatal, no se evalúa nada más).
 *  2. Normalización de ids de predio (id_predio ausente → AUTO-n).
 *  3. Reglas alfanuméricas, geométricas, topológicas y de superficies.
 *  4. Filtrado por reglas activadas (las estructurales no son configurables).
 *  5. Asignación de IDs únicos de incidencia (deterministas).
 *  6. Indicadores y listado de reglas no evaluadas.
 */
import { parseGeoJsonText, validateStructure } from './structuralValidation.js';
import { evaluateAttributes } from './attributeQuality.js';
import { evaluateGeometry } from './geometricQuality.js';
import { evaluateTopology } from './topologyAnalysis.js';
import { evaluateSurfaces } from './surfaceAnalysis.js';
import { computeIndicators } from './indicators.js';
import { assignIncidentIds } from './incidentModel.js';
import { RULE_CATALOG, DEFAULT_SURFACE_TOLERANCE } from './config.js';

const DATA_RULE_CODES = RULE_CATALOG.filter((r) => r.code.startsWith('ALFA_') || r.code.startsWith('GEOM_') || r.code.startsWith('TOPO_') || r.code.startsWith('SUP_')).map((r) => r.code);

/**
 * Ejecuta el análisis completo.
 * @param {Object|string} input Objeto GeoJSON o texto JSON.
 * @param {Object} options { tolerance, enabledRules: Set<string>|null }
 * @returns {Object} { ok, incidents, indicators, features, notEvaluatedRules, structuralFatal }
 */
export function runQualityAnalysis(input, options = {}) {
  const tolerance = typeof options.tolerance === 'number' && Number.isFinite(options.tolerance) && options.tolerance >= 0
    ? options.tolerance
    : DEFAULT_SURFACE_TOLERANCE;
  const enabledRules = options.enabledRules instanceof Set
    ? options.enabledRules
    : options.enabledRules && Array.isArray(options.enabledRules)
      ? new Set(options.enabledRules)
      : null;

  // 1. Parseo (si la entrada es texto)
  let geojson = input;
  let parseIncidents = [];
  if (typeof input === 'string') {
    const parsed = parseGeoJsonText(input);
    parseIncidents = parsed.incidents;
    if (parseIncidents.length > 0) {
      const incidents = assignIncidentIds(parseIncidents);
      return {
        ok: false,
        incidents,
        indicators: null,
        features: [],
        notEvaluatedRules: DATA_RULE_CODES.slice(),
        structuralFatal: true
      };
    }
    geojson = parsed.data;
  }

  // 2. Estructura
  const structural = validateStructure(geojson);
  const structuralIncidents = [
    ...structural.collectionIncidents,
    ...structural.featureIncidents.flatMap((fi) => fi.incidents)
  ];

  if (structural.fatal) {
    return {
      ok: false,
      incidents: assignIncidentIds(structuralIncidents),
      indicators: null,
      features: [],
      notEvaluatedRules: DATA_RULE_CODES.slice(),
      structuralFatal: true
    };
  }

  const features = structural.features;
  // 3. Normalización de identificadores internos
  features.forEach((feature, index) => {
    if (!feature.properties.id_predio) {
      feature.properties.id_predio = `AUTO-${index + 1}`;
    }
  });

  const notEvaluatedRules = [];
  if (features.length === 0) {
    notEvaluatedRules.push(...DATA_RULE_CODES);
  } else if (features.length < 2) {
    notEvaluatedRules.push('TOPO_SOLAPAMIENTO', 'TOPO_CONTACTO_BORDE', 'TOPO_CONTACTO_VERTICE');
  }

  // 4. Reglas de datos
  let incidents = [
    ...structuralIncidents,
    ...evaluateAttributes(features),
    ...evaluateGeometry(features),
    ...evaluateTopology(features).incidents,
    ...evaluateSurfaces(features, { tolerance })
  ];

  // 5. Filtrado por reglas activadas (estructurales siempre activas)
  if (enabledRules) {
    incidents = incidents.filter((inc) => !inc.codigo_regla.startsWith('ESTRUCT_') || !isConfigurable(inc.codigo_regla));
    incidents = incidents.filter((inc) => {
      if (inc.codigo_regla.startsWith('ESTRUCT_')) return true; // estructurales siempre
      return enabledRules.has(inc.codigo_regla);
    });
  }

  // 6. IDs únicos y orden estable (colección → predio → regla)
  incidents.sort((a, b) => {
    const pa = String(a.predio_id ?? '');
    const pb = String(b.predio_id ?? '');
    if (pa !== pb) return pa < pb ? -1 : 1;
    if (a.codigo_regla !== b.codigo_regla) return a.codigo_regla < b.codigo_regla ? -1 : 1;
    return 0;
  });
  const finalIncidents = assignIncidentIds(incidents);

  const indicators = computeIndicators(finalIncidents, features);

  return {
    ok: true,
    incidents: finalIncidents,
    indicators,
    features,
    notEvaluatedRules,
    structuralFatal: false,
    meta: {
      tolerance_surface_pct: tolerance * 100,
      reglas_activadas: enabledRules ? Array.from(enabledRules) : 'todas'
    }
  };
}

function isConfigurable(code) {
  const rule = RULE_CATALOG.find((r) => r.code === code);
  return rule ? rule.configurable : false;
}
