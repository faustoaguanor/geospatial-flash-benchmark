# Quito Cadastre Quality Lab

Laboratorio web de análisis de calidad de información catastral vectorial **sintética** del Distrito Metropolitano de Quito, Ecuador.

> ⚠ **Aviso**: los datos catastrales de esta aplicación son **sintéticos**, con fines educativos y experimentales. **No representan información oficial** del Municipio del Distrito Metropolitano de Quito. La aplicación no afirma precisión topográfica ni catastral oficial, ni constituye una certificación de ningún tipo.

---

## Descripción

Aplicación GIS de una sola página (SPA) que permite:

- Cargar archivos GeoJSON (o usar un conjunto de demostración de 72 predios sintéticos).
- Visualizar los predios en un mapa de Quito con simbología por estado de calidad.
- Ejecutar reglas de validación estructural, alfanumérica, geométrica, topológica y de superficies.
- Distinguir **errores comprobados**, **advertencias** (requieren revisión) e **incidencias informativas**.
- Calcular indicadores de calidad sin doble conteo de predios.
- Filtrar y localizar incidencias.
- Exportar reportes en CSV y JSON.

Todo el procesamiento se realiza **localmente en el navegador**. No hay backend, no se transmiten datos a servicios externos y no se usan APIs comerciales ni claves privadas.

## Objetivo

Servir como laboratorio experimental para evaluar dimensiones de calidad de información catastral (organizadas de forma conceptual según ISO 19157-1:2023) sobre datos vectoriales tipo predio, con transparencia total sobre qué se evalúa, cómo y con qué tolerancias.

## Contexto de Quito

El conjunto de demostración representa lotes urbanos ficticios en ubicaciones aproximadas de seis sectores de referencia del Distrito Metropolitano de Quito: **Centro Histórico, Iñaquito, La Carolina, La Mariscal, Quitumbe y Calderón**.

Estos nombres se tratan como **sectores de demostración**: no se usan límites administrativos ni parroquiales oficiales, ni se afirma que las geometrías correspondan a predios reales.

## Instalación

Requisitos: Node.js 18 o superior.

```bash
npm install
npm run dev        # servidor de desarrollo (http://localhost:5173)
npm test           # suite de pruebas (Vitest)
npm run build      # build de producción en dist/
npm run preview    # sirve el build de producción
npm run generate:data  # regenera los datos sintéticos (semilla fija)
```

> Nota: si tu entorno define `NODE_ENV=production`, instala con `npm install --include=dev` para incluir Vitest y Vite.

## Tecnologías

- **Vite** — bundler y servidor de desarrollo.
- **JavaScript ES Modules** — sin frameworks de UI.
- **MapLibre GL JS** — mapa (cartografía base ráster de OpenStreetMap, gratuita y sin clave).
- **Turf.js** — geoprocesamiento (áreas geodésicas, intersecciones, líneas).
- **Vitest** — pruebas automatizadas.
- **HTML5 / CSS3** — estructura y estilos.

## Arquitectura

```
├── index.html                     # Shell del dashboard
├── public/data/
│   └── quito_predios_sinteticos.geojson   # Datos de demostración (generados)
├── data/
│   └── expected_issues.json       # Errores intencionales del conjunto (referencia de generación)
├── scripts/
│   └── generate-predios.mjs       # Generador reproducible (semilla fija)
├── src/
│   ├── main.js                    # Orquestación de la interfaz
│   ├── styles.css
│   └── modules/
│       ├── config.js              # Dominios, campos, sectores, catálogo de reglas
│       ├── incidentModel.js       # Modelo de incidencias e IDs únicos
│       ├── dataModel.js           # Diccionario de atributos y dominios
│       ├── structuralValidation.js# JSON malformado, FC inválido, geometrías nulas…
│       ├── attributeQuality.js    # Duplicados, obligatorios, tipos, dominios…
│       ├── geometricQuality.js    # Rango, cierre, autointersección, duplicadas, área cero
│       ├── topologyAnalysis.js    # Solapamientos y contactos borde/vértice
│       ├── surfaceAnalysis.js     # Áreas geodésicas vs registradas
│       ├── indicators.js          # Indicadores sin doble conteo
│       ├── qualityEngine.js       # Orquestador (sin DOM, testeable en Node)
│       ├── exporter.js            # CSV / JSON / resumen
│       ├── fileLoader.js          # Lectura y validación de archivos locales
│       ├── map.js                 # MapLibre, capas, popups (escape HTML)
│       └── ui.js                  # Indicadores, tabla, filtros, reglas
└── tests/                         # 56 pruebas Vitest (20+ escenarios)
```

La lógica de evaluación (`qualityEngine.js` y módulos de reglas) **no accede al DOM ni inicializa MapLibre**: se ejecuta igual en Node (por eso las pruebas corren en entorno `node`).

## Modelo de datos

Cada feature es un `Polygon` (o `MultiPolygon`) con estas propiedades:

| Atributo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id_predio` | string | ✔ | Identificador único del predio (ficticio, prefijo `SIM-`). |
| `clave_catastral` | string | ✔ | Clave catastral única (ficticia, prefijo `SIM-`). |
| `sector` | string | ✔ | Sector de demostración (dominio de 6 valores). |
| `direccion` | string | ✔ | Dirección ficticia. |
| `area_terreno_m2` | number | ✔ | Área de terreno registrada (m²). |
| `area_construida_m2` | number | ✔ | Área construida registrada (m²). |
| `num_pisos` | integer | ✔ | Número de pisos (0–60). |
| `ano_construccion` | integer | ✖ | Año de construcción (1800–2026). |
| `uso_suelo` | string | ✔ | Dominio: Residencial, Comercial, Mixto, Industrial, Institucional, Recreación. |
| `estado_conservacion` | string | ✖ | Dominio: Bueno, Regular, Malo. |
| `fuente` | string | ✖ | Origen de los datos (siempre "sintético"). |

### Dominios configurados

- `sector`: Centro Histórico, Iñaquito, La Carolina, La Mariscal, Quitumbe, Calderón.
- `uso_suelo`: Residencial, Comercial, Mixto, Industrial, Institucional, Recreación.
- `estado_conservacion`: Bueno, Regular, Malo.

Los dominios, campos obligatorios y umbrales son **parámetros de este experimento**, configurables en `src/modules/config.js`.

## Reglas implementadas

Códigos de regla estables (ver `RULE_CATALOG` en `config.js`):

### Estructurales (no configurables, siempre activas)
| Código | Severidad | Descripción |
|---|---|---|
| `ESTRUCT_JSON_MALFORMADO` | error | El texto no es JSON válido. |
| `ESTRUCT_FC_INVALIDO` | error | No es un FeatureCollection GeoJSON. |
| `ESTRUCT_COLECCION_VACIA` | warning | Colección sin features. |
| `ESTRUCT_FEATURE_INVALIDO` | error | Feature con estructura incorrecta. |
| `ESTRUCT_GEOMETRIA_NULA` | error | Geometría nula. |
| `ESTRUCT_GEOMETRIA_NO_SOPORTADA` | error | Geometría distinta de Polygon/MultiPolygon. |

### Alfanuméricas
| Código | Severidad | Descripción |
|---|---|---|
| `ALFA_ID_DUPLICADO` | error | `id_predio` duplicado. |
| `ALFA_CLAVE_DUPLICADA` | error | `clave_catastral` duplicada. |
| `ALFA_CAMPO_OBLIGATORIO_NULO` | error | Campo obligatorio nulo o vacío. |
| `ALFA_TIPO_DATO_INCORRECTO` | error | Tipo de dato incorrecto. |
| `ALFA_SUPERFICIE_NEGATIVA` | error | Superficie negativa. |
| `ALFA_NUM_PISOS_INVALIDO` | error | Pisos negativos, no enteros o fuera de rango. |
| `ALFA_VALOR_FUERA_DOMINIO` | error | Valor fuera de los dominios configurados. |
| `ALFA_INCONSISTENCIA_AREA_PISOS` | warning | Área construida > área terreno × pisos (revisión). |

### Geométricas
| Código | Severidad | Descripción |
|---|---|---|
| `GEOM_COORD_FUERA_RANGO` | error | Coordenadas fuera de rango WGS84 o no finitas. |
| `GEOM_VACIA` | error | Geometría sin posiciones. |
| `GEOM_ANILLO_NO_CERRADO` | error | Primer y último vértice del anillo distintos. |
| `GEOM_AUTOINTERSECCION` | error | Anillo autointersecado. |
| `GEOM_DUPLICADA` | error | Dos predios con geometría idéntica. |
| `GEOM_AREA_CERO` | error | Área geodésica < 0.01 m². |

### Topológicas
| Código | Severidad | Descripción |
|---|---|---|
| `TOPO_SOLAPAMIENTO` | error | Superposición con área positiva (> 0.01 m²). |
| `TOPO_CONTACTO_BORDE` | info | Comparten un tramo de borde (válido, no es solapamiento). |
| `TOPO_CONTACTO_VERTICE` | info | Se tocan en un vértice (válido, no es solapamiento). |

### Superficies
| Código | Severidad | Descripción |
|---|---|---|
| `SUP_FUERA_TOLERANCIA` | warning | |Δ| entre área geométrica y registrada > tolerancia. |
| `SUP_VALOR_INVALIDO` | error | Área registrada nula, no numérica, cero o negativa. |

**Dimensiones de calidad** (organización conceptual basada en ISO 19157-1:2023): `completitud`, `consistencia_logica`, `exactitud_tematica`. No se afirman dimensiones que requieran datos de referencia independientes (p. ej. exactitud posicional frente a una fuente oficial) porque no existen en este experimento. **No hay certificación ISO.**

## Metodología de cálculo

- **Área geométrica**: cálculo **geodésico** sobre el elipsoide WGS84 (fórmula del área esférica excesiva, vía `@turf/area`). Nunca se calculan áreas euclidianas directamente sobre grados.
- **Diferencia porcentual**: `|área geométrica − área registrada| / área registrada`. El área registrada es el valor de referencia. Si no es utilizable (nula, cero, negativa, no numérica), la comparación se marca como **no evaluable** y se emite `SUP_VALOR_INVALIDO`.
- **Tolerancia de superficie**: 5 % por defecto, configurable en la interfaz. **Valor exclusivamente experimental de este proyecto**: no corresponde a una norma ISO ni a un estándar del Municipio de Quito.
- **Autointersección**: algoritmo propio de intersección estricta de segmentos (test de orientación) sobre cada anillo, excluyendo pares de segmentos adyacentes.
- **Topología**: rechazo rápido por bounding box; `turf.intersect` para el solape (área de intersección > 0.01 m² = superposición); `turf.lineOverlap` para contacto por borde; `turf.lineIntersect` para contacto por vértice. **Compartir borde o vértice nunca se clasifica como superposición.**

### Tolerancias numéricas documentadas

| Tolerancia | Valor | Aplicación |
|---|---|---|
| Cierre de anillo | 1e-9 grados | Absorbe ruido de serialización. |
| Área cero | 0.01 m² | `GEOM_AREA_CERO` y umbral de comparabilidad. |
| Solapamiento | 0.01 m² | Área mínima de intersección para considerarla superposición. |
| Línea compartida | 1e-7 grados | `lineOverlap` para contacto por borde. |
| Intersección de segmentos | 1e-12 (producto cruzado) | Test estricto de cruce. |

### Limitaciones de los algoritmos

- La detección de autointersección cubre **cruces estrictos** entre segmentos no adyacentes; los solapes colineales entre segmentos no adyacentes no se detectan.
- Pares de geometrías degeneradas que hacen fallar a Turf se omiten del análisis de pares (se registran internamente como pares omitidos).
- El análisis topológico es **O(n²)**: para colecciones grandes (> ~5 000 predios) puede ser lento en el navegador.

## Sistemas de referencia

- **Entrada/salida (GeoJSON)**: WGS84 geográfico, coordenadas `[longitud, latitud]`, conforme a **RFC 7946**.
- **WGS84 / UTM zona 17 Sur (EPSG:32717)**: proyección Universal Transversa de Mercator usada en Ecuador para análisis métricos regionales; no se emplea en esta aplicación (las áreas se calculan geodésicamente).
- **TMQ (Transversa Mercator Quito)**: proyección cartográfica local adoptada por la normativa cartográfica del DMQ para escalas urbanas (datum WGS84, meridiano central próximo a 78°30′ O y factor de escala cercano a 0.9992, definido por ordenanza metropolitana). **No debe confundirse con UTM 17S**: es una proyección local con parámetros propios y sin código EPSG consolidado. Esta aplicación no realiza transformaciones hacia TMQ ni UTM.
- La aplicación **no afirma precisión topográfica ni catastral oficial** en ningún resultado.

## Datos sintéticos de demostración

Generados por `scripts/generate-predios.mjs` con **semilla fija (20260214)** → resultado determinista y reproducible:

- 72 predios ficticios (12 por sector), lotes urbanos pequeños (≈ 14–32 m por lado).
- Áreas geométricas calculadas geodésicamente; áreas registradas coherentes (±2 %) salvo errores intencionales.
- Archivo: `public/data/quito_predios_sinteticos.geojson`.
- Referencia de errores: `data/expected_issues.json` — **es la referencia de generación, no una prueba independiente de que el validador sea correcto**.

### Errores intencionales incluidos

| Error | Cantidad |
|---|---|
| Claves catastrales duplicadas | 3 |
| Atributos obligatorios nulos | 3 |
| Superficies negativas | 2 |
| Tipos de dato incorrectos | 2 |
| Pares de predios superpuestos | 2 pares |
| Geometrías autointersecadas | 2 |
| Diferencias de superficie > 5 % | 3 |
| Valores fuera de dominio | 2 |
| Par que comparte borde sin superponerse | 1 par (válido → incidencia informativa) |
| Geometrías duplicadas | 1 par |

**Coexistencias de errores documentadas** (también en `data/expected_issues.json`):

- Los predios autointersecados (forma de "moño") generan además `SUP_FUERA_TOLERANCIA`, porque el área geodésica de un anillo autointersecado difiere del lote rectangular previsto.
- El predio con `area_terreno_m2` como cadena genera además `SUP_VALOR_INVALIDO`.
- El predio con área registrada reducida al 55 % genera además `ALFA_INCONSISTENCIA_AREA_PISOS`.
- El par con geometría duplicada se reporta **solo** como `GEOM_DUPLICADA` (no se duplica como solapamiento).
- Los pares superpuestos se reportan una vez por par, con ambos predios relacionados.

Anomalías estructurales incompatibles con un GeoJSON utilizable (p. ej. anillo abierto) **no** se introducen en el archivo principal; se cubren en las pruebas unitarias con entidades de prueba dedicadas.

## Pruebas

56 pruebas en 7 archivos (`tests/`), incluyendo los 20 escenarios requeridos, con entradas y resultados esperados explícitos y casos negativos (p. ej. compartir borde **no** es solapamiento; geometrías duplicadas no se reportan dos veces; claves distintas no generan duplicados):

1. FeatureCollection válido (sin incidencias).
2. Clave catastral duplicada.
3. ID duplicado.
4. Campo obligatorio vacío.
5. Superficie negativa.
6. Número de pisos inválido.
7. Geometría nula.
8. Coordenadas fuera de rango.
9. Anillo no cerrado.
10. Polígono autointersecado.
11. Solapamiento parcial de predios.
12. Predios que comparten borde sin solaparse (caso negativo de solapamiento).
13. Geometrías duplicadas (y no duplicadas como solapamiento).
14. Superficie fuera de tolerancia.
15. Superficie dentro de tolerancia.
16. Superficie registrada igual a cero.
17. JSON malformado.
18. FeatureCollection vacío (reglas no evaluadas).
19. Exportación correcta de incidencias (CSV/JSON).
20. Indicadores sin doble conteo.

Adicionales: contacto en vértice, desactivación de reglas, geometría vacía, área cero, tipo de geometría no soportado, reproducibilidad del generador (hash idéntico), cobertura de las incidencias esperadas del conjunto de demostración.

Los resultados esperados **no** se modificaron para que los tests pasaran; los fallos detectados durante el desarrollo se corrigieron en el código o en errores de los propios tests (documentado en el historial del experimento).

## Seguridad y robustez

- Los archivos se validan (extensión, tamaño ≤ 20 MB, JSON) antes de procesarse.
- Los popups y la tabla construyen HTML con **escape de caracteres** (sin inyección HTML desde atributos).
- Ninguna entidad inválida bloquea la aplicación: los errores se reportan como incidencias y el resto del conjunto se evalúa.
- Los datos cargados **no se transmiten** a ningún servicio externo; el único tráfico de red es la cartografía base de OpenStreetMap.
- No se utilizan datos personales ni catastrales reales.

## Compilación

```bash
npm run build     # genera dist/ (base relativa './', apta para subrutas)
npm run preview   # verifica el build localmente
```

## Despliegue en GitHub Pages

El `vite.config.js` usa `base: './'` (relativo), por lo que el build funciona bajo cualquier subruta sin cambios:

1. `npm run build`
2. Publica el contenido de `dist/` en la rama `gh-pages` (o en la carpeta `/docs` de `main`, o con GitHub Actions). Ejemplo con `gh-pages`:
   ```bash
   npx gh-pages -d dist
   ```
3. La aplicación quedará disponible en `https://<usuario>.github.io/<repo>/`.

Si prefieres fijar la ruta, define la variable de entorno `VITE_BASE=/nombre-del-repo/` antes del build.

**No se publica automáticamente nada** desde este repositorio: el despliegue es un paso manual y explícito.

## Limitaciones conocidas

- Análisis topológico O(n²); no apto para decenas de miles de predios en el navegador.
- No se detectan solapes colineales entre segmentos no adyacentes de un mismo anillo.
- No se evalúan dimensiones de calidad que requieren datos de referencia independientes (exactitud posicional absoluta, calidad temporal).
- La detección de contacto por borde depende de que los vértices compartidos coincidan (tras tolerancias); contactos con desplazamientos sub-métricos pueden clasificarse como solapamiento pequeño o omitirse.
- La cartografía base depende de la disponibilidad de los tiles de OpenStreetMap.
- Reglas como `ALFA_INCONSISTENCIA_AREA_PISOS` son heurísticas de revisión (advertencias), no veredictos.

## Comandos

| Comando | Acción |
|---|---|
| `npm run dev` | Servidor de desarrollo. |
| `npm test` | Suite completa de Vitest. |
| `npm run build` | Build de producción en `dist/`. |
| `npm run preview` | Sirve `dist/` localmente. |
| `npm run generate:data` | Regenera los datos sintéticos y `expected_issues.json`. |
