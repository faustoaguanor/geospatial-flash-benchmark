# Publication status and runbook

## Actual state — 2026-10-31

**Not published by this session. No successful GitHub Actions run or live Pages deployment was observed.**

- `gh auth status`: the configured faustoaguanor token was invalid.
- `gh repo view faustoaguanor/geospatial-flash-benchmark --json name,url,visibility`: GitHub API connection failed. Whether the target repository already exists could not be established; no remote was created or overwritten.
- Normal `git init` failed because the workspace exposes `.git` as read-only. No existing usable repository/history was found.
- A local publication commit is prepared using Git metadata under `/tmp/geospatial-flash-benchmark.git`, with the project as its work tree. A portable bundle is saved at `/tmp/geospatial-flash-publication.bundle`; it is outside the public source tree. Normal `git status` inside this workspace will not use that metadata automatically. `/tmp` is session-local: copy the bundle to durable storage if needed.
- The comparison website and all three successful standalone production builds are assembled under `/tmp/geospatial-flash-site-inspection`. Its static paths/datasets were checked. This inspection artifact is not evidence that the entire CI pipeline passed; GLM's subprocess test remains blocked here.
- Attempts to fetch the planned repository and four Pages addresses through the web tool did not yield accessible pages. This does not prove absence or a specific HTTP status. Deployment, Actions status and browser behavior remain unverified.

## Planned public targets — unverified

- Repository: https://github.com/faustoaguanor/geospatial-flash-benchmark
- Landing page: https://faustoaguanor.github.io/geospatial-flash-benchmark/
- DeepSeek: https://faustoaguanor.github.io/geospatial-flash-benchmark/deepseek/
- GLM: https://faustoaguanor.github.io/geospatial-flash-benchmark/glm/
- MiMo: https://faustoaguanor.github.io/geospatial-flash-benchmark/mimo/

## Remaining publication steps on an unrestricted machine

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
