# Qito Cadastre Quality Lab

Aplicación GIS web para analizar la **calidad de información catastral vectorial sintética** del Distrito Metropolitano de Quito, Ecuador. Procesa GeoJSON localmente en el navegador: carga predios, ejecuta reglas de validación estructural, alfanumérica, geométrica, topológica y de superficies, visualiza incidencias en un mapa y exporta reportes.

> **AVISO:** Los datos incluidos son catastrales **sintéticos** con fines educativos y experimentales.
> **No representan información oficial del Municipio del Distrito Metropolitano de Quito.**
> Los sectores (Centro Histórico, Iñaquito, La Carolina, La Mariscal, Quitumbe, Calderón) son
> zonas de demostración aproximadas, no parroquias ni límites catastrales verificados.

## Objetivo

Comparar —en el marco de un benchmark— la corrección geoespacial, la validez de resultados, la arquitectura y la robustez de una aplicación de evaluación de calidad catastral, sin backend, sin claves de API y desplegable en GitHub Pages.

## Instalación y ejecución

```bash
npm install
npm run dev        # servidor de desarrollo (Vite)
npm test           # pruebas automatizadas (Vitest)
npm run build      # build de producción en dist/
npm run generate-data  # regenera los datos sintéticos (semilla fija)
```

Todo funciona offline salvo la cartografía base del mapa (OpenFreeMap, gratuita y sin claves); si no hay red, la aplicación sigue siendo utilizable (fondo neutro, sin capa base).

## Tecnologías

| Tecnología | Uso |
|---|---|
| Vite 7 | herramienta de desarrollo y build (base `./` para subrutas de GitHub Pages) |
| JavaScript ES Modules | lenguaje, sin framework |
| MapLibre GL JS 5 | render del mapa vectorial |
| Turf.js 7 | operaciones geoespaciales (área geodésica, intersección, kinks) |
| Vitest 3 | pruebas unitarias en Node (sin DOM) |

Sin React/Vue/Angular, sin Python, sin base de datos, sin backend.

## Arquitectura

```
scripts/generate-data.mjs      generador reproducible de datos + errores inyectados
public/data/*.geojson          datos de demostración (carga automática)
data/expected_issues.json      referencia de errores inyectados (artefacto de generación)
src/
  config/constants.js          sectores, dominios, esquema, registro de reglas, tolerancias
  core/
    dataLoader.js              parseo/validación de GeoJSON (sin DOM)
    engine.js                  orquestador de la evaluación (sin DOM)
    indicators.js              agregación sin doble conteo
    exporters.js               CSV / JSON de incidencias y resumen
    validation/
      attributes.js            calidad alfanumérica (ALP-*)
      geometry.js              calidad geométrica (GEO-*, STR-005/006)
      topology.js              superposiciones vs contactos (TOP-001)
      area.js                  superficie geodésica vs registrada (SUP-*)
  map/mapView.js               único módulo que importa MapLibre
  ui/                          controles, tabla, indicadores (API DOM, sin innerHTML)
  main.js                      controlador de la aplicación
tests/                         8 archivos, 50 pruebas (20+ escenarios exigidos)
```

La lógica de evaluación (`src/core/**`) **no importa MapLibre ni toca el DOM**: se ejecuta igual en Node (Vitest) que en el navegador.

## Modelo de datos

Cada feature es un `Feature` GeoJSON (RFC 7946) con geometría `Polygon` y estos atributos:

| Campo | Tipo | Obligatorio | Dominio / nota |
|---|---|---|---|
| `id_predio` | string | sí | único en el dataset (regla ALP-001) |
| `clave_catastral` | string | sí | única en el dataset (ALP-002); identificadores ficticios |
| `sector` | string | sí | Centro Histórico, Iñaquito, La Carolina, La Mariscal, Quitumbe, Calderón |
| `direccion` | string | no | texto libre sintético |
| `area_terreno_m2` | number | sí | superficie registrada, > 0 |
| `area_construida_m2` | number | sí | ≥ 0 |
| `pisos` | integer | sí | ≥ 1 |
| `uso_suelo` | string | sí | residencial, comercial, industrial, institucional, mixto |
| `estado_predio` | string | sí | ocupado, desocupado, en_construccion |
| `fecha_actualizacion` | string | no | formato AAAA-MM-DD (solo se verifica formato) |

## Datos sintéticos

`public/data/quito_predios_sinteticos.geojson`: **68 predios** (66 en seis filas sectoriales + 2 superpuestos), generados por `scripts/generate-data.mjs` con **semilla fija** `20261031` (PRNG mulberry32). Rectángulos de 14–26 m × 12–20 m en coordenadas WGS84 `[lon, lat]`; los consecutivos de cada fila **comparten borde exacto** (60 pares) sin superponerse. Áreas calculadas con método geodésico (`turf.area` sobre el elipsoide WGS84).

Errores inyectados (documentados en `data/expected_issues.json`; pueden coexistir en un mismo predio):

- 3 predios con claves catastrales duplicadas (6 features marcadas: original y duplicado)
- 3 predios con atributos obligatorios nulos
- 2 predios con superficie registrada negativa
- 2 predios con tipos de datos incorrectos
- 2 pares de predios superpuestos
- 2 predios con geometrías autointersecadas (bowtie)
- 3 predios con diferencias de superficie > 5 % (12 %, 15 %, 25 %)
- 2 predios con valores fuera de dominio
- Extras: 1 predio con `pisos` negativo, 1 predio con área construida implausible (advertencia ALP-008)

## Reglas implementadas

Códigos estables; severidad **error** = regla evaluada y fallida; **advertencia** = requiere revisión humana.

| Código | Regla | Dimensión | Severidad |
|---|---|---|---|
| STR-001 | JSON malformado | consistencia lógica | error |
| STR-002 | FeatureCollection inválido | consistencia lógica | error |
| STR-003 | Colección vacía | completitud | error |
| STR-004 | Estructura de feature incorrecta | consistencia lógica | error |
| STR-005 | Geometría nula | consistencia lógica | error |
| STR-006 | Geometría no admitida (no Polygon/MultiPolygon) | consistencia lógica | advertencia |
| ALP-001 | Identificador duplicado | consistencia lógica | error |
| ALP-002 | Clave catastral duplicada | consistencia lógica | error |
| ALP-003 | Campo obligatorio nulo o vacío | completitud | error |
| ALP-004 | Tipo de dato incorrecto | consistencia lógica | error |
| ALP-005 | Superficie registrada negativa | consistencia lógica | error |
| ALP-006 | Número de pisos negativo o no entero | consistencia lógica | error |
| ALP-007 | Valor fuera de dominio | exactitud temática | error |
| ALP-008 | Inconsistencia área construida vs pisos (ratio ∉ [0.2, 3]) | exactitud temática | advertencia |
| ALP-009 | Formato de fecha inválido (AAAA-MM-DD) | calidad temporal | advertencia |
| GEO-001 | Coordenadas fuera de rango | exactitud posicional | error |
| GEO-002 | Geometría vacía | consistencia lógica | error |
| GEO-003 | Anillo no cerrado | consistencia lógica | error |
| GEO-004 | Autointersección (vía `turf.kinks`) | consistencia lógica | error |
| GEO-005 | Geometría duplicada (igualdad exacta) | consistencia lógica | advertencia |
| GEO-006 | Polígono de área cero (< 0.01 m²) | consistencia lógica | error |
| TOP-001 | Superposición entre predios (intersección > 0.01 m²) | consistencia lógica | error |
| SUP-001 | Diferencia de superficie fuera de tolerancia (5 % por defecto) | exactitud temática | error |
| SUP-002 | Superficie registrada nula o cero (comparación no computable) | completitud | advertencia |

### Contacto vs superposición (TOP-001)

La intersección de dos polígonos se clasifica en: disjunto, **contacto en vértice**, **contacto en borde** o **superposición** (área de intersección > 0.01 m²). Compartir borde o vértice **no** se clasifica como superposición (cubierto por pruebas explícitas). La clasificación usa `turf.intersect` (v7, FeatureCollection de dos features); si la intersección devuelve null pese a contacto detectado por bbox, se verifica vértice-sobre-borde con `booleanPointOnLine` (precisión 7 decimales ≈ 1 cm).

### Modelo de incidencias

Cada incidencia contiene: `id` único (`INC-#####`), `rule_code`, `feature_ref` (predio afectado o `(dataset)`), `dimension`, `severity`, `description`, `observed_value`, `criterion`. Las reglas no ejecutables se listan como **no evaluadas** (corrida con reglas apagadas, geometrías inválidas que hacen no confiable el área, superficie registrada no numérica, etc.): nunca se convierte una validación incompleta en resultado satisfactorio.

## Metodología de cálculo de superficies

- **Área geométrica**: `turf.area` → integración geodésica sobre el elipsoide WGS84 (no euclidiana sobre grados).
- **Diferencia absoluta** = |geométrica − registrada|; **diferencia porcentual** = diferencia / geométrica × 100.
- Tolerancia configurable, 5 % por defecto. **Valor experimental de este laboratorio**: no procede de ISO ni del Municipio de Quito.
- Manejo de casos borde: registrada ≤ 0, geométrica ≈ 0 o geometría inválida → comparación **no evaluada** (SUP-001 en `notEvaluated`), con SUP-002 cuando la registrada es 0.

## Sistemas de referencia

- **WGS84 geográfico (EPSG:4326)**: CRS de origen y destino de GeoJSON según RFC 7946; orden de coordenadas **[longitud, latitud]**. La aplicación lo aplica y lo verifica (GEO-001).
- **WGS84 / UTM zona 17S (EPSG:32717)**: proyección transversal de Mercator usada comúnmente en cartografía de la zona de Quito; no se usa aquí, pero es la proyección estándar regional para cálculos planimétros a escala local.
- **TMQ (Proyección Transversal de Mercator Quito)**: proyección local usada por el Municipio de Quito (datum propio de su sistema cartográfico). **No es UTM**: tiene parámetros propios (origen en Quito) y no debe confundirse con la zona 17S.
- La aplicación **no** afirma precisión topográfica ni catastral oficial; las áreas son geodésicas sobre WGS84.

## Dimensiones de calidad (referencia conceptual ISO 19157-1:2023)

Organizadas conceptualmente como: completitud, consistencia lógica, exactitud posicional, exactitud temática y calidad temporal. **No se afirma certificación ISO.** Las dimensiones que exigen datos de referencia independientes se declaran **no evaluadas**:

- *Exactitud posicional* real: requiere catastro oficial con precisión certificado (no disponible).
- *Calidad temporal* (veracidad/vigencia): solo se verifica formato de fecha (ALP-009), no la verdad del dato.

## Pruebas

`npm test` — 8 archivos, 50 pruebas, 20+ escenarios exigidos:

| Escenario | Archivo |
|---|---|
| FeatureCollection válido, JSON malformado, colección vacía, FC inválido | `tests/structural.test.js` |
| Clave duplicada, ID duplicado, obligatorio vacío, superficie negativa, pisos inválido, tipos, dominios, modelo de incidencias | `tests/attributes.test.js` |
| Geometría nula, coordenadas fuera de rango, anillo no cerrado, autointersección, duplicadas, área cero, vacía, no admitida | `tests/geometry.test.js` |
| Solapamiento parcial, contacto en borde sin solaparse, contacto en vértice, disjuntos | `tests/topology.test.js` |
| Superficie fuera/dentro de tolerancia, tolerancia configurable, registrada cero, metodología geodésica | `tests/area.test.js` |
| Indicadores sin doble conteo, reglas deshabilitadas → no evaluadas | `tests/indicators.test.js` |
| Exportación CSV (RFC 4180), JSON de incidencias, resumen | `tests/exporters.test.js` |
| Dataset de demostración (68 predios, sectores, familias de errores, sin falsos positivos de borde) | `tests/dataset.test.js` |

Los tests incluyen **casos negativos** (predios que comparten borde no disparan TOP-001; diferencias dentro de tolerancia no disparan SUP-001; geometrías distintas no disparan GEO-005).

## Limitaciones conocidas

- Detección de autointersión por `turf.kinks`: cubre autointersecciones de anillos, no todos los defectos OGC (huecos, anillos mal orientados en MultiPolygon).
- GEO-005 detecta **igualdad exacta** de coordenadas; geometrías equivalentes con vértices adicionales no se detectan.
- TOP-001 es O(n²) con prefiltro por bounding box: suficiente para decenas/miles de predios; para catálogos grandes convendría un índice espacial.
- Tolerancia de superposición 0.01 m²: polígonos con micro-solapamientos menores por redondeo no se marcan (decidido a favor de reducir falsos positivos).
- El área de polígonos inválidos (autointersecados) puede ser engañosamente calculable; por eso SUP-001 se declara **no evaluada** en esos casos.
- Cartografía base remota (OpenFreeMap): sin ella el mapa carece de fondo, pero el análisis funciona.
- Archivos GeoJSON: límite práctico de 25 MB documentado en la UI.

## Despliegue en GitHub Pages

1. `npm run build` genera `dist/` con rutas relativas (`base: './'`), apto para subrutas tipo `https://usuario.github.io/repositorio/`.
2. Publique el contenido de `dist/` en la rama/raíz que use GitHub Pages (acción propia o `peaceiris/actions-gh-pages`), incluyendo `dist/data/quito_predios_sinteticos.geojson`.
3. No se configura ningún despliegue automático en este repositorio.

## Seguridad y privacidad

- Validación de archivo antes de procesar (tamaño, JSON, FeatureCollection).
- Popups construidos con API DOM/`textContent`: sin inyección HTML.
- Procesamiento 100 % local: los datos cargados no se envían a ningún servicio externo.
- Sin datos personales ni catastrales reales.
- Una feature inválida no bloquea la evaluación del resto del dataset.
