# Methodology

Audit date: 2026-10-31. Curator: faustoaguanor. This independent community experiment asks how three AI-generated GIS applications perform against the same [original prompt](prompt.md). It is not an official model-provider evaluation.

## Experimental unit

DeepSeek V4.1 Flash, GLM-5.3 Flash and MiMo V2.6 Flash independently implemented Quito Cadastre Quality Lab using JavaScript ES modules, Vite, MapLibre GL JS, Turf.js and Vitest. Each generated its own seeded synthetic parcel dataset. The data contain 72, 72 and 68 features respectively, verified by parsing the submitted GeoJSON. Sector names are illustrative locations, not verified administrative boundaries.

## Evidence protocol

1. Hash every original submission file, excluding dependencies, builds and caches; retain baseline outside the submissions. Verify paths and SHA-256 hashes again after the audit and in CI.
2. Copy submissions into temporary directories. Use `npm ci` with original lockfiles; run the existing `npm test` and `npm run build -- --base=./` without repairs or dependency changes.
3. Inspect selected engine, loader, map, export and UI modules. Exercise 16 shared geometry/input scenarios through adapters in `scripts/audit-engines.mjs`. Inputs use the same coordinates and distinct synthetic identifiers; attribute defaults come from each model's submitted dataset because schemas differ. MiMo's loader precedes its array-based engine. These diagnostic probes are separate from model-authored unit tests and do not constitute a complete independent test suite.
4. Check built HTML references, copied GeoJSON and subdirectory layout without reading generated JavaScript. Attempt previews and browser verification. Record environmental failures rather than claiming a rendered result.
5. Score only observed technical scope using the published rubric. Record reviewer judgment separately from measured counts; withhold a 100-point total and visual winners until actual browser evaluation.
6. Build a separate static site. CI tests and builds isolated copies, generates legal notices, assembles subdirectories and deploys one official Pages artifact. No source repairs are allowed.

## Evidence labels

- **Verified:** executed command, inspected artifact or reproduced independent case.
- **Reported:** supplied by the original experiment owner/agents, without independent execution/telemetry confirmation.
- **Source inference:** behavior inferred from selected original code, without browser execution.
- **Unverified:** unavailable evidence, including desktop/mobile rendering and remote deployment in this session.

## Limits

This is one submission per model, not a repeated or randomized experiment. Prompt equality does not establish equal tool budgets, context, hardware, sampling, agent orchestration or pricing. Model versions/provider attribution are owner-reported. Runtime, requests and tokens are reported development telemetry, not this audit's execution time. Dashboard request counts do not necessarily equal conversational turns.

Dataset generation and model-authored expectations are not independent ground truth. Internal incidence counts and pass counts cannot rank GIS correctness across different datasets. The 5% area tolerance and small overlap cutoffs are experimental choices; ISO 19157-1:2023 does not prescribe a universal tolerance here. There is no reference cadastral layer to establish positional accuracy, official municipal conformity, thematic truth or survey precision.

Turf area is appropriate for an educational geographic-coordinate comparison but is not a certified ellipsoidal survey computation. The implementations' projected-coordinate descriptions were not validated against an authoritative local CRS definition. TMQ and UTM must not be conflated. No official TMQ parameters are asserted by this audit.

Browser availability, sandbox subprocess/listener restrictions and GitHub authentication limited final verification. See the functional and visual reports for exact scope. Monetary observations are partial and cannot determine the cheapest complete implementation.
