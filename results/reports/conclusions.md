# Conclusiones del Geospatial Flash Benchmark

## Dictamen ejecutivo

El ejercicio demuestra que los tres modelos pudieron producir aplicaciones GIS estáticas que compilan, aprueban sus pruebas originales en GitHub Actions y pueden desplegarse conjuntamente en GitHub Pages. La revisión de doce capturas auténticas confirma cartografía, indicadores, selección de predios y controles de filtrado visibles. **La capacidad de entregar una demostración ejecutable está acreditada; la confiabilidad catastral y la preparación para producción no lo están.**

La conclusión más relevante es metodológica: una aplicación que compila, muestra un mapa y supera pruebas escritas por su propio generador todavía puede contener errores de validación espacial, indicadores incompletos o problemas de interacción. La evidencia útil surge al combinar conservación del código, casos externos al autor, ejecución independiente y observación de la interfaz real.

## Qué aporta cada implementación

| Implementación | Aporte principal | Condición que limita su recomendación |
|---|---|---|
| **DeepSeek** | Mejor balance observado entre amplitud GIS, presentación profesional y prioridad del mapa. Lidera el subtotal técnico provisional y la valoración de estética/composición dentro del alcance puntuado. | La validez poligonal y la equivalencia geométrica siguen incompletas. La lectura de popups y la interacción móvil requieren pruebas adicionales. |
| **GLM** | Demostración compacta y menor tiempo de desarrollo reportado: 5 min 51 s. | La auditoría técnica encontró indicadores de superposición de un solo lado y sustitución de ID ausentes antes de validarlos. La captura móvil presenta 690 px de contenido frente a 390 solicitados. |
| **MiMo** | Separación clara de responsabilidades, motor independiente de la interfaz y carga diferida del mapa. | Se reprodujo una excepción con MultiPolygon mal formado. En las capturas, la lista de reglas domina el espacio, retrasa el mapa en móvil y permanece un popup de otro sector tras filtrar. |

Estas diferencias respaldan recomendaciones para las **implementaciones observadas**, no afirmaciones universales sobre la superioridad de una familia de modelos. Hubo una entrega por modelo y no se controlaron de forma equivalente todas las condiciones de generación.

## Corrección espacial: más allá de los casos favorables

Las tres implementaciones distinguen en los casos compartidos una superposición de área positiva de un contacto exclusivamente en borde o vértice. También utilizan cálculos de área de Turf sobre coordenadas geográficas, evitando áreas planas expresadas en grados cuadrados.

Sin embargo, los casos independientes revelaron límites comunes: no detectar un hueco fuera de su polígono y no reconocer como duplicada una geometría cuyo anillo se invierte. Además, los denominadores de discrepancia porcentual de superficie difieren entre implementaciones. Un umbral nominal del 5 % no basta para asegurar criterios equivalentes.

Cada modelo generó su propio conjunto sintético. Por tanto, 72/72/68 predios, cantidades de incidencias y porcentajes de predios sin errores describen sus demostraciones; **no miden comparativamente la precisión de los validadores**. Tampoco existe una referencia oficial que permita certificar exactitud posicional, conformidad municipal o validez catastral. La tolerancia del 5 % es experimental, no una exigencia universal de ISO 19157-1:2023.

## Diseño y experiencia de uso

DeepSeek presenta la identidad y composición más sólidas en las capturas revisadas: mapa protagonista, jerarquía clara y controles complejos plegados. GLM organiza bien la información en escritorio, pero el desbordamiento móvil afecta su adaptabilidad. MiMo ofrece controles comprensibles, aunque la expansión vertical de reglas dificulta la exploración y relega los indicadores y el mapa.

La revisión visual puntúa exclusivamente estética y composición: **DeepSeek 7/8, GLM 6/8 y MiMo 4,5/8**. A petición del propietario, se excluyen los criterios no completados y se consolida el alcance puntuado en **88 puntos**: **DeepSeek 68/88, MiMo 62,5/88 y GLM 56/88**. No se normaliza a 100 ni se modifican las notas técnicas anteriores. Faltan una comparación cartográfica a escala equivalente, navegación por teclado, foco, contraste cuantificado, gestos táctiles y una verificación completa de las interacciones. DeepSeek obtiene la mayor puntuación dentro del alcance evaluado; esto no acredita superioridad universal del modelo ni un ganador de UX o cartografía que no se evaluaron por completo.

## Velocidad y economía: evidencia con alcance limitado

GLM fue el más rápido según el tiempo informado por el experimento. MiMo tiene el menor total de tokens reportado y el menor costo parcial visible suministrado. Ninguna de estas observaciones establece la mejor relación calidad/costo total: faltan registros completos, no se conoce el costo exacto de DeepSeek y no se homogeneizó la contabilidad del uso. Los porcentajes del panel no representan dólares.

## Recomendación profesional y siguiente fase

Para continuar una demostración derivada, DeepSeek es el punto de partida más equilibrado según la evidencia disponible; MiMo es una referencia útil para separación de módulos y GLM para rapidez de entrega. Esta recomendación no autoriza reparar las entregas históricas ni equivale a una recomendación de uso catastral operativo.

La siguiente fase debería completar las cuatro pruebas funcionales pendientes —reglas, tolerancia, exportaciones y restauración— y revisar accesibilidad, selección y filtros de extremo a extremo. Para comparar motores con mayor rigor se necesita un conjunto externo común, adaptadores documentados de esquema, expectativas independientes para geometrías adversas y varias repeticiones con condiciones y costos comparables.

El repositorio conserva los **107 archivos originales** mediante hashes SHA-256. Los 171 tests originales aprobados, los 16 escenarios diagnósticos por modelo y las doce capturas constituyen capas distintas de evidencia; ninguna sustituye a las otras. La contribución del benchmark es precisamente hacer esa distinción reproducible y visible.

## Trazabilidad

[Metodología](../../benchmark/methodology.md) · [Rúbrica y resultados](../../benchmark/evaluation.md) · [Comparación técnica](technical-comparison.md) · [Auditoría funcional en navegador](browser-functional-audit.md) · [Comparación visual](visual-comparison.md) · [Manifiesto de capturas](../screenshots/browser-audit/capture-manifest.json) · [Verificación alojada](hosted-verification.json).
