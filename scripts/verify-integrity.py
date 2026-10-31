#!/usr/bin/env python3
"""Compare original file paths and bytes to the recorded pre-audit baseline."""
import argparse
import datetime
import hashlib
import json
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--record', action='store_true')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
manifest = root / 'results/reports/source-integrity.json'
data = json.loads(manifest.read_text())
excluded = set(data['excluded_directories'])
current = {}
for folder in ('deepseek', 'glm', 'mimo'):
    for path in sorted((root / 'implementations' / folder).rglob('*')):
        if not excluded.intersection(path.relative_to(root).parts) and path.is_file():
            current[str(path.relative_to(root))] = hashlib.sha256(path.read_bytes()).hexdigest()
initial = data['initial']
changed = sorted(k for k in initial.keys() & current.keys() if initial[k] != current[k])
result = dict(checked_utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
              unchanged=not (changed or initial.keys() ^ current.keys()),
              files_checked=len(current), changed=changed,
              added=sorted(current.keys() - initial.keys()), removed=sorted(initial.keys() - current.keys()))
if args.record:
    data['verification'] = result
    manifest.write_text(json.dumps(data, indent=2) + '\n')
print(json.dumps(result))
raise SystemExit(0 if result['unchanged'] else 1)
