# Quito Cadastre Quality Lab

Aplicación web estática para evaluar la calidad de información catastral vectorial sintética
del Distrito Metropolitano de Quito, Ecuador. Carga GeoJSON, valida estructura, atributos,
geometrías, topología y superficies, presenta indicadores y permite exportar los resultados.

> **Aviso:** Datos catastrales sintéticos con fines educativos y experimentales. No representan
> información oficial del Municipio del Distrito Metropolitano de Quito. Esta aplicación no está
> certificada por ISO ni sustituye un proceso catastral oficial.

---

## 1. Descripción y objetivo

Quito Cadastre Quality Lab es un laboratorio reproducible que demuestra, de extremo a extremo,
cómo evaluar la calidad de un conjunto de predios vectoriales:

- Carga automática de una muestra sintética de Quito al iniciar.
- Carga de archivos GeoJSON suministrados por el usuario.
- Motor de reglas independiente del DOM y de MapLibre.
- Detección de problemas estructurales, alfanuméricos, geométricos, topológicos y de superficie.
- Comparación entre área registrada y área geométrica geodésica.
- Visualización de predios y del estado de calidad en un mapa.
- Indicadores por predio, no por incidencia, para evitar doble conteo.
- Exportación de incidencias a CSV/JSON y de un resumen de evaluación a JSON.
- Pruebas automatizadas con entradas y resultados explícitos.

El objetivo es construir una aplicación funcional y verificable, no una maqueta visual, que pueda
publicarse en GitHub Pages sin backend, sin base de datos y sin claves de API.

---

## 2. Contexto geográfico: Quito

El mapa está centrado en el Distrito Metropolitano de Quito. Los datos de demostración se
distribuyen en seis **sectores de demostración**:

- Centro Histórico
- Iñaquito
- La Carolina
- La Mariscal
- Quitumbe
- Calderón

Estos nombres se usan como referencias aproximadas de localización. **No son límites
administrativos oficiales ni polígonos parroquiales verificados.** Los predios son ficticios y se
ubican de forma razonable cerca de las coordenadas aproximadas de cada sector.

El archivo principal contiene **72 predios** (12 por sector), generados con semilla fija
`20261031` para garantizar reproducibilidad.

---

## 3. Inicio rápido

Requisitos: Node.js 20+ (probado con Node 24.16.0 y npm 12.2.0) y un navegador moderno con WebGL.

```bash
npm install
npm run dev       # servidor de desarrollo Vite
npm test          # pruebas automatizadas con Vitest
npm run build     # compilación de producción en dist/
npm run preview   # previsualización de la compilación
npm run generate:data  # regenera los datos sintéticos y expected_issues.json
```

> El repositorio incluye `.npmrc` con `include=dev` para que `npm install` instale Vite y Vitest
> incluso si el entorno define `NODE_ENV=production`. Si su instalación aún los omite, use
> `npm install --include=dev`.

La aplicación carga automáticamente `public/data/quito_predios_sinteticos.geojson` y ejecuta la
evaluación al iniciar. El botón **Cargar datos de demostración** restaura ese conjunto en cualquier
momento.

---

## 4. Tecnologías

| Tecnología | Uso |
| --- | --- |
| Vite | Servidor de desarrollo y compilación estática |
| JavaScript ES Modules | Código de aplicación, sin framework de UI |
| MapLibre GL JS | Mapa interactivo y capas de predios |
| Turf.js | Área geodésica, intersecciones, autointersecciones y utilidades espaciales |
| Vitest | Pruebas unitarias e integración |
| HTML5 + CSS3 | Interfaz responsive en español |
| OpenStreetMap (teselas ráster) | Cartografía base gratuita, sin clave de API |

No se usa React, Vue, Angular, Python, base de datos, backend ni APIs comerciales con claves
privadas. Todo el procesamiento catastral ocurre en el navegador.

---

## 5. Funcionalidades

### Carga y control

- Carga automática de datos de demostración al iniciar.
- Carga de archivos `.geojson`/`.json` con validación de extensión y límite de 25 MB.
- Botón para restaurar el conjunto de demostración.
- Ejecución manual de la evaluación.
- Activación/desactivación de las 19 reglas evaluables no estructurales.
- Tolerancia de superficie configurable entre 0 % y 100 % (5 % por defecto).
- Las reglas estructurales `STR-*` permanecen siempre activas.

### Mapa

- Centrado en Quito, con teselas gratuitas de OpenStreetMap.
- Predios coloreados por estado: error, advertencia o sin errores comprobados.
- Leyenda, selector de sector y botón «Ver todos».
- Filtro por sector con zoom al sector elegido.
- Ventanas emergentes con atributos del predio, construidas con `textContent` (sin HTML inyectado).
- Resaltado de predios localizados desde la tabla o seleccionados.
- Zoom a uno o varios predios seleccionados.

### Indicadores

- Total de predios evaluables.
- Predios sin errores comprobados.
- Predios con errores.
- Predios con advertencias (puede solaparse con errores).
- Total de incidencias.
- Porcentaje de predios sin errores comprobados.

Cada predio se cuenta una sola vez por indicador mediante un identificador interno de entidad
independiente del `id` catastral, por lo que un `id` duplicado no colapsa el conteo.

### Tabla de incidencias

- Búsqueda por identificador de predio o de incidencia.
- Filtro por severidad y por regla.
- Selección individual o de todas las incidencias visibles filtradas.
- Localización de una incidencia o de todas las seleccionadas en el mapa.
- Descripciones y valores observados sin interpretación de HTML.
- Límite de 500 filas renderizadas; las exportaciones incluyen todas las incidencias filtradas.

### Exportación

- **Incidencias CSV**, con encabezado en español y escape de comas, comillas y saltos de línea.
- **Incidencias JSON**, con total e incidencias.
- **Resumen JSON**, con indicadores, dimensiones, topología, superficies, configuración de reglas y
  reglas no evaluadas.
- Mitigación de inyección de fórmulas en CSV: valores que comienzan por `=`, `+`, `@`, tabulador o
  retorno de carro se prefijan con apóstrofo.
- Las exportaciones de incidencias respetan los filtros activos de la tabla.

---

## 6. Arquitectura

La lógica de evaluación no importa MapLibre ni accede al DOM. Esto permite ejecutarla en Node,
probarla con Vitest y reutilizarla en otra interfaz.

```text
.
├── index.html
├── package.json
├── vite.config.js                 # base './' para GitHub Pages
├── scripts/
│   └── generate-data.mjs          # generador reproducible con semilla fija
├── public/
│   └── data/
│       └── quito_predios_sinteticos.geojson
├── data/
│   └── expected_issues.json       # referencia de errores inyectados
├── src/
│   ├── main.js
│   ├── styles.css
│   ├── core/
│   │   ├── constants.js           # reglas, dominios, sectores, tolerancias
│   │   ├── geojson.js             # utilidades GeoJSON puras
│   │   ├── issue.js               # modelo e IDs de incidencia
│   │   ├── structure.js           # validación estructural
│   │   ├── attributes.js          # calidad alfanumérica
│   │   ├── geometry.js            # área, vacíos, anillos, autointersección
│   │   ├── topology.js            # solape vs. borde vs. vértice
│   │   ├── surface.js             # comparación de superficies
│   │   ├── indicators.js          # indicadores sin doble conteo
│   │   ├── engine.js              # orquestador puro
│   │   └── export.js              # CSV, JSON y resumen
│   └── ui/
│       ├── app.js                 # estado, controles, tabla, filtros, exportación
│       ├── map.js                 # MapLibre, capas, popups, resaltado
│       ├── dom.js                 # constructor de nodos seguro
│       └── format.js              # formato es-EC
└── tests/
    ├── helpers.js
    ├── structure.test.js
    ├── attributes.test.js
    ├── geometry.test.js
    ├── topology.test.js
    ├── surface.test.js
    ├── engine.test.js
    ├── export.test.js
    └── dataset.test.js
```

### Responsabilidades

| Módulo | Responsabilidad |
| --- | --- |
| `core/constants.js` | Catálogo estable de reglas, dimensiones, dominios y tolerancias |
| `core/structure.js` | JSON/FeatureCollection, entidades, geometrías admitidas y anillos |
| `core/attributes.js` | Duplicados, obligatorios, tipos, rangos, dominios, coherencia de pisos |
| `core/geometry.js` | Área geodésica, geometría vacía, coordenadas, cierre y autointersecciones |
| `core/topology.js` | Relaciones entre pares: solape con área positiva, borde, vértice, disjunto |
| `core/surface.js` | Diferencia absoluta y porcentual, tolerancia y casos no evaluables |
| `core/indicators.js` | Conteos por entidad sin doble conteo |
| `core/engine.js` | Orquesta reglas, aplica configuración y produce el resultado |
| `core/export.js` | Serialización CSV/JSON y resumen |
| `ui/map.js` | Mapa, fuentes, capas, filtros, popups y resaltado |
| `ui/app.js` | Estado de la aplicación, controles, tabla, filtros y descargas |

### Flujo de evaluación

1. Se interpreta el texto como JSON; si falla, se emite `STR-001` y no se bloquea la aplicación.
2. Se valida la raíz y cada entidad; las entidades estructuralmente no admitidas se omiten del
   resto de reglas, pero el conjunto continúa evaluándose.
3. Se aplican reglas alfanuméricas sobre las entidades admitidas.
4. Por entidad se calcula el área geodésica, se detectan autointersecciones y se comparan superficies.
5. Se detectan geometrías duplicadas.
6. Se comparan todos los pares de predios con pre-filtro de bounding box.
7. Se ordenan las incidencias, se asignan IDs deterministas `INC-0001...` y se calculan indicadores.
8. La interfaz actualiza mapa, tabla, filtros, indicadores y exportaciones.

---

## 7. Modelo de datos

El archivo es una `FeatureCollection` GeoJSON (RFC 7946). Cada `Feature` tiene geometría
`Polygon` o `MultiPolygon` y las siguientes propiedades:

| Campo | Tipo | Obligatorio | Dominio / unidad | Descripción |
| --- | --- | --- | --- | --- |
| `id` | string | Sí | Único | Identificador ficticio del predio (`QT-<sector>-<seq>`) |
| `clave_catastral` | string | Sí | Única, sin distinguir mayúsculas | Clave catastral inequívocamente ficticia (`DEMO-QT-...`) |
| `sector` | string | Sí | Sectores de demostración | Sector aproximado, no límite oficial |
| `manzana` | string | No | — | Manzana ficticia |
| `lote` | string | No | — | Lote ficticio |
| `direccion_ficticia` | string | No | — | Dirección de demostración, no real |
| `uso_suelo` | string | Sí | `RESIDENCIAL`, `COMERCIAL`, `INDUSTRIAL`, `MIXTO`, `EQUIPAMIENTO`, `AGRICOLA` | Uso de suelo ficticio |
| `estado` | string | Sí | `ACTIVO`, `INACTIVO`, `EN_REVISION` | Estado administrativo ficticio |
| `area_terreno_m2` | number | Sí | m², ≥ 0 | Superficie registrada a comparar |
| `area_construida_m2` | number | Sí | m², ≥ 0 | Superficie construida ficticia |
| `numero_pisos` | number | Sí | entero ≥ 0 | Número de pisos |
| `anio_construccion` | number | No | 1900–2026 | Año ficticio de construcción |
| `avaluo_ficticio_usd` | number | No | USD | Avalúo ficticio, sin valor oficial |
| `fuente` | string | No | — | En la muestra: `SINTETICO` |

Los errores intencionales pueden dejar campos obligatorios nulos, tipos incorrectos o valores fuera
de dominio. La aplicación los informa sin intentar repararlos.

### Modelo de incidencia

```json
{
  "id": "INC-0002",
  "codigoRegla": "GEO-007",
  "predioId": "QT-CH-001",
  "entidadId": "F-1",
  "dimension": "consistencia_logica",
  "severidad": "error",
  "descripcion": "El predio se superpone con \"QT-CH-002\" en 349.16 m² (54.2 % de este predio).",
  "valorObservado": "superposición=349.16 m²; otro_predio=QT-CH-002",
  "criterio": "La intersección poligonal debe superar 1 m² ...",
  "sector": "Centro Histórico"
}
```

`entidadId` es una clave interna (`F-<posición>`) usada solo para conteos; no se exporta en CSV.
`predioId` es el identificador catastral visible. Esto evita doble conteo incluso con IDs duplicados.

---

## 8. Datos sintéticos y errores intencionales

El generador `scripts/generate-data.mjs`:

- Usa una semilla fija (`20261031`) y un generador PRNG determinista.
- Crea una cuadrícula de parcelas urbanas ficticias por sector, con lados de 20–28 m y 22–30 m.
- Usa WGS84 y orden `[longitud, latitud]`.
- Calcula áreas geométricas con Turf y genera áreas registradas coherentes (≈ ±2 %) salvo en los
  casos deliberados.
- Escribe `public/data/quito_predios_sinteticos.geojson` y `data/expected_issues.json`.
- No usa límites catastrales reales, datos personales ni servicios comerciales.

### Defectos inyectados

| Defecto | Cantidad | Predios | Reglas esperadas |
| --- | --- | --- | --- |
| Clave catastral duplicada (misma clave en 3 predios) | 3 predios | QT-CH-011, QT-LC-002, QT-LM-005 | `ALF-002` |
| Campos obligatorios nulos | 3 | QT-IN-004 (clave), QT-LC-007 (uso), QT-LM-010 (área) | `ALF-003` (+ `SUP-003` en área nula) |
| Superficies negativas | 2 | QT-IN-009, QT-QT-003 | `ALF-005`, `SUP-003` |
| Tipos de datos incorrectos | 2 | QT-CH-006 (área string), QT-CA-001 (pisos string) | `ALF-004` (+ `SUP-003` en área) |
| Pares superpuestos | 2 pares | QT-CH-001/002, QT-IN-001/002 | `GEO-007` en ambos predios |
| Polígonos autointersectados | 2 | QT-LC-012, QT-QT-008 | `GEO-004` |
| Diferencias de superficie > 5 % | 3 | QT-CH-004, QT-LC-001, QT-LM-009 | `SUP-001` |
| Valores fuera de dominio | 2 | QT-IN-006 (uso), QT-LM-012 (estado) | `ALF-007` |
| Inconsistencia área construida / pisos | 2 | QT-LC-011, QT-QT-011 | `ALF-008` (advertencia) |
| Par que comparte borde sin solaparse | 1 par | QT-CH-007/008 | Ninguna superposición; se clasifica como borde |

Los errores pueden coexistir. `data/expected_issues.json` documenta la coexistencia esperada y es
una **referencia de generación**, no una prueba independiente del validador. La independencia se
verifica en `tests/dataset.test.js`, que ejecuta el motor y comprueba cada defecto, además de
verificar que los predios declarados correctos no tengan incidencias.

No se incluyen anomalías incompatibles con un GeoJSON estructuralmente cargable (por ejemplo,
anillos abiertos) en el archivo principal. Los casos de anillo abierto, coordenadas fuera de rango,
geometría nula y otros se prueban en memoria en la suite de Vitest.

---

## 9. Catálogo de reglas

Códigos estables y documentados. La severidad indicada es la predeterminada; el motor usa el
catálogo de `src/core/constants.js`.

### Estructurales (siempre activas)

| Código | Regla | Dimensión | Severidad | Criterio |
| --- | --- | --- | --- | --- |
| `STR-001` | JSON malformado | Completitud | Error | El texto debe ser JSON válido |
| `STR-002` | FeatureCollection inválido | Completitud | Error | Raíz `FeatureCollection` con arreglo `features` |
| `STR-003` | Colección vacía | Completitud | Advertencia | Al menos una entidad |
| `STR-004` | Feature con estructura incorrecta | Completitud | Error | Objeto `Feature` con `properties` válido |
| `STR-005` | Geometría nula o ausente | Completitud | Error | Geometría no nula |
| `STR-006` | Geometría no admitida | Completitud | Error | Solo `Polygon` o `MultiPolygon` |

### Geométricas y topológicas

| Código | Regla | Dimensión | Severidad | Criterio |
| --- | --- | --- | --- | --- |
| `GEO-001` | Coordenadas fuera de rango | Exactitud posicional | Error | lon ∈ [-180, 180], lat ∈ [-90, 90] |
| `GEO-002` | Geometría vacía | Completitud | Error | Al menos un anillo con posiciones |
| `GEO-003` | Anillo no cerrado | Consistencia lógica | Error | Primer y último par coinciden (ε = 1e-9) |
| `GEO-004` | Autointersección | Consistencia lógica | Error | `turf.kinks` detecta cruces |
| `GEO-005` | Geometría duplicada | Consistencia lógica | Error | Anillos idénticos redondeados a 7 decimales |
| `GEO-006` | Polígono de área cero | Consistencia lógica | Error | Área ≤ 0,01 m² |
| `GEO-007` | Superposición entre predios | Consistencia lógica | Error | Intersección poligonal > 1 m² |
| `GEO-008` | Contacto en borde o vértice | Consistencia lógica | Informativa | Intersección de área nula; no es superposición |
| `GEO-009` | Anillo con posiciones insuficientes | Consistencia lógica | Error | Anillo < 4 posiciones |

> `GEO-008` documenta la distinción borde/vértice. El motor cuenta esos contactos en el resumen
> topológico y en las pruebas, pero no crea una incidencia por cada contacto para no saturar la
> tabla con relaciones normales entre parcelas contiguas.

### Alfanuméricas

| Código | Regla | Dimensión | Severidad | Criterio |
| --- | --- | --- | --- | --- |
| `ALF-001` | Identificador duplicado | Consistencia lógica | Error | `id` único tras recortar espacios |
| `ALF-002` | Clave catastral duplicada | Consistencia lógica | Error | Clave única sin distinguir mayúsculas |
| `ALF-003` | Campo obligatorio nulo o vacío | Completitud | Error | No `null`, `undefined` ni cadena vacía |
| `ALF-004` | Tipo de dato incorrecto | Exactitud temática | Error | Numéricos como número; textuales como string |
| `ALF-005` | Superficie negativa | Exactitud temática | Error | `area_terreno_m2` y `area_construida_m2` ≥ 0 |
| `ALF-006` | Número de pisos inválido | Exactitud temática | Error | Entero ≥ 0 |
| `ALF-007` | Valor fuera de dominio | Exactitud temática | Error | Uso, estado, sector y año dentro de dominios |
| `ALF-008` | Inconsistencia área construida / pisos | Exactitud temática | Advertencia | Área construida ≤ terreno × pisos × 1,05 |

### Superficies

| Código | Regla | Dimensión | Severidad | Criterio |
| --- | --- | --- | --- | --- |
| `SUP-001` | Diferencia fuera de tolerancia | Exactitud temática | Error | Diferencia porcentual absoluta > tolerancia (5 % por defecto) |
| `SUP-002` | Superficie registrada no positiva | Exactitud temática | Error | Área registrada igual a cero |
| `SUP-003` | Superficie no evaluable | Completitud | Advertencia | Área nula, no numérica, negativa o geométrica no positiva |

### No evaluadas por falta de referencia

Se informan siempre como no evaluadas, no como resultados satisfactorios:

| Código | Verificación | Dimensión | Motivo |
| --- | --- | --- | --- |
| `REF-001` | Exactitud posicional contra referencia | Exactitud posicional | No existe cartografía de referencia independiente |
| `REF-002` | Exactitud temática contra registro oficial | Exactitud temática | No existe registro catastral oficial de contraste |
| `REF-003` | Calidad temporal / vigencia | Calidad temporal | No hay fechas de levantamiento ni series históricas |
| `REF-004` | Completitud contra inventario | Completitud | No hay inventario catastral independiente |
| `REF-005` | Consistencia contra red catastral completa | Consistencia lógica | Solo se evalúan relaciones entre predios cargados |

---

## 10. Metodología de cálculo

### Superficies

1. Se calcula el área de la geometría con `turf.area`, que usa una **aproximación geodésica esférica**
   con radio medio terrestre. No se aplica la fórmula euclidiana de Gauss sobre grados.
2. Se lee `area_terreno_m2` como superficie registrada.
3. Se calcula:
   - `diferenciaM2 = registrada − geométrica`
   - `diferenciaAbsM2 = |diferencia|`
   - `diferenciaPct = (diferencia / geométrica) × 100`
   - `diferenciaAbsPct = |diferenciaPct|`
4. Si `diferenciaAbsPct > tolerancia`, se emite `SUP-001`.
5. Área nula, no numérica, negativa o geométrica cero se informan como no evaluables
   (`SUP-002`/`SUP-003`) en lugar de inventar un porcentaje.
6. La tolerancia del 5 % es un **parámetro experimental de este laboratorio**. No es una norma ISO
   ni un umbral del Municipio de Quito.

El área esférica de Turf es adecuada para comparaciones de calidad a escala de parcela, pero no
sustituye un cálculo catastral oficial sobre un datum y proyección normados.

### Topología

- Pre-filtro por bounding box y luego intersección poligonal con Turf/polyclip.
- **Superposición:** intersección con geometría poligonal y área > **1 m²**.
- **Borde:** una arista de un predio tiene su punto medio sobre el límite del otro (ε = 1e-9 grados,
  aproximadamente 0,1 mm en latitud), o la intersección es lineal.
- **Vértice:** solo hay vértices compartidos o vértices sobre el límite, sin arista compartida.
- **Disjunto:** bounding boxes no se intersectan o no hay contacto detectable.
- Compartir borde o vértice **nunca** se clasifica como superposición.
- Cada superposición genera una incidencia para cada predio implicado, con el otro predio y el área
  de intersección.
- Tolerancias documentadas en `src/core/constants.js` (`TOLERANCES`).

### Autointersecciones

Se usa `turf.kinks` por polígono. El área de un polígono autointersectado puede ser ambigua; por eso
los dos casos sintéticos conservan un área registrada coherente con el área calculable, aislando la
regla `GEO-004`. La aplicación no declara válida una geometría solo porque MapLibre pueda dibujarla.

### Indicadores y doble conteo

- `totalPredios`: entidades admitidas para evaluación predial.
- `prediosSinErrores`: predios sin ninguna incidencia de severidad `error`.
- `prediosConErrores`: predios con al menos un `error`.
- `prediosConAdvertencias`: predios con al menos una `advertencia`; pueden tener también errores.
- `totalIncidencias`: todas las incidencias, incluidas las estructurales.
- `% predios sin errores`: `prediosSinErrores / totalPredios × 100`.
- Los conjuntos se construyen con `Set` sobre `entidadId`, no sumando filas.

### Reglas activables y no evaluadas

- Las 19 reglas evaluables no estructurales se pueden desactivar. Una regla desactivada produce
  `notEvaluated` con motivo «Regla desactivada por el usuario».
- Las reglas estructurales siempre se ejecutan.
- Las reglas `REF-*` siempre se informan como no evaluadas.
- Si el conjunto supera 2.000 predios evaluables, el análisis topológico O(n²) se omite y se informa
  como no evaluado, en lugar de degradar silenciosamente.

---

## 11. Sistemas de referencia

| Sistema | Descripción | Uso en la aplicación |
| --- | --- | --- |
| WGS84 geográfico (EPSG:4326) | Latitud/longitud sobre el elipsoide WGS84 | Coordenadas GeoJSON, orden `[longitud, latitud]` según RFC 7946 |
| WGS84 / UTM zona 17 Sur (EPSG:32717) | Proyección transversa de Mercator, zona 17S | Referencia conceptual de comparación; **no se reproyecta** |
| TMQ (proyección local de Quito) | Sistema local de proyección transversa usado en el contexto cartográfico de Quito | Referencia conceptual; **TMQ no es UTM** y la aplicación no afirma parámetros oficiales ni precisión topográfica |

La aplicación interpreta las coordenadas como geográficas, calcula áreas geodésicas y no realiza
conversiones a UTM ni a TMQ. No se declara exactitud posicional oficial ni se comparan geometrías
contra cartografía de referencia.

---

## 12. Calidad según ISO 19157-1:2023 (uso conceptual)

Las dimensiones se usan como marco conceptual:

- **Completitud:** campos obligatorios, geometrías, colección vacía, superficie evaluable.
- **Consistencia lógica:** duplicados, anillos, autointersecciones, superposiciones, geometrías
  duplicadas.
- **Exactitud posicional:** rango de coordenadas; la exactitud contra referencia **no se evalúa**.
- **Exactitud temática:** tipos, dominios, superficies y coherencia de atributos.
- **Calidad temporal:** **no se evalúa** por falta de metadatos temporales verificables.

Esta organización **no constituye una certificación ISO**. No se afirman evaluadas dimensiones que
requieran datos de referencia independientes.

---

## 13. Pruebas

Ejecución real:

```text
npm test
Test Files  8 passed (8)
Tests       64 passed (64)
```

Escenarios obligatorios y ubicación:

| # | Escenario | Archivo |
| --- | --- | --- |
| 1 | FeatureCollection válido | `tests/structure.test.js` |
| 2 | Clave catastral duplicada | `tests/attributes.test.js` |
| 3 | ID duplicado | `tests/attributes.test.js` |
| 4 | Campo obligatorio vacío | `tests/attributes.test.js` |
| 5 | Superficie negativa | `tests/attributes.test.js` |
| 6 | Número de pisos inválido | `tests/attributes.test.js` |
| 7 | Geometría nula | `tests/structure.test.js` |
| 8 | Coordenadas fuera de rango | `tests/geometry.test.js` |
| 9 | Anillo no cerrado | `tests/geometry.test.js` |
| 10 | Polígono autointersectado | `tests/geometry.test.js` |
| 11 | Solapamiento parcial | `tests/topology.test.js` |
| 12 | Predios que comparten borde sin solaparse | `tests/topology.test.js` |
| 13 | Geometrías duplicadas | `tests/geometry.test.js` |
| 14 | Superficie fuera de tolerancia | `tests/surface.test.js` |
| 15 | Superficie dentro de tolerancia | `tests/surface.test.js` |
| 16 | Superficie registrada igual a cero | `tests/surface.test.js` |
| 17 | JSON malformado | `tests/structure.test.js` |
| 18 | FeatureCollection vacío | `tests/structure.test.js` |
| 19 | Exportación correcta de incidencias | `tests/export.test.js` |
| 20 | Indicadores sin doble conteo | `tests/engine.test.js` |

Casos adicionales incluyen: properties inválidos, geometría no admitida, geometría vacía, anillo con
menos de 4 posiciones, área cero, vértice compartido, coexistencia de geometría duplicada y
superposición, MultiPolygon, tolerancia configurable y fuera de rango, tipos incorrectos, dominios,
incoherencia de área construida, reglas desactivadas, reglas estructurales no desactivables,
dimensiones no evaluadas y comprobación completa del conjunto de 72 predios.

`tests/dataset.test.js` es una prueba de integración sobre el archivo generado: verifica los seis
sectores, el orden de coordenadas, cada defecto inyectado, el par que comparte borde, que los
predios declarados correctos no tengan incidencias y que los indicadores no dupliquen predios.

### Verificación de interfaz

Además de la suite, se realizó una comprobación manual automatizada con geckodriver/Firefox
headless sobre la compilación de producción:

- carga automática de 72 predios y 27 incidencias;
- 24 teselas de OpenStreetMap solicitadas y mapa renderizado;
- filtro por severidad (21 errores), regla `GEO-007` (4 filas) y búsqueda por predio;
- selección de 27 incidencias y localización de 23 predios únicos;
- carga de un JSON malformado con `STR-001` y restauración posterior del conjunto de demostración;
- desactivación de las 19 reglas evaluables (0 incidencias, 24 reglas no evaluadas);
- descarga real de los tres archivos (`incidencias_quito_*.csv`,
  `incidencias_quito_*.json` y `resumen_evaluacion_quito_*.json`), con contenido parseable y BOM
  UTF-8 en el CSV.

Estas comprobaciones se hicieron con geckodriver/Firefox headless sobre `npm run build` y
`npm run preview`; no forman parte de `npm test`.

---

## 14. Compilación y GitHub Pages

`vite.config.js` usa `base: './'`, de modo que los recursos compilados funcionan bajo una subruta de
GitHub Pages (`https://usuario.github.io/repositorio/`). Los datos se solicitan con
`import.meta.env.BASE_URL` y `document.baseURI`, y `public/data/` se copia a `dist/data/`.

```bash
npm run build
npm run preview
```

El resultado queda en `dist/`:

- `dist/index.html`
- `dist/assets/*`
- `dist/data/quito_predios_sinteticos.geojson`

### Opción A: rama de publicación

```bash
npm run build
npx gh-pages -d dist   # herramienta externa opcional; no está incluida como dependencia
```

Luego configure GitHub Pages para servir la rama `gh-pages`.

### Opción B: GitHub Actions

Cree un workflow de Pages que ejecute `npm ci`, `npm run build` y publique `dist/`. Para evitar
publicaciones automáticas no deseadas, dispare el workflow con `workflow_dispatch` en lugar de cada
push. Permisos típicos: `contents: read`, `pages: write`, `id-token: write`.

No se publicó ni se desplegó la aplicación durante este desarrollo.

---

## 15. Seguridad y robustez

- Validación de extensión (`.geojson`/`.json`) y tamaño máximo de archivo (25 MB) antes de procesar.
- Parseo y validación estructural tolerantes a errores: una entidad inválida no bloquea el conjunto.
- Todos los valores mostrados en tabla y popups se insertan con `textContent`, nunca con `innerHTML`.
- CSV con escape de comillas, comas, saltos de línea y mitigación de fórmulas.
- Procesamiento exclusivamente local. Los datos cargados no se envían a servicios externos.
- La única petición externa es la cartografía base de OpenStreetMap (teselas); no recibe atributos
  catastrales.
- No se usan datos personales ni catastrales reales.
- No se inventan validaciones exitosas: las reglas sin datos de referencia aparecen como no evaluadas.

---

## 16. Rendimiento y limitaciones conocidas

- El análisis topológico compara pares de predios: O(n²). Con 72 predios se evaluaron 168 pares con
  pre-filtro de bounding box; con más de 2.000 predios se omite y se informa como no evaluado.
- La tabla renderiza como máximo 500 filas; las exportaciones incluyen todas las filtradas.
- `turf.area` es una aproximación geodésica esférica, no un cálculo catastral oficial ni una
  proyección equal-area.
- `turf.kinks` puede fallar en geometrías muy degeneradas; en ese caso se informa la limitación y no
  se asume validez.
- Un polígono autointersectado tiene área ambigua; la comparación de superficies debe interpretarse
  con cautela.
- La topología solo considera los predios cargados, no la red catastral completa ni límites
  administrativos oficiales.
- Los nombres de sectores son referencias de demostración, no polígonos verificados.
- El mapa requiere WebGL y conexión para las teselas base; sin teselas, los predios pueden seguir
  dibujándose sobre el fondo si el navegador soporta WebGL.
- No hay persistencia, autenticación, backend ni base de datos.
- No se evalúan exactitud posicional contra referencia, exactitud temática oficial, completitud
  contra inventario ni calidad temporal.

---

## 17. Solución de problemas

- **El mapa queda en blanco:** verifique WebGL y la conexión a `tile.openstreetmap.org`. La
  evaluación, tabla y exportaciones funcionan aunque falle la cartografía base.
- **No cargan los datos de demostración:** sirva la aplicación con `npm run dev` o
  `npm run preview`, no abriendo `index.html` con `file://`.
- **`vitest: not found`:** instale dependencias de desarrollo con
  `npm install --include=dev` si su entorno define `NODE_ENV=production`.
- **GitHub Pages muestra 404 en recursos:** confirme que se publicó el contenido de `dist/` y que
  se mantiene `base: './'`.

---

## 18. Estado del proyecto

**MVP completo.** Funcionalidades implementadas: generación de datos, motor de calidad,
pruebas, mapa, filtros, indicadores, tabla, selección, exportaciones, documentación y configuración
para GitHub Pages.

Funcionalidades deliberadamente fuera de alcance: backend, base de datos, autenticación,
reproyección EPSG:32717/TMQ, edición geométrica, conexión a servicios catastrales oficiales,
comparación con cartografía de referencia y certificación ISO.

---

## 19. Aviso final

Los datos, claves catastrales, direcciones y avalúos son ficticios y reproducibles. Cualquier
coincidencia con información real es accidental. El laboratorio tiene fines educativos,
experimentales y de evaluación técnica de software geoespacial.
