# Technical comparison

Audit: 2026-10-31. **Scope:** selective source review, original tests in isolated lockfile installations, production builds and 16 independent diagnostic scenarios per submission. Source files were never repaired. See [raw diagnostic results](independent-cases.json) and [rubric](../../benchmark/evaluation.md). The adapter deliberately uses each model's schema and MiMo's parser before its feature-array engine. It does not make schemas or incidence semantics identical.

## Verified shared cases

| Scenario | DeepSeek | GLM | MiMo |
|---|---|---|---|
| Disjoint rectangles | No geometry issue | No geometry issue | No geometry issue |
| Positive-area overlap | Both parcels flagged | Only second parcel flagged | Both parcels flagged |
| Boundary-only edge/vertex | No overlap; distinct contact categories | No overlap; distinct informational codes | No overlap; combined boundary/vertex contact |
| Identical coordinates | Duplicate and overlap | Duplicate; overlap intentionally suppressed | Duplicate and overlap |
| Reversed ring, same geometry | Duplicate missed; overlap found | Duplicate missed; overlap found | Duplicate missed; overlap found |
| Bowtie | Self-intersection and zero-area issues | Self-intersection and zero-area issues | Self-intersection and zero-area issues |
| Exterior hole | No geometry-validity issue | No geometry-validity issue (unrelated attribute warning) | No geometry-validity issue |
| Polygon coordinates `[null]` | Reported; no exception | Reported; no exception | Reported; no exception |
| MultiPolygon coordinates `[null]` | Reported; no exception | Reported; no exception | Uncaught `forEach` error |
| Missing ID | Required-attribute issue | No issue: ID synthesized before validation | Required-attribute issue |
| Two distinct parcels with duplicate ID | Both parcels counted as erroneous | One erroneous ID counted against two features | Both features counted as erroneous |
| Null feature | Structural issue | Structural issue | Structural issues |
| Empty/invalid collection | Structural issue | Structural issue | Loader rejects with structural issue |
| Registered area = geometry × 1.051 | Surface tolerance exceeded | Within its registered-area-relative tolerance | Surface tolerance exceeded |

The final area case exposes a **definition difference**, not automatically a defect: DeepSeek/MiMo divide by geometric area (5.1%); GLM divides by registered area (about 4.85%). Comparisons require a common denominator. No universal 5% standard is asserted.

## Architecture and GIS reasoning

**DeepSeek:** DOM-free `src/core/engine.js` orchestrates structural, attribute, geometry, topology, surface and indicator modules. Internal entity identifiers preserve parcel counts when business IDs collide. `classifyPair` separates overlap from edge/vertex contact; topology has bounding-box rejection and a documented feature limit. UI orchestration is substantially larger than the core modules. Surface checks can proceed for invalid/self-intersecting nonzero-area geometry because the engine does not gate them on the self-intersection result (source inference). Pair classification errors increment a counter but are not all surfaced in `notEvaluated` (source inference).

**GLM:** responsibilities are separated into small modules under `src/modules`. `runQualityAnalysis` creates missing IDs before attribute rules, hiding the original missing-value defect in the shared case. `evaluateTopology` records overlap against only `b.id`; the shared two-parcel case consequently reports 50% error-free parcels although both overlap. Duplicate-ID indicators use unique business IDs against feature counts and fail to partition the two-feature case. `skippedPairs` returned by topology is discarded by the orchestrator (source inference). Surface evaluation is not gated on geometric validity (source inference). Several Turf subpackages are imported transitively through the aggregate Turf dependency, coupling resolution to its installation structure.

**MiMo:** engine, validation, loaders, exports, map and UI modules are separated; map code is dynamically imported (source inference supported by separate build chunk). Invalid geometries gate area comparisons and topology. The shared malformed MultiPolygon crashes when ring iteration calls `forEach` on null. Contact reporting combines edge and vertex when Turf returns no polygon intersection. A catch around `kinks` assigns `false` without adding a not-evaluated record, despite its comment (source inference). Configurable zero-percent surface tolerance becomes 5 in UI code through `Number(value) || 5` (source inference; no browser reproduction).

All three use Turf area over `[longitude, latitude]`, not planar square degrees. This is suitable for demonstration-scale geographic data but does not establish official cadastral or ellipsoidal survey accuracy. Original comments describing an ellipsoid should not be treated as numerical proof. [Turf's area documentation](https://turfjs.org/docs/api/area) describes square-metre geodesic area. Duplicate keys serialize coordinate order (with rounding in DeepSeek/GLM); they do not canonicalize ring start, winding or multipart order. None of the selected engines establishes complete polygon validity, as the exterior-hole probe demonstrates.

All three have worst-case O(n²) parcel-pair iteration with bounding-box prefilters; DeepSeek explicitly skips topology over its configured limit. This is a small-data laboratory, not a demonstrated scalable cadastre engine. Kinks/proper-segment checks do not by themselves establish all ring/hole/MultiPolygon validity conditions.

## Security and robustness

Source inspection found DOM text construction for DeepSeek/MiMo popups and HTML escaping at GLM's popup call site; no exploitable popup injection was established. This is not a penetration test. Exporters quote CSV delimiters but do not neutralize spreadsheet formula prefixes in user-derived fields (source inference), so untrusted exports warrant care when opened in spreadsheet software. A dependency advisory audit was not completed; no assertion of vulnerability-free dependencies is made.

Basemaps are external network resources; map initialization and attribution visibility need browser verification. No original code was modified to compensate for these limitations.

## Assessment

Provisional technical subtotals: DeepSeek 61/80, GLM 50/80, MiMo 58/80. These are post-hoc judgments over observed scope, not a complete 100-point ranking. DeepSeek leads audited GIS behavior; MiMo has the clearest separation and map-loading boundary. GLM is the reported fastest implementation. All 171 original tests and the Pages deployment subsequently passed on GitHub Actions (see functional verification). Visual/UX winners and an overall winner are withheld. MiMo's USD 0.04922 is only the lowest supplied **partial** visible amount; GLM's at-least USD 0.22242 and unknown DeepSeek cost prevent complete-cost ranking.
