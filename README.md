# Geospatial Flash Benchmark

An independent comparison of three AI-generated implementations of **Quito Cadastre Quality Lab**: a browser-based quality checker for synthetic cadastral parcels near Quito, Ecuador.

The research question: how well do three coding models translate one GIS specification into spatial validation, maintainable software and a usable application? This is a community experiment curated by **faustoaguanor**, not an official provider evaluation.

| Submission | Model attribution (reported) | Original directory |
|---|---|---|
| DeepSeek | DeepSeek V4.1 Flash | [`implementations/deepseek`](implementations/deepseek) |
| GLM | GLM-5.3 Flash | [`implementations/glm`](implementations/glm) |
| MiMo | MiMo V2.6 Flash | [`implementations/mimo`](implementations/mimo) |

**Synthetic data only.** These parcels are generated demonstrations, not official information from the Municipio del Distrito Metropolitano de Quito. The six named sectors are approximate demonstration locations, not verified administrative boundaries. No cadastral certification, municipal validation, positional accuracy or provider endorsement is claimed.

## Audit status and demos

The public repository is published. **GitHub Actions verified all 171 original tests, built all three applications and successfully deployed the Pages artifact on 2026-10-31.** [Verified deployment run](https://github.com/faustoaguanor/geospatial-flash-benchmark/actions/runs/41252590779). A subsequent owner-run Brave/Playwright session produced 12 genuine screenshots, reviewed with its execution manifest. Initial rendering, popups and applied filter controls are evidenced; the full eight-test browser protocol remains incomplete. Published deployment targets:

- [Comparison website](https://faustoaguanor.github.io/geospatial-flash-benchmark/)
- [DeepSeek application](https://faustoaguanor.github.io/geospatial-flash-benchmark/deepseek/)
- [GLM application](https://faustoaguanor.github.io/geospatial-flash-benchmark/glm/)
- [MiMo application](https://faustoaguanor.github.io/geospatial-flash-benchmark/mimo/)

See [publication status and remaining steps](results/reports/publication.md).

## Verified results

Audit date: 2026-10-31; Node 24.16.0, npm 12.2.0. All original files are frozen. The SHA-256 manifest covers **107 files**; dependencies and generated artifacts are excluded.

| Evidence | DeepSeek | GLM | MiMo |
|---|---:|---:|---:|
| Parsed synthetic features | 72 | 72 | 68 |
| Existing tests independently executed | 64/64 passed | 56/56 passed on GitHub; 55/56 locally | 51/51 passed |
| Production build | Passed | Passed | Passed |
| Provisional technical subtotal /80 | 61 | 50 | 58 |
| Reviewed browser screenshots | 4 | 4 | 4 |
| Visual design: aesthetics + composition /8 | 7 | 6 | 4.5 |
| Evaluated-scope total /88 | 68 | 56 | 62.5 |

GLM's generator test initially hit `spawnSync EPERM` in the local sandbox; its assertion did not execute there. All 56 tests subsequently passed unchanged on GitHub Actions. Two direct generator runs in an isolated copy preserved both original output hashes. The local failure was an environment limitation; it was not a demonstrated generator defect. The hosted 56/56 result is separately verified.

Independent diagnostic cases confirmed overlap/boundary discrimination in all three. They also exposed GLM's one-sided overlap indicators and missing-ID normalization, MiMo's malformed-MultiPolygon crash, and shared shortcomings in exterior-hole validity and orientation-independent duplicate detection. [Technical comparison](results/reports/technical-comparison.md) documents evidence and qualifications.

**Provisional categories:** DeepSeek leads the observed GIS review; MiMo has the strongest module/map-loading separation. DeepSeek also leads the reviewed aesthetics/composition and observed mobile arrangement, provisionally. DeepSeek has the highest evaluated-scope score, 68/88. Full UX and cartographic winners are not established. GLM was fastest according to reported timing. A complete-cost winner cannot be determined.

## Conclusions of the exercise

All three submissions achieved a deployable demonstration, but passing model-authored tests did not establish cadastral correctness or production readiness. Independent geometry cases found shared validity/duplicate limitations and model-specific indicator/input defects. The browser captures added UX evidence that compilation and unit tests cannot supply.

DeepSeek offers the strongest observed balance for continuing a separately identified demo derivative; MiMo provides the clearest module separation, and GLM the shortest reported delivery time. These are findings about three particular submissions, not universal model rankings. Different generated datasets, partial costs and a single run per model prevent stronger generalization.

At the owner’s request, scoring now includes only the evaluated visual components: aesthetics and composition, worth 8 points. Added to the unchanged technical subtotals out of 80, the totals are DeepSeek 68/88, MiMo 62.5/88 and GLM 56/88. The uncompleted visual criteria are excluded rather than left pending or scored as zero. These totals are not normalized to 100. Rules, tolerance changes, exports, restoration and accessibility need further browser testing. No operational cadastral use is endorsed. Read the [full professional conclusions](results/reports/conclusions.md) and the [qualified browser matrix](results/reports/browser-functional-audit.md).

## Reported development telemetry

These values were supplied by the original experiment owner/agents and were **not independently timed or reconciled against billing**.

| Metric | DeepSeek | GLM | MiMo |
|---|---:|---:|---:|
| Development time | 16m 50s | 5m 51s | 25m 52s |
| Dashboard requests | 106 | 70 | 43 |
| Dashboard tokens | 12.7M | 6.6M | 2.9M |
| Dashboard usage share | 32.6% | 49.6% | 17.5% |
| Original reported passing tests | 64 | 56 | 51 |
| Visible request cost | Unavailable | At least USD 0.22242 | Approximately USD 0.04922 |

Usage percentages are not prices; their accounting basis is not verified and they are not renormalized. Monetary amounts are partial observations. MiMo has the lowest supplied partial visible amount and token total, which does not establish lowest complete cost.

## Methodology and limitations

All models received the [same benchmark prompt](benchmark/prompt.md), but each generated its own dataset. Generated incidence counts and internal passing-test totals are therefore **not directly comparable measures of correctness**. Model-authored expectations are not independent ground truth. This audit did not alter the implementations to make tests pass or deployment work.

The audit uses isolated lockfile installations, original tests (including a successful hosted run), production builds, selected source review and 16 shared diagnostic cases per model with schema adapters. It is one submission per model, without repeated trials or controlled agent budgets. Scores are post-hoc reviewer judgments; incomplete browser/accessibility verification prevents a full ranking. The 5% tolerance is experimental, not an ISO/municipal standard. Official accuracy cannot be evaluated without reference data.

- [Methodology](benchmark/methodology.md)
- [Rubric and qualified results](benchmark/evaluation.md)
- [Machine-readable results](benchmark/results.csv)
- [Functional verification](results/reports/functional-verification.md)
- [Visual comparison with genuine screenshots](results/reports/visual-comparison.md)
- [Browser functional matrix](results/reports/browser-functional-audit.md)
- [Professional conclusions](results/reports/conclusions.md)
- [Source integrity manifest](results/reports/source-integrity.json)

## Reproduce without editing originals

Requirements: Node.js 24, npm, Python 3 and Bash. A working network/package cache is needed for locked dependencies; an unrestricted runner is needed for GLM's subprocess test. No backend or API key is required. Basemaps require external network access.

```bash
python3 scripts/verify-integrity.py
bash scripts/build-site.sh /tmp/quito-benchmark-site-new
python3 -m http.server 8080 --directory /tmp/quito-benchmark-site-new
```

The output directory must be absolute and absent beforehand. The build copies each submission into a fresh temporary workspace, runs `npm ci`, all existing tests and Vite with `--base=./`, then assembles the site. Any test/build error stops deployment. Preview serving and browser evaluation could not run in this session because sockets were denied.

For a single submission, copy it to an isolated directory (exclude `node_modules`, `dist` and caches), then run its `npm ci`, `npm test`, `npm run build -- --base=./` and `npm run preview`. All three expose `dev`, `test`, `build`, `preview`, `test:watch`; generator scripts are `generate:data` for DeepSeek/GLM and `generate-data` for MiMo. Run generators **only in copies**.

To reproduce shared diagnostics after installing three copies under a directory:

```bash
node scripts/audit-engines.mjs /tmp/geospatial-flash-audit
```

## Technology and repository layout

The submissions use JavaScript ES modules, Vite, MapLibre GL JS, Turf.js, Vitest, HTML and CSS. The separate landing page uses plain HTML/CSS, local system fonts and a schematic SVG illustration. It has no framework, analytics or credential-dependent service. The public comparison interface is in Spanish, including navigation, controls, accessibility labels and WebGL guidance; technical repository documentation remains primarily in English. The comparison supports system-aware light/dark appearance with a saved preference, and app links open in new tabs. During assembly, a separate benchmark navigation/help bar is added to the generated app HTML, providing a return link and a friendly WebGL availability notice. No original source file or GIS logic is modified; the apps retain their original appearance. The WebGL probe is a capability check, not proof of successful map rendering.

```text
implementations/{deepseek,glm,mimo}/  Immutable original submissions
benchmark/                         Original prompt, methodology, rubric, CSV
results/reports/                   Findings, command evidence, integrity hashes
results/screenshots/               Twelve genuine browser captures and manifest
scripts/                           External audit and isolated build helpers
docs/                              Separate comparison website
.github/workflows/deploy.yml       Verify, assemble and deploy one Pages site
```

There are no private fixtures in the existing `benchmark/hidden-tests/` directory; its empty placeholder is excluded from publication. New private tests must stay outside this public repository.

## Deployment

[The workflow](.github/workflows/deploy.yml) tests and builds on pushes to `main`, pull requests and manual dispatch. Only main/manual non-PR runs upload/deploy. It uses official checkout, Node setup, Pages configuration, artifact upload and deployment actions; elevated Pages/OIDC permissions are limited to the deployment job. Build inputs and dependency trees are never uploaded. All apps are assembled under their own subdirectories, with original Vite configuration unchanged.

Configure repository **Settings → Pages → Source → GitHub Actions**. After publishing, inspect the Actions run, all four URLs, JavaScript/CSS/GeoJSON requests and actual Chromium behavior. See the [publication runbook](results/reports/publication.md) for commands and blockers.

## License, attribution and contributing

Repository-owned material is released under the [MIT License](LICENSE), Copyright (c) 2026 faustoaguanor, to the extent the owner can license it. This does not relicense dependencies or claim ownership of external map resources or exclusive copyright in AI output. No conflicting project license was found in the inspected sources.

[Third-party notices](THIRD_PARTY_NOTICES.md) identify npm libraries and the OpenStreetMap/OpenFreeMap basemaps; collected package legal texts are in [docs/third-party-licenses.txt](docs/third-party-licenses.txt). Original map attribution controls are retained. Read [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md); preserve the frozen submissions and submit improvements as clearly identified derivatives.
