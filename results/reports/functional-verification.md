# Functional verification

Audit date: 2026-10-31. Environment: Linux sandbox, Node 24.16.0, npm 12.2.0. `npm ci --no-audit --no-fund` completed for all three copies under `/tmp/geospatial-flash-audit/`. No original dependency, source, lockfile or test was edited. Installed version metadata is recorded in third-party notices.

| Submission | Existing tests executed | Production build | Original demo features |
|---|---|---|---:|
| DeepSeek | 64 passed / 64 | Passed, Vite 7.3.7 | 72 |
| GLM | 55 passed / 56; 1 environment failure | Passed separately, Vite 5.4.21 | 72 |
| MiMo | 51 passed / 51 | Passed, Vite 7.3.7 | 68 |

Commands in each copy: `npm ci --no-audit --no-fund`, `npm test`, `npm run build -- --base=./`. GLM's build was executed separately after its test command failed. The failure is the generator reproducibility test's `execFileSync(process.execPath, ...)`, denied with `spawnSync … EPERM` by this sandbox. The application assertion was not reached. Running the original generator twice as separate terminal commands preserved the original GeoJSON SHA-256 `aaafb5647e16ac58d43995807785ea60530109f209d22849b693050f58705a37` and expected-issues SHA-256 `b8f2db06a327b871f578a8e26c2e0299cff719dd41cd9218824f5b9c1c2abb88`. This corroborates reproducibility but is **not** a claim that all 56 tests passed here.

DeepSeek/MiMo builds emitted large-chunk warnings. MiMo produced a separate map module chunk. Generated artifacts and original datasets were checked without reading minified bundles. Selected original output is preserved in [verification logs](verification-logs.txt).

## Independent diagnostics

`node scripts/audit-engines.mjs /tmp/geospatial-flash-audit` exercised 16 cases per model (48 diagnostic executions). These are shared-coordinate scenarios, with schema-specific attributes and a MiMo loader adapter, rather than identical end-to-end browser tests. Outputs are raw observations, not an independently passing test count. The original 64/56/51 tests were model-authored, even though their execution was independently observed. Major defects are detailed in the technical comparison.

## Preview and browser attempts

`npm run preview -- --host 127.0.0.1 --port 4173 --strictPort` (DeepSeek), port 4174 (GLM), and port 4175 (MiMo) all failed on socket binding with `listen EPERM`. No server remained running. Browser automation tools, Chromium and Chrome were unavailable. Firefox was present but no usable browser automation/rendering session was available. No real page, map, popup, filter, export download, mobile layout or network-loaded GeoJSON was verified. Static asset existence and parsed GeoJSON are distinct from runtime loading.

## Hosted verification — completed

[GitHub Actions run 41252590779](https://github.com/faustoaguanor/geospatial-flash-benchmark/actions/runs/41252590779), commit `86af38a22c91bbf3fc3c7d14d4b5e13e29abf8b6`, passed all 64 DeepSeek, 56 GLM and 51 MiMo original tests and all three builds. The hosted run also passed the external artifact checks and source-integrity check. No implementation repair was needed. This resolves the local GLM subprocess limitation for hosted execution; local results above remain a faithful record of that environment.

The first deployment attempt failed because Pages was not enabled. After the owner selected GitHub Actions as the Pages source and reran the failed job, `configure-pages` and deployment both succeeded at 2026-10-31 23:30 UTC. The deployment action reported the environment URL `https://faustoaguanor.github.io/geospatial-flash-benchmark/`. This verifies the official deployment result, not real-browser application behavior. Attempts to fetch the four public URLs through the web tool were unsuccessful; no HTTP status or complete runtime success is inferred from that limitation.

## Deployment scope

The workflow runs all existing tests and builds in isolated copies and fails on errors. It will not suppress GLM's test or replace expectations. A standard GitHub runner may permit its subprocess, and it subsequently passed all 56 tests on the observed hosted run. Node 24 is selected; the local run used npm 12 and the hosted runner's bundled npm version may differ.

Built HTML and relative app assets are checked by `scripts/check-site.py`. The assembled local inspection artifact uses successful individual builds; it does not turn the GLM test failure into a passing CI run. Official remote deployment is verified above; browser behavior remains unverified.

## External tooling checks

The complete `build-site.sh` was exercised once after implementation. It verified hashes, installed/tested/built DeepSeek, then stopped with a nonzero exit at the same GLM `spawnSync EPERM` test failure. It did not bypass GLM to manufacture a successful combined deployment. A separate inspection artifact assembled from the three already successful standalone builds passed 19 local HTML reference checks and byte-identical demo-data checks. Bash/Node/Python helper syntax checks passed; no YAML/actionlint executable was available for workflow validation.
