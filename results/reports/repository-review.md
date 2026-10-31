# Repository preparation checks

Audit date: 2026-10-31.

- Original inventory: 107 source/config/test/data/documentation files across three submissions; baseline and final SHA-256 verification match. Node dependencies, builds and caches are excluded.
- No usable Git history or remote was present. Root `.git` is a read-only environment entry; local metadata is held separately under `/tmp`. No remote history was overwritten.
- Root documentation placeholders were expanded. Existing benchmark prompt and submission files were preserved. Original empty private-fixture placeholder is excluded by `benchmark/hidden-tests/`.
- Proposed tracked inventory includes all 107 originals, all three GeoJSON datasets and all three npm lockfiles. No dependency, build, cache, private-agent or credential-directory leaks were found. No nested Git entries/submodules were found in the source inventory.
- `.gitignore` exclusions were exercised with `git check-ignore` for dependencies, build output, local environment files, cloud credentials, agent state and private fixtures. Legitimate source/tests/GeoJSON/lockfiles and future selected screenshots remain includable.
- Credential review used targeted patterns for private-key headers, AWS access-key identifiers, GitHub token shapes and credential-bearing HTTP URLs against proposed text files. No matches were found. This is a selective scan, not a guarantee that arbitrary secrets or personal information could never occur.
- No conflicting project license file or explicit redistribution restriction was found in the selected original material; targeted copyright/license source searches found no additional declarations. Root MIT applies to owner-licensable material only. Library metadata and legal texts were retained separately; external basemaps retain their own terms.
- Bash and JavaScript syntax checks passed. Python helpers compiled. A YAML/actionlint tool was not installed; workflow syntax received manual review but no hosted execution proof.
- Static inspection artifact: all 19 local HTML file references resolved and all three copied demo datasets matched original bytes and feature counts. No generated JavaScript or source maps were read for this check.
- The full isolated build helper was executed and exited nonzero at GLM's environment-denied generator test. It did not publish or suppress the failure. This validates its failure propagation, not a complete passing pipeline.
- No screenshots were fabricated. No temporary preview server stayed running; all listener attempts failed with EPERM.

See `publication.md` for the exact remaining authentication, push, Pages setup and browser checks. Complete remote publication cannot be claimed in this environment.

Original submission whitespace and copied upstream license whitespace are preserved; whitespace review applies to newly authored material.
