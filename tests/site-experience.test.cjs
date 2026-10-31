const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const source = readFileSync(require('node:path').join(__dirname, '../docs/assets/experience.js'), 'utf8');

function element(hidden = true) {
  return { hidden, textContent: '', attrs: {}, handlers: {},
    setAttribute(name, value) { this.attrs[name] = value; },
    addEventListener(name, listener) { this.handlers[name] = listener; },
  };
}
function browser({ stored = null, dark = false, blockedStorage = false, contexts = [] } = {}) {
  const toggle = element(), panel = element(), retry = element(), feedback = element();
  const status = element(), announcement = element();
  const handlers = {}, windowHandlers = {}, requested = [];
  const media = { matches: dark, addEventListener(name, listener) { this.change = listener; } };
  let released = 0;
  const document = {
    documentElement: { dataset: {}, lang: 'es' }, readyState: 'loading',
    querySelectorAll: selector => selector.includes('theme-toggle') ? [toggle] : [],
    querySelector: selector => ({
      '[data-benchmark-webgl-warning]': panel, '[data-benchmark-webgl-status]': status,
      '[data-benchmark-webgl-announcement]': announcement,
    })[selector],
    addEventListener(name, listener) { handlers[name] = listener; },
    createElement() { return { getContext(type) {
      requested.push(type);
      if (contexts.includes('throw')) throw new Error('Graphics blocked');
      return contexts.includes(type) ? {
        isContextLost: () => contexts.includes('lost'),
        getExtension: () => ({ loseContext() { released++; } }),
      } : null;
    } }; },
  };
  panel.querySelector = selector => selector.includes('retry') ? retry : feedback;
  const storage = {
    getItem() { if (blockedStorage) throw new Error('Storage blocked'); return stored; },
    setItem(key, value) { if (blockedStorage) throw new Error('Storage blocked'); stored = value; },
  };
  vm.runInNewContext(source, {
    document, localStorage: storage,
    window: { matchMedia: () => media, addEventListener(name, listener) { windowHandlers[name] = listener; } },
  });
  return { document, toggle, panel, retry, feedback, status, announcement, media, contexts,
    handlers, windowHandlers, requested, released: () => released, stored: () => stored,
    ready: () => handlers.DOMContentLoaded(),
  };
}

test('uses saved appearance before DOM ready and toggles persistently', () => {
  const b = browser({ stored: 'dark', contexts: ['webgl2'] });
  assert.equal(b.document.documentElement.dataset.theme, 'dark');
  b.ready(); b.toggle.handlers.click();
  assert.equal(b.document.documentElement.dataset.theme, 'light');
  assert.equal(b.stored(), 'light');
  assert.equal(b.toggle.attrs['aria-label'], 'Cambiar a modo oscuro');
  assert.equal(b.toggle.textContent, '☾ Modo oscuro');
});
test('blocked storage follows system appearance and still allows manual switching', () => {
  const b = browser({ blockedStorage: true, dark: true });
  b.ready(); b.toggle.handlers.click();
  assert.equal(b.document.documentElement.dataset.theme, 'light');
  b.media.change();
  assert.equal(b.document.documentElement.dataset.theme, 'light');
});
test('follows OS changes without an override and synchronizes another tab', () => {
  const b = browser(); b.ready(); b.media.matches = true; b.media.change();
  assert.equal(b.document.documentElement.dataset.theme, 'dark');
  b.windowHandlers.storage({ key: 'geospatial-flash-theme', newValue: 'light' });
  assert.equal(b.document.documentElement.dataset.theme, 'light');
});
test('WebGL1 fallback avoids an incorrect unsupported warning and releases the probe', () => {
  const b = browser({ contexts: ['webgl'] }); b.ready();
  assert.equal(b.panel.hidden, true);
  assert.deepEqual(b.requested, ['webgl2', 'webgl']);
  assert.equal(b.released(), 1);
});
test('blocked graphics show help without throwing; retry announces recovery', () => {
  const b = browser({ contexts: ['throw'] }); b.ready();
  assert.equal(b.panel.hidden, false);
  b.retry.handlers.click();
  assert.match(b.feedback.textContent, /todavía/);
  b.contexts.splice(0, 1, 'webgl2'); b.retry.handlers.click();
  assert.equal(b.panel.hidden, true);
  assert.match(b.announcement.textContent, /Recarga/);
});
test('a lost probe context is not reported as available', () => {
  const b = browser({ contexts: ['webgl2', 'lost'] }); b.ready();
  assert.equal(b.panel.hidden, false);
});
test('actual map context loss reopens help and retains a working help toggle', () => {
  const b = browser({ contexts: ['webgl2'] }); b.ready();
  b.handlers.webglcontextlost({ target: { classList: { contains: value => value === 'maplibregl-canvas' } } });
  assert.equal(b.panel.hidden, false);
  assert.equal(b.status.attrs['aria-expanded'], 'true');
  b.status.handlers.click();
  assert.equal(b.panel.hidden, true);
  assert.equal(b.status.attrs['aria-expanded'], 'false');
});
