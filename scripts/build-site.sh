#!/usr/bin/env bash
# Build and test isolated copies; source directories stay untouched.
set -euo pipefail
ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
OUTPUT=${1:?Usage: bash scripts/build-site.sh /absolute/output-directory}
if [[ "$OUTPUT" != /* || -e "$OUTPUT" ]]; then
  echo 'Output must be an absolute, nonexistent directory.' >&2
  exit 1
fi
WORK=$(mktemp -d)
trap 'rm -rf -- "$WORK"' EXIT
python3 "$ROOT/scripts/verify-integrity.py"
node --test --test-isolation=none "$ROOT/tests/site-experience.test.cjs"
python3 - "$ROOT" "$WORK" <<'PY'
import shutil, sys
from pathlib import Path
root, work = map(Path, sys.argv[1:])
for model in ('deepseek', 'glm', 'mimo'):
    shutil.copytree(root / 'implementations' / model, work / model,
                    ignore=shutil.ignore_patterns('node_modules', 'dist', 'coverage', '.vite', '.git'))
PY
for model in deepseek glm mimo; do
  (
    cd "$WORK/$model"
    npm ci --no-audit --no-fund
    npm test
    npm run build -- --base=./
  )
done
node "$ROOT/scripts/audit-engines.mjs" "$WORK" > "$WORK/independent-cases.json"
mkdir -p -- "$OUTPUT"
cp -R "$ROOT/docs/." "$OUTPUT/"
mkdir -p "$OUTPUT/reports"
cp "$ROOT"/results/reports/* "$OUTPUT/reports/"
cp "$WORK/independent-cases.json" "$OUTPUT/reports/independent-cases-current.json"
mkdir -p "$OUTPUT/screenshots/browser-audit"
cp "$ROOT"/results/screenshots/browser-audit/*.png "$OUTPUT/screenshots/browser-audit/"
cp "$ROOT/results/screenshots/browser-audit/capture-manifest.json" "$OUTPUT/screenshots/browser-audit/"
for model in deepseek glm mimo; do
  cp -R "$WORK/$model/dist" "$OUTPUT/$model"
done
python3 "$ROOT/scripts/add-app-shell.py" "$OUTPUT"
python3 "$ROOT/scripts/collect-notices.py" "$WORK" "$OUTPUT/third-party-licenses.txt"
cp "$ROOT/LICENSE" "$ROOT/THIRD_PARTY_NOTICES.md" "$OUTPUT/"
touch "$OUTPUT/.nojekyll"
python3 "$ROOT/scripts/check-site.py" "$OUTPUT"
python3 "$ROOT/scripts/verify-integrity.py"
