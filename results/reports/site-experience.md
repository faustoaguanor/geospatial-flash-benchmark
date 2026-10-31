# Comparison-site experience update

2026-10-31. Changes are limited to benchmark-owned website assets and deployment assembly. All 107 original source files remain byte-for-byte unchanged.

- The comparison page follows the operating system's light/dark preference. A keyboard-accessible toggle saves a manual choice when local storage is available; blocked storage does not break the page. Other tabs can follow saved preference changes.
- Model application links open a new tab with `noopener noreferrer` and an accessible new-tab label. The comparison remains open.
- The build adds a small benchmark navigation/help bar to each generated app HTML page. It links to `../#implementations` and supplies Spanish WebGL help. Original source HTML, CSS, JavaScript, data and engines are not edited. The original app appearance is retained; the benchmark bar follows the chosen theme. The added chrome is not part of the model submissions and must not affect their design scores.
- A small, released canvas context checks WebGL2 and WebGL1 fallback. If unavailable, help explains that graphics may be disabled or unsupported, with acceleration/restart/browser suggestions and a retry action. No modal blocks navigation. Captured MapLibre canvas context-loss events also reopen help, without intercepting the original recovery handlers. Capability detection does not guarantee map initialization or external tile availability.

Verification: seven Node tests with simulated browser APIs passed, covering saved appearance, blocked storage, system/cross-tab changes, WebGL1 fallback, graphics failure/recovery, an already-lost context and runtime map-context loss. These are tests of the added website behavior, separate from the 171 original model tests. The assembled inspection site passed 29 local HTML references, new-tab/return-link/help checks and byte-identical dataset checks. The assembly helper refuses original source directories and is idempotent for generated HTML.

No browser automation or usable rendered browser session was available. Desktop/mobile appearance and real GPU behavior remain unverified; no screenshots were fabricated. No dependency upgrade or original implementation repair was made.

Language follow-up: the entire public comparison interface is translated into Spanish, including metadata, accessible labels, tables, controls and fallback guidance. Proper project/model/library names are retained. Technical repository reports remain in English.
