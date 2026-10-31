#!/usr/bin/env python3
"""Add benchmark-owned navigation/help to assembled HTML only; no source edits."""
import sys
from pathlib import Path

site = Path(sys.argv[1]).resolve()
protected = Path(__file__).resolve().parents[1] / 'implementations'
if site == protected or site.is_relative_to(protected) or protected.is_relative_to(site):
    raise SystemExit('Refusing to modify original implementation directories; pass an assembled site outside them.')
for model, label in [('deepseek', 'DeepSeek V4.1 Flash'), ('glm', 'GLM-5.3 Flash'), ('mimo', 'MiMo V2.6 Flash')]:
    page = site / model / 'index.html'
    html = page.read_text()
    if 'data-benchmark-shell' in html:
        continue  # Idempotent for inspection rebuilds.
    head = ('\n<link rel="stylesheet" href="../assets/app-shell.css">'
            '\n<script src="../assets/experience.js"></script>\n')
    shell = f'''
<aside class="benchmark-shell" data-benchmark-shell aria-label="Navegación del benchmark">
  <nav class="benchmark-shell__nav" aria-label="Volver a la comparación">
    <a href="../#implementations">← Volver a la comparación</a>
    <span class="benchmark-shell__name">{label} · Quito Cadastre Quality Lab</span>
    <button type="button" data-benchmark-webgl-status aria-controls="benchmark-webgl-help" aria-expanded="false" hidden>Ayuda con el mapa</button>
    <span class="benchmark-shell__announcement" role="status" aria-live="polite" data-benchmark-webgl-announcement></span>
  </nav>
  <section class="benchmark-shell__warning" id="benchmark-webgl-help" data-benchmark-webgl-warning aria-labelledby="benchmark-webgl-title" hidden>
    <h2 id="benchmark-webgl-title">El mapa necesita una pequeña ayuda de tu navegador</h2>
    <p>No pudimos activar WebGL, la tecnología que dibuja el mapa. Puede estar deshabilitada o no estar disponible en este equipo. El mapa podría quedar vacío; no es un problema de tus datos.</p>
    <details><summary>¿Qué puedo probar?</summary>
      <ol><li>Si tu navegador ofrece aceleración gráfica o por hardware, actívala en sus ajustes y reinícialo.</li>
      <li>Prueba una versión actualizada de Chrome, Chromium o un navegador con WebGL habilitado.</li>
      <li>Si el equipo está administrado, consulta con soporte. Mientras tanto, puedes volver a la comparación.</li></ol>
    </details>
    <button type="button" data-benchmark-webgl-retry>Comprobar de nuevo</button>
    <p class="benchmark-shell__feedback" data-benchmark-webgl-feedback role="status" aria-live="polite"></p>
  </section>
</aside>
'''
    assert '</head>' in html and '<body>' in html, f'Unexpected HTML shell: {model}'
    page.write_text(html.replace('</head>', head + '</head>', 1).replace('<body>', '<body>' + shell, 1))
print('Added benchmark navigation and WebGL guidance to three generated HTML pages only')
