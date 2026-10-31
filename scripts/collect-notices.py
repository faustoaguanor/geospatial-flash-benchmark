#!/usr/bin/env python3
"""Collect npm legal metadata/text only, without inspecting dependency code."""
import json
import sys
from pathlib import Path

root, output = map(Path, sys.argv[1:])
seen = set()
blocks = ['NPM DEPENDENCY LICENSE NOTICES\nGenerated from installed, locked packages.\n']
for model in ('deepseek', 'glm', 'mimo'):
    app = root / model
    lock = json.loads((app / 'package-lock.json').read_text())
    for rel in sorted(lock['packages']):
        if not rel:
            continue
        folder = app / rel
        metadata = folder / 'package.json'
        if not metadata.is_file():
            continue  # Optional platform-specific package not installed here.
        data = json.loads(metadata.read_text())
        key = (data.get('name'), data.get('version'))
        if key in seen:
            continue
        seen.add(key)
        blocks.append(f'\n=== {key[0]} {key[1]} | {data.get("license", "see upstream")} ===\n')
        for path in sorted(folder.iterdir()):
            if path.is_file() and path.name.lower().startswith(('license', 'licence', 'notice', 'copying')):
                blocks.append(path.name + '\n' + path.read_text(errors='replace'))
output.write_text('\n'.join(blocks))
print(f'Collected legal notices for {len(seen)} installed package versions')
