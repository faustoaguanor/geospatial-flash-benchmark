# Publication status and runbook

## Actual state — 2026-10-31

**Published.** Public repository: https://github.com/faustoaguanor/geospatial-flash-benchmark

Verified [Actions run 41252590779](https://github.com/faustoaguanor/geospatial-flash-benchmark/actions/runs/41252590779): all 171 original tests and all three builds passed. Commit: `86af38a22c91bbf3fc3c7d14d4b5e13e29abf8b6`. The initial Pages setup job failed before Pages was enabled. After the owner enabled GitHub Actions as the source and reran the failed job, deployment succeeded at 23:30 UTC on 2026-10-31. The deployment action reported https://faustoaguanor.github.io/geospatial-flash-benchmark/ as its environment URL.

Public HTTP retrieval and browser/WebGL/desktop/mobile behavior remain unverified: web-tool fetches did not return the four public pages. No live screenshots or fabricated status codes are supplied.

### Earlier preparation blockers (resolved for publication)

The owner authenticated and created/pushed the prepared checkout from their terminal. The integration could read Actions results but received 403 when attempting a rerun; the owner reran the failed job. The following entries describe the earlier sandbox state, not current repository/publication status.

- `gh auth status`: the configured faustoaguanor token was invalid.
- `gh repo view faustoaguanor/geospatial-flash-benchmark --json name,url,visibility`: GitHub API connection failed. At that point existence could not be established. The owner subsequently created the public repository and pushed safely.
- Normal `git init` failed because the workspace exposes `.git` as read-only. No existing usable repository/history was found.
- A local publication commit is prepared using Git metadata under `/tmp/geospatial-flash-benchmark.git`, with the project as its work tree. A portable bundle is saved at `/tmp/geospatial-flash-publication.bundle`; it is outside the public source tree. Normal `git status` inside this workspace will not use that metadata automatically. `/tmp` is session-local: copy the bundle to durable storage if needed.
- The comparison website and all three successful standalone production builds are assembled under `/tmp/geospatial-flash-site-inspection`. Its static paths/datasets were checked. This inspection artifact is not evidence that the entire CI pipeline passed; GLM's subprocess test remains blocked here.
- Attempts to fetch the planned repository and four Pages addresses through the web tool did not yield accessible pages. This does not prove absence or a specific HTTP status. The later Actions/deployment result is verified above; public HTTP/browser behavior remains unverified.

## Published Pages targets — deployment verified, browser behavior unverified

- Repository: https://github.com/faustoaguanor/geospatial-flash-benchmark
- Landing page: https://faustoaguanor.github.io/geospatial-flash-benchmark/
- DeepSeek: https://faustoaguanor.github.io/geospatial-flash-benchmark/deepseek/
- GLM: https://faustoaguanor.github.io/geospatial-flash-benchmark/glm/
- MiMo: https://faustoaguanor.github.io/geospatial-flash-benchmark/mimo/

## Recovery and reproduction runbook (publication already completed)

1. Recover the prepared commit into a new, absent checkout path, or initialize the current source tree after its `.git` becomes writable. The bundle preserves the prepared history:

   ```bash
   git clone /tmp/geospatial-flash-publication.bundle /path/to/new-checkout
   cd /path/to/new-checkout
   gh auth login -h github.com
   gh auth status
   gh repo view faustoaguanor/geospatial-flash-benchmark --json name,url,visibility
   ```

2. Inspect the existing remote if that command succeeds. Do not overwrite unrelated work. Only if the API explicitly confirms the repository does not exist, create it:

   ```bash
   gh repo create faustoaguanor/geospatial-flash-benchmark --public --source=. --remote=origin
   ```

   If a related repository already exists, fetch its history and integrate safely before pushing. Never force-push. Confirm the remote and staged/tracked list, then:

   ```bash
   python3 scripts/verify-integrity.py
   git status --short
   git remote -v
   git push -u origin main
   ```

3. Select **Settings → Pages → Build and deployment → GitHub Actions**. Alternatively configure through `gh` (use the POST only if Pages is not already configured):

   ```bash
   gh api repos/faustoaguanor/geospatial-flash-benchmark/pages
   gh api --method POST repos/faustoaguanor/geospatial-flash-benchmark/pages -f build_type=workflow
   # If a Pages site already exists, switch its build type with PUT instead.
   gh workflow run deploy.yml --ref main
   gh run list --workflow deploy.yml --limit 3
   gh run watch <run-id> --exit-status
   ```

   If the workflow fails, inspect logs. Repair only external tooling/site/docs; never fix original submissions or suppress failing original tests. The local GLM failure is environmental; a hosted runner still needs to demonstrate a passing run.

4. Verify the four URLs with redirects and trailing slashes. Open them in Chromium at 1440×1000 and 390×844. Confirm JS/CSS and `data/quito_predios_sinteticos.geojson` load beneath each application subpath, map/WebGL/basemap initialization, parcel display, evaluations, filters, popups, invalid-file feedback, tolerance/rule controls, exports and map attribution. Static 200 responses alone are insufficient.
5. Record the actual commit, Actions run URL/status and Pages environment URL; add genuine screenshots and update reports/site audit labels only after observing the result. Re-run `python3 scripts/verify-integrity.py`.

The workflow follows the official [Pages deployment mechanism](https://docs.github.com/en/get-started/start-your-journey/deploying-your-website-automatically) and the current [Node setup action](https://github.com/actions/setup-node). It uses relative Vite build paths, copies public demo data into each app, regenerates dependency legal notices and uploads only the assembled static artifact. No original Vite configuration is changed.
