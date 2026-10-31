# GEOSPATIAL FLASH BENCHMARK
## Quito Cadastre Quality Lab — Prompt maestro definitivo v1.1

### 1. Rol

Actúa como Senior Geospatial Software Engineer especializado en desarrollo GIS web, JavaScript moderno, ingeniería de datos espaciales, validación topológica, calidad de información catastral, arquitectura modular y pruebas automatizadas.

Tu misión es construir una aplicación web funcional y técnicamente verificable, no una maqueta visual.

Trabaja de manera autónoma: implementa, ejecuta pruebas, identifica errores y corrige los problemas que encuentres.

### 2. Contexto del experimento

Participas en un benchmark de tres modelos de inteligencia artificial que desarrollarán independientemente la misma aplicación:

**Quito Cadastre Quality Lab**

El objetivo es comparar la calidad del código, el razonamiento geoespacial, la corrección funcional, la arquitectura y la autonomía de desarrollo.

No necesitas conocer la identidad de los demás modelos.

### 3. Restricción absoluta del workspace

IMPORTANTE: CommandCode limita tu acceso al directorio actual.

Tu directorio de trabajo autorizado es el directorio donde se inició esta sesión.

Reglas obligatorias:

1. No ejecutes comandos que accedan a directorios superiores mediante `..`, `../..` o rutas equivalentes.
2. No solicites ampliar permisos mediante `/add-dir`.
3. No inspecciones otras implementaciones.
4. No modifiques archivos fuera del directorio actual.
5. No ejecutes comandos desde la raíz del repositorio principal.
6. Para inspeccionar tu entorno utiliza `pwd && ls -la`.
7. Todos los archivos del proyecto deben crearse dentro del directorio actual.
8. Puedes leer y utilizar los archivos del subdirectorio local `fixtures/`.
9. No modifiques los datos comunes de evaluación proporcionados en `fixtures/`.
10. No hagas commits, push ni despliegues sin autorización.

El objetivo es conseguir una implementación totalmente independiente y reproducible.

### 4. Objetivo de la aplicación

Desarrolla una aplicación GIS web denominada Quito Cadastre Quality Lab para analizar la calidad de información catastral vectorial sintética del Distrito Metropolitano de Quito, Ecuador.

Debe permitir:

- Cargar datos GeoJSON.
- Visualizar predios en un mapa de Quito.
- Ejecutar reglas de validación.
- Detectar errores geométricos, topológicos y alfanuméricos.
- Evaluar discrepancias de superficie.
- Visualizar incidencias.
- Calcular indicadores.
- Filtrar resultados.
- Exportar reportes.
- Ejecutar pruebas automatizadas.

Debe poder desplegarse en GitHub Pages, sin backend ni servicios de pago.

### 5. Tecnologías obligatorias

- Vite.
- JavaScript ES Modules.
- MapLibre GL JS.
- Turf.js.
- Vitest.
- HTML5.
- CSS3.

No utilices React, Vue, Angular, Python, bases de datos ni backend.

No utilices APIs comerciales ni servicios que requieran claves privadas.

La aplicación debe funcionar mediante:

`npm install`

`npm run dev`

`npm test`

`npm run build`

Todo el procesamiento de la información catastral debe realizarse localmente en el navegador.

### 6. Ámbito geográfico: Quito, Ecuador

El mapa debe estar centrado en el Distrito Metropolitano de Quito.

Los datos sintéticos deberán representar ubicaciones aproximadas de:

- Centro Histórico.
- Iñaquito.
- La Carolina.
- La Mariscal.
- Quitumbe.
- Calderón.

No inventes límites administrativos oficiales. Trata estos nombres como sectores de demostración, no necesariamente como polígonos parroquiales verificados.

Los predios deben ser sintéticos y ubicarse razonablemente cerca de estos sectores.

Incluye un aviso visible:

**Datos catastrales sintéticos con fines educativos y experimentales. No representan información oficial del Municipio del Distrito Metropolitano de Quito.**

### 7. Generación obligatoria de datos catastrales sintéticos de Quito

No existen archivos de datos catastrales iniciales. Debes generarlos como parte del desarrollo del proyecto.

**Esta tarea es obligatoria y forma parte del benchmark.**

Genera programáticamente un conjunto de al menos 60 predios catastrales ficticios ubicados en zonas aproximadas de:

- Centro Histórico de Quito.
- Iñaquito.
- La Carolina.
- La Mariscal.
- Quitumbe.
- Calderón.

#### Requisitos de generación

1. Utiliza coordenadas geográficas WGS84 en orden `[longitud, latitud]`.
2. Genera polígonos pequeños y razonables para representar parcelas urbanas ficticias.
3. Usa una semilla fija para garantizar resultados reproducibles.
4. Distribuye los predios entre los seis sectores.
5. No utilices límites catastrales reales ni servicios comerciales.
6. Incluye los campos catastrales definidos en el modelo de datos del proyecto.
7. Genera identificadores y claves catastrales inequívocamente ficticios.
8. Calcula áreas geométricas con un método apropiado y genera valores registrados coherentes, salvo cuando se introduzcan errores deliberados.
9. Guarda los datos en `public/data/quito_predios_sinteticos.geojson`.
10. Incluye un script reproducible para regenerar los datos.

#### Errores intencionales

El conjunto debe incluir, como mínimo:

- 3 predios con claves catastrales duplicadas.
- 3 predios con atributos obligatorios nulos.
- 2 predios con superficies negativas.
- 2 predios con tipos de datos incorrectos.
- 2 pares de predios superpuestos.
- 2 predios con geometrías autointersecadas.
- 3 predios con diferencias de superficie superiores al 5 %.
- 2 predios con valores fuera de los dominios establecidos.

Incluye también predios correctos y al menos un par de polígonos que compartan borde sin superponerse.

Los errores pueden coexistir en un mismo predio, pero debes documentar esta circunstancia.

#### Resultados esperados

Crea un archivo `data/expected_issues.json` que contenga los errores introducidos intencionalmente, identificando los predios y las reglas correspondientes.

Este archivo será la referencia de generación, no una prueba independiente de que el validador sea correcto.

Si necesitas representar errores estructurales incompatibles con GeoJSON válido, como un anillo abierto, crea archivos de prueba separados. No introduzcas esas anomalías en el archivo principal si impiden que la aplicación cargue el conjunto completo.

#### Requisito especial

La aplicación debe cargar automáticamente los predios sintéticos al iniciarse y permitir al usuario restaurarlos mediante un botón "Cargar datos de demostración".

Incluye una advertencia visible indicando que los predios son ficticios y no corresponden a información oficial del Municipio de Quito.

No solicites al usuario que proporcione archivos GeoJSON ni que prepare datos previamente.

Genera los datos, desarrolla el motor de calidad y completa la aplicación de manera autónoma.

### 8. Evaluación de calidad estructural

Implementa validaciones para:

- JSON malformado.
- FeatureCollection inválido.
- Colección vacía.
- Features con estructura incorrecta.
- Geometrías nulas.
- Geometrías no admitidas para evaluación predial.

La aplicación debe informar los problemas sin bloquearse.

### 9. Evaluación de calidad alfanumérica

Implementa reglas para detectar:

- Identificadores duplicados.
- Claves catastrales duplicadas.
- Campos obligatorios nulos o vacíos.
- Tipos de datos incorrectos.
- Superficies negativas.
- Número de pisos negativo o no entero.
- Valores fuera de los dominios configurados.
- Inconsistencias entre área construida y número de pisos.

Distingue errores comprobados de advertencias que requieren revisión.

### 10. Evaluación de calidad geométrica y topológica

Implementa verificaciones para:

- Coordenadas fuera de rango.
- Geometrías vacías.
- Anillos de polígonos no cerrados.
- Autointersecciones.
- Geometrías duplicadas.
- Polígonos de área cero.
- Superposiciones entre predios.

Distingue correctamente entre:

- Solapamiento con superficie positiva.
- Contacto en borde.
- Contacto en vértice.

Compartir un borde o vértice no debe clasificarse automáticamente como superposición.

Documenta las limitaciones y tolerancias numéricas de los algoritmos.

No declares que una geometría es válida únicamente porque puede dibujarse en el mapa.

### 11. Evaluación de superficies

Calcula el área geométrica de cada predio usando un procedimiento espacial técnicamente apropiado.

Compara esta superficie con `area_terreno_m2`.

Calcula:

- Área geométrica en m².
- Área registrada en m².
- Diferencia absoluta en m².
- Diferencia porcentual.

Permite configurar una tolerancia porcentual inicial del 5 %.

Este valor es exclusivamente experimental. No lo atribuyas a una norma ISO ni al Municipio de Quito.

Maneja correctamente áreas nulas, cero, negativas e inválidas.

No realices cálculos de superficie euclidianos directamente sobre coordenadas expresadas en grados.

### 12. Sistemas de referencia

Aplica correctamente RFC 7946 para GeoJSON.

Las coordenadas geográficas deben interpretarse en orden:

`[longitud, latitud]`

Documenta las diferencias entre:

- WGS84 geográfico.
- WGS84 / UTM zona 17 Sur, EPSG:32717.
- La proyección local TMQ empleada en el contexto cartográfico de Quito.

No confundas TMQ con UTM.

La aplicación no debe afirmar precisión topográfica ni catastral oficial.

### 13. Modelo de incidencias

Cada incidencia debe contener:

- ID único de incidencia.
- Código de regla.
- Identificador del predio afectado.
- Dimensión de calidad.
- Descripción.
- Severidad.
- Valor observado.
- Criterio de evaluación.

Define códigos de regla estables y documentados.

Las reglas que no puedan evaluarse con los datos disponibles deben indicarse como no evaluadas.

No inventes resultados ni conviertas una validación incompleta en un resultado satisfactorio.

### 14. Interfaz de usuario

Desarrolla un dashboard profesional, responsive y completamente en español.

Debe incluir:

**Encabezado**
- Nombre de la aplicación.
- Descripción.
- Aviso de datos sintéticos.

**Mapa**
- Mapa centrado en Quito.
- Cartografía base gratuita.
- Visualización de predios.
- Leyenda.
- Selector de sector.
- Resaltado de predios con incidencias.
- Ventanas emergentes con atributos.
- Zoom a predios seleccionados.

**Panel de control**
- Cargar GeoJSON.
- Cargar datos de demostración.
- Ejecutar evaluación.
- Activar o desactivar reglas.
- Configurar tolerancia de superficie.

**Indicadores**
- Total de predios.
- Predios sin errores.
- Predios con errores.
- Predios con advertencias.
- Número de incidencias.
- Porcentaje de predios sin errores comprobados.

**Tabla de incidencias**
- Búsqueda por identificador.
- Filtro por severidad.
- Filtro por regla.
- Selección de incidencias.
- Localización de predios en el mapa.

**Exportación**
- Incidencias CSV.
- Incidencias JSON.
- Resumen de evaluación JSON.

Evita contar repetidamente un predio cuando presenta varias incidencias.

### 15. Arquitectura del software

Separa la lógica en módulos independientes:

1. Carga de archivos.
2. Modelo de datos.
3. Validación estructural.
4. Calidad de atributos.
5. Calidad geométrica.
6. Análisis topológico.
7. Cálculos de superficie.
8. Generación de indicadores.
9. Visualización de mapas.
10. Interfaz y controles.
11. Exportación.
12. Pruebas.

La lógica de evaluación debe poder ejecutarse sin inicializar MapLibre ni acceder al DOM.

Evita archivos monolíticos.

### 16. Pruebas automatizadas

Utiliza Vitest.

Implementa al menos estos 20 escenarios:

1. FeatureCollection válido.
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
12. Predios que comparten borde sin solaparse.
13. Geometrías duplicadas.
14. Superficie fuera de tolerancia.
15. Superficie dentro de tolerancia.
16. Superficie registrada igual a cero.
17. JSON malformado.
18. FeatureCollection vacío.
19. Exportación correcta de incidencias.
20. Indicadores sin doble conteo.

Cada prueba debe tener entradas y resultados esperados explícitos.

Incluye casos negativos para evitar falsos positivos.

No cambies resultados esperados únicamente para conseguir que los tests pasen.

Ejecuta realmente las pruebas y documenta las fallas.

### 17. Referencias de calidad

Utiliza los principios de ISO 19157-1:2023 como referencia conceptual para organizar las dimensiones de calidad.

Distingue entre:

- Completitud.
- Consistencia lógica.
- Exactitud posicional.
- Exactitud temática.
- Calidad temporal.

No afirmes haber evaluado dimensiones que requieran datos de referencia independientes si estos no existen.

No afirmes certificación ISO.

Los umbrales y criterios deben estar documentados como parámetros de este experimento.

### 18. Seguridad y robustez

- Valida archivos antes de procesarlos.
- Maneja entradas incorrectas.
- Evita inyección HTML en ventanas emergentes.
- Documenta limitaciones de rendimiento.
- No transmitas los datos cargados a servicios externos de procesamiento.
- No utilices datos personales ni catastrales reales.
- No inventes validaciones exitosas.
- No bloquees toda la aplicación porque una entidad sea inválida.

### 19. Documentación

Genera un README profesional que incluya:

- Descripción.
- Objetivo.
- Contexto de Quito.
- Instalación.
- Tecnologías.
- Arquitectura.
- Modelo de datos.
- Diccionario de atributos.
- Reglas implementadas.
- Metodología de cálculo.
- Sistemas de referencia.
- Limitaciones.
- Pruebas.
- Compilación.
- Despliegue en GitHub Pages.

Configura Vite para funcionar correctamente bajo una subruta de GitHub Pages.

No publiques automáticamente la aplicación.

### 20. Proceso de implementación

Sigue este orden:

**Fase 1 — Inspección**

Inspecciona exclusivamente el directorio actual mediante comandos permitidos.

**Fase 2 — Arquitectura**

Define los módulos y sus responsabilidades.

**Fase 3 — Datos**

Carga los fixtures locales o genera datos provisionales reproducibles.

**Fase 4 — Motor de calidad**

Implementa primero las reglas independientes de la interfaz.

**Fase 5 — Pruebas**

Construye pruebas unitarias y ejecútalas.

**Fase 6 — Visualización**

Implementa el mapa, los filtros, indicadores y la tabla.

**Fase 7 — Integración**

Verifica el flujo de carga, análisis, visualización y exportación.

**Fase 8 — Verificación**

Ejecuta:

`npm test`

`npm run build`

Corrige los problemas encontrados.

**Fase 9 — Documentación**

Completa el README y las instrucciones de uso.

No te detengas después de crear el esqueleto. Completa el MVP sin agregar funcionalidades ajenas al alcance.

### 21. Informe final obligatorio

Al terminar, entrega:

1. Resumen del proyecto.
2. Arquitectura implementada.
3. Archivos principales.
4. Funcionalidades completadas.
5. Funcionalidades pendientes.
6. Pruebas aprobadas, fallidas y omitidas.
7. Comandos ejecutados.
8. Problemas encontrados y correcciones.
9. Limitaciones conocidas.
10. Instrucciones de ejecución.
11. Instrucciones para GitHub Pages.

No afirmes haber ejecutado pruebas o verificado funcionalidades que no hayas comprobado.

### 22. Prioridades

Respeta estrictamente este orden:

1. Corrección geoespacial.
2. Validez de resultados.
3. Evaluación de calidad.
4. Pruebas automatizadas.
5. Arquitectura.
6. Robustez.
7. Usabilidad.
8. Apariencia visual.

**INSTRUCCIÓN FINAL**

Implementa Quito Cadastre Quality Lab como una aplicación GIS web profesional, reproducible y verificable, basada en datos catastrales sintéticos de Quito, Ecuador.

Trabaja exclusivamente dentro de tu workspace actual.

Comienza inspeccionando los archivos disponibles y desarrolla la aplicación completa.
