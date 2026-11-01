# Auditoría funcional en navegador — evidencia parcial revisada

**Actualización:** 31 oct 2026, hora de Ecuador; ejecución registrada el 1 nov 2026, 00:06:02–00:07:03 UTC. El propietario ejecutó el script temporal fuera del entorno restringido del agente. Se revisaron directamente las **12 capturas auténticas** y [su registro](../screenshots/browser-audit/capture-manifest.json). Esto supera el bloqueo inicial de arranque documentado anteriormente, pero no completa las ocho pruebas funcionales.

## Condiciones y alcance

Brave fue iniciado por el script con perfil temporal y controlado mediante Playwright/CDP. El motor reportó versión `156.0.8078.80`. El perfil personal no se utilizó. Se solicitaron escritorio 1440 × 900 y móvil 390 × 844, escala de dispositivo 1 y esquema claro. El registro confirma `visualViewportScale: 1` y contexto WebGL activo en los doce estados. Las capturas son de página completa, por lo que su altura excede la del viewport.

Las tres páginas devolvieron HTTP 200. Los doce estados registraron canvas visible y red en reposo; las imágenes muestran cartografía. Las escalas de los mapas no se igualaron: por ejemplo, el predio seleccionado de GLM está a 20 m y el de DeepSeek a 200 m. No se obtiene una clasificación cartográfica definitiva comparando esos encuadres.

La captura móvil de GLM mide **690 × 1759**, con ancho de documento e `innerWidth` de 690 pese a solicitar 390. La imagen confirma contenido que rebasa el encabezado de 390 px. MiMo y DeepSeek registraron ancho de documento de 390. Los PNG de escritorio tienen 1425 px de ancho, mientras el viewport reporta 1440, por lo que se conservan ambos datos sin fingir dimensiones de imagen idénticas al viewport.

## Matriz de ocho pruebas

| Prueba | DeepSeek | GLM | MiMo |
|---|---|---|---|
| 1. Carga inicial de mapa, predios e indicadores | PASS | PASS | PASS |
| 2. Selección y correspondencia de atributos | PARTIAL | PASS | PASS |
| 3. Filtros por sector y severidad | PARTIAL | PARTIAL | PARTIAL |
| 4. Activar/desactivar reglas | NOT TESTED | NOT TESTED | NOT TESTED |
| 5. Modificar tolerancia desde 5 % | NOT TESTED | NOT TESTED | NOT TESTED |
| 6. Descargar y validar exportaciones | NOT TESTED | NOT TESTED | NOT TESTED |
| 7. Restaurar datos sintéticos | NOT TESTED | NOT TESTED | NOT TESTED |
| 8. Usabilidad móvil | PARTIAL | PARTIAL | PARTIAL |

PASS se limita a la evidencia concreta descrita abajo; no certifica toda la aplicación. No se utiliza NOT APPLICABLE: no se probó la ausencia de funciones. Las pruebas originales de Vitest se mantienen separadas de esta matriz.

### Evidencia de selección

- **MiMo:** fila `PD-IN-0016` y popup con el mismo ID, sector Iñaquito y área geométrica 424.02 m². La captura muestra predios coloreados y popup; [evidencia](../screenshots/browser-audit/mimo-parcel-unverified.png).
- **GLM:** fila y popup `SIM-CALD-0062`, Calderón, área de terreno 502.21 m²; borde azul visible de selección. [Evidencia](../screenshots/browser-audit/glm-parcel-unverified.png).
- **DeepSeek:** popup real `QT-CH-002`, Centro Histórico. El script intentó filas `QT-CA-001` y `QT-CH-001` y luego hizo clic en el canvas; por ello no se puede afirmar correspondencia exacta entre fila y popup. No se interpreta como fallo de la app. [Evidencia](../screenshots/browser-audit/deepseek-parcel-unverified.png).

### Evidencia de filtros

Los selectores confirmaron Centro Histórico + Error en DeepSeek, Calderón + Error en GLM y Centro Histórico + Solo errores en MiMo. Las capturas muestran las selecciones y tablas con severidad error. DeepSeek informa además 12 predios visibles en el mapa y 21 incidencias filtradas de 27.

El script no contrastó cada entidad contra los datos ni verificó formalmente el alcance del filtro sector sobre la tabla. MiMo conserva el popup de **Iñaquito** después de seleccionar **Centro Histórico** y el mapa permanece en ese encuadre; es una inconsistencia visual observada que requiere reproducir la secuencia para determinar el comportamiento exacto esperado. No se declara FAIL reproducible a partir de una sola ejecución.

Los contadores automáticos `tbody tr` son globales: pueden incluir las filas de la tabla de atributos del popup. Por ejemplo, el número registrado de GLM aumenta después de abrirlo. **No son conteos fiables de incidencias** y no se usan para concluir que un filtro genera filas incorrectas.

Evidencia: [DeepSeek](../screenshots/browser-audit/deepseek-filters-unverified.png), [GLM](../screenshots/browser-audit/glm-filters-unverified.png), [MiMo](../screenshots/browser-audit/mimo-filters-unverified.png).

### Evidencia móvil

- **DeepSeek:** documento de 390 px, mapa antes de los controles e indicadores; tabla ancha parcialmente visible. Falta comprobar su desplazamiento táctil y la navegación por teclado. [Captura](../screenshots/browser-audit/deepseek-mobile-unverified.png).
- **GLM:** desbordamiento horizontal observado de 300 px respecto al ancho solicitado. La revisión no repitió la ejecución para declararlo un fallo reproducible completo. [Captura](../screenshots/browser-audit/glm-mobile-unverified.png).
- **MiMo:** documento de 390 px; la lista de reglas queda desplegada antes del mapa, obliga a mucho desplazamiento y retrasa el acceso a la cartografía. Falta probar interacción táctil. [Captura](../screenshots/browser-audit/mimo-mobile-unverified.png).

## Consola y recursos externos

No se registraron excepciones JavaScript de página en las tres aplicaciones. MiMo registró un mensaje de consola 404 sin URL asociada; el listado HTTP del registro no identifica su recurso, así que no se atribuye al código GIS.

Hay 6 solicitudes `ERR_ABORTED` en MiMo, 44 en GLM y 57 en DeepSeek, todas de teselas. El registro no aporta cronología suficiente para atribuir cada cancelación. Las cancelaciones pueden producirse al cambiar encuadre/zoom o cerrar un contexto y no demuestran por sí solas un fallo del proveedor. Las imágenes revisadas muestran cartografía cargada.

El script acumuló esos eventos entre estados y marcó nueve archivos con `-unverified`. **Ese sufijo no invalida una captura auténtica ni demuestra que WebGL fallara.** La revisión humana confirma popups, mapas y filtros visibles. Se conservan nombres y manifiesto originales para mantener la trazabilidad; no se corrigen silenciosamente sus banderas automáticas.

## Estado y pendientes

Se obtuvieron las 12 capturas solicitadas. Se comprobaron sus dimensiones, los estados visibles y el manifiesto; no se modificaron las aplicaciones ni se ejecutaron instalaciones/builds/pruebas npm. Los 107 originales siguen coincidiendo con sus hashes.

Quedan pendientes reglas, tolerancia, exportaciones, restauración, teclado, foco, contraste cuantificado, gestos táctiles y correspondencia completa de filtros/selección. Tampoco se asignan resultados nuevos a los motores GIS ni se alteran las puntuaciones técnicas previas. La comparación visual parcial está en [visual-comparison.md](visual-comparison.md). Los informes y capturas se incorporan al repositorio como evidencia parcial; la auditoría funcional completa sigue pendiente.
