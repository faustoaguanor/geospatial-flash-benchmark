# Comparación visual — estética y composición con capturas reales

Se revisaron directamente las **12 capturas** obtenidas por el script ejecutado por el propietario en Brave/Playwright. El motor reporta `156.0.8078.80`; escritorio solicitado 1440 × 900, móvil 390 × 844, escala 1 y esquema claro. Véanse [el manifiesto](../screenshots/browser-audit/capture-manifest.json) y [la matriz funcional](browser-functional-audit.md). La evaluación se basa en interfaces renderizadas, no en CSS/HTML.

La barra superior «Volver a la comparación / WebGL disponible» pertenece al benchmark y **no se puntúa como diseño del modelo**. Los nombres `-unverified` se conservan: su causa es una comprobación automática excesivamente conservadora de solicitudes canceladas, no ausencia de imágenes reales. La cartografía y los popups son visibles en la revisión humana.

## Hallazgos observados

| Modelo | Fortalezas visuales | Limitaciones observadas |
|---|---|---|
| DeepSeek | Identidad azul/verde coherente, tarjetas y jerarquía claras; mapa protagonista; indicadores agrupados; reglas plegadas; acciones «Localizar» explícitas. | El popup seleccionado se extiende hacia el borde inferior y compite con la leyenda; algunos textos secundarios y controles son pequeños. En móvil la tabla necesita navegación horizontal por verificar. |
| GLM | Panel compacto y ordenado; indicadores y exportación próximos; severidades con texto e insignias; selección con contorno azul nítido. | Documento móvil de 690 px frente a los 390 solicitados; desbordamiento claro. El popup es largo y depende de desplazamiento interno. |
| MiMo | Paneles claros, botones rotulados y leyenda legible; base vectorial relativamente discreta en las capturas revisadas. | Lista de reglas siempre desplegada: domina la columna y deja gran vacío en escritorio; indicadores/exportaciones quedan muy abajo. En móvil el mapa llega después de reglas, indicadores y exportaciones. Popup de Iñaquito persiste al filtrar Centro Histórico. |

### Evidencia de escritorio

- [DeepSeek inicial](../screenshots/browser-audit/deepseek-desktop.png), [selección](../screenshots/browser-audit/deepseek-parcel-unverified.png), [filtros](../screenshots/browser-audit/deepseek-filters-unverified.png).
- [GLM inicial](../screenshots/browser-audit/glm-desktop.png), [selección](../screenshots/browser-audit/glm-parcel-unverified.png), [filtros](../screenshots/browser-audit/glm-filters-unverified.png).
- [MiMo inicial](../screenshots/browser-audit/mimo-desktop.png), [selección](../screenshots/browser-audit/mimo-parcel-unverified.png), [filtros](../screenshots/browser-audit/mimo-filters-unverified.png).

### Evidencia móvil

[DeepSeek](../screenshots/browser-audit/deepseek-mobile-unverified.png) mantiene el mapa al comienzo y se ajusta al ancho de 390 px. [MiMo](../screenshots/browser-audit/mimo-mobile-unverified.png) también ajusta ese ancho, pero la extensa lista de reglas desplaza el mapa muy abajo. [GLM](../screenshots/browser-audit/glm-mobile-unverified.png) muestra contenido de 690 px y un encabezado de 390 px: la limitación de ancho está respaldada por imagen y métricas del navegador.

Son capturas de página completa. Sus diferentes alturas no deben confundirse con diferentes tamaños de viewport. No se comprobaron gestos táctiles ni recorridos de teclado.

## Rúbrica: únicamente criterios suficientemente observados

Las puntuaciones son valoraciones del auditor sobre capturas y no métricas objetivas. A petición del propietario, la rúbrica puntuable se limita a estética e identidad visual y jerarquía/composición: máximo 8 puntos. Los criterios no completados quedan excluidos del cómputo.

| Criterio | Máximo | DeepSeek | GLM | MiMo |
|---|---:|---:|---:|---:|
| Estética e identidad visual | 4 | 3,5 | 3 | 2,5 |
| Jerarquía y composición | 4 | 3,5 | 3 | 2 |
| **Total visual evaluado** | **8** | **7** | **6** | **4,5** |

DeepSeek obtiene mayor puntuación en estética por su identidad consistente y en composición por dar prioridad al mapa sin desplegar todas las reglas. GLM mantiene buen orden y densidad de información, con un lenguaje visual más convencional. MiMo tiene consistencia básica, pero la expansión vertical de reglas y el espacio vacío penalizan la composición. Estas razones se apoyan en las capturas iniciales enlazadas arriba.

No se puntúa definitivamente cartografía: hay símbolos/leyendas y selección visibles, pero los mapas no comparten escala ni encuadre (GLM seleccionado muestra 20 m, DeepSeek 200 m). La interacción y la accesibilidad siguen incompletas: no se verificaron todas las funciones, teclado/foco, contraste cuantificado ni navegación táctil. Estos criterios quedan fuera de la nota visual. El resultado consolidado del alcance evaluado suma 80 puntos técnicos y 8 visuales: DeepSeek 68/88, MiMo 62,5/88 y GLM 56/88. No se normaliza a 100 ni representa una auditoría integral de UX/accesibilidad.

## Categorías y recomendaciones

- **Mejor apariencia e interfaz más profesional en las capturas:** DeepSeek, conclusión provisional limitada a estética y composición.
- **Mejor disposición móvil observada:** DeepSeek, por mantener el mapa accesible al inicio y respetar 390 px; no equivale a una prueba táctil completa.
- **Mejor UX completa y diseño cartográfico:** pendientes; no hay evidencia suficiente para ganadores definitivos.
- **Prioridades para versiones derivadas:** corregir el desbordamiento móvil de GLM; plegar/reorganizar reglas e indicadores de MiMo y revisar su popup tras cambiar sector; revisar espacio, anclaje y lectura de popups/leyendas en todos. No se harán esas reparaciones en las implementaciones preservadas.

Los hallazgos previos de la auditoría técnica permanecen separados. La portada presenta el resultado del alcance puntuado sobre 88. Las pruebas funcionales y de accesibilidad no completadas siguen documentadas como limitaciones y no reservan puntos pendientes.
