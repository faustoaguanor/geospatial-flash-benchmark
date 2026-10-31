/* Benchmark-owned page chrome; never changes a model's GIS logic. */
(() => {
  'use strict';
  const key = 'geospatial-flash-theme';
  const root = document.documentElement;
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  let preference;
  try { preference = localStorage.getItem(key); } catch { /* Storage may be disabled. */ }
  const valid = value => value === 'dark' || value === 'light';
  if (!valid(preference)) preference = null;

  function applyTheme() {
    const dark = preference ? preference === 'dark' : Boolean(media?.matches);
    root.dataset.theme = dark ? 'dark' : 'light';
    for (const button of document.querySelectorAll('[data-benchmark-theme-toggle]')) {
      button.hidden = false;
      button.textContent = dark ? '☀ Light mode' : '☾ Dark mode';
      button.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    }
  }
  applyTheme(); // Before the stylesheet paints: avoid a bright flash in dark mode.
  media?.addEventListener?.('change', () => { if (!preference) applyTheme(); });
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) {
      preference = valid(event.newValue) ? event.newValue : null;
      applyTheme();
    }
  });

  function hasWebGL() {
    // The frozen MapLibre 4/5 submissions accept WebGL1 fallback as well as WebGL2.
    for (const type of ['webgl2', 'webgl', 'experimental-webgl']) {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext(type);
        if (!gl || gl.isContextLost?.()) continue;
        // Release this small capability probe instead of retaining GPU contexts.
        try { gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* Optional extension. */ }
        return true;
      } catch { /* A privacy setting or graphics driver can reject the request. */ }
    }
    return false;
  }

  function init() {
    applyTheme();
    for (const button of document.querySelectorAll('[data-benchmark-theme-toggle]')) {
      button.addEventListener('click', () => {
        preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
        try { localStorage.setItem(key, preference); } catch { /* Still works for this page. */ }
        applyTheme();
      });
    }
    const panel = document.querySelector('[data-benchmark-webgl-warning]');
    if (!panel) return;
    const status = document.querySelector('[data-benchmark-webgl-status]');
    const retry = panel.querySelector('[data-benchmark-webgl-retry]');
    const feedback = panel.querySelector('[data-benchmark-webgl-feedback]');
    const spanish = root.lang.startsWith('es');
    const announcement = document.querySelector('[data-benchmark-webgl-announcement]');
    function update(lost = false) {
      const available = !lost && hasWebGL();
      panel.hidden = available;
      if (status) {
        status.hidden = false;
        status.textContent = available ? 'WebGL disponible' : 'Ayuda con el mapa';
        status.setAttribute('aria-expanded', String(!available));
      }
      if (feedback) feedback.textContent = '';
      return available;
    }
    status?.addEventListener('click', () => {
      panel.hidden = !panel.hidden;
      status.setAttribute('aria-expanded', String(!panel.hidden));
    });
    retry?.addEventListener('click', () => {
      if (update()) {
        // Leave the status announcement visible when the help panel closes.
        if (status) status.textContent = 'WebGL disponible';
        if (announcement) announcement.textContent = spanish
          ? 'WebGL ya está disponible. Recarga la aplicación para volver a iniciar el mapa.'
          : 'WebGL is now available. Reload any application you already opened to restart its map.';
      } else if (feedback) {
        feedback.textContent = spanish
          ? 'WebGL todavía no está disponible. Prueba los pasos de ayuda o vuelve a la comparación.'
          : 'WebGL is still unavailable. Try the steps above or return to the comparison.';
      }
    });
    // Capture context loss without intercepting the original map's recovery handlers.
    document.addEventListener('webglcontextlost', event => {
      if (event.target?.classList?.contains('maplibregl-canvas')) update(true);
    }, true);
    update();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
