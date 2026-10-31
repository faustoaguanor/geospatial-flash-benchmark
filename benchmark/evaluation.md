# Evaluation rubric and outcome

All point values below are **provisional reviewer judgments**, applied after inspecting evidence; they are not pre-registered measurements. More model-authored tests earn no automatic credit. Detailed findings: [technical comparison](../results/reports/technical-comparison.md).

| Criterion | Maximum | DeepSeek | GLM | MiMo |
|---|---:|---:|---:|---:|
| Geospatial correctness | 30 | 23 | 17 | 22 |
| Functional quality and verification | 20 | 14 | 13 | 14 |
| Architecture and maintainability | 15 | 13 | 11 | 14 |
| Visual design and UX | 20 | Unverified | Unverified | Unverified |
| Robustness and security | 10 | 6 | 5 | 4 |
| Documentation | 5 | 5 | 4 | 4 |
| Observed technical subtotal | 80 | 61 | 50 | 58 |
| Full result | 100 | Withheld | Withheld | Withheld |

The subtotal excludes the entire visual criterion and is not normalized to 100. Functional points remain provisional because previews, browser interactions and real-browser interactions could not run. The subsequent hosted execution passed all 171 tests and deployed successfully; original provisional scores are retained rather than silently rescored. No production-readiness conclusion follows from these scores.

Scoring anchors: GIS credit reflects appropriate area calculations, positive-area overlap discrimination, geometry checks and indicator correctness, with deductions for shared validity/duplicate limitations and reproduced model-specific defects. Functional credit reflects existing tests/builds and diagnostic cases, reserving points for missing end-to-end proof. GLM's sandbox-only generator failure is documented, not treated as a proven application defect. Architecture rewards DOM-free modules and clear responsibility boundaries; MiMo also defers map loading. Robustness deductions reflect invalid-input failures, limited topology/error reporting and CSV/security review gaps. Documentation assesses the original README's reproducibility, schema/rule explanations and limitations, not length.

| Category | Finding and confidence |
|---|---|
| GIS | DeepSeek, provisional: precise edge/vertex classification and both-parcel indicators in shared cases; general polygon validity remains incomplete. MiMo is a close alternative with safer invalid-geometry metric gating. |
| Architecture | MiMo, provisional: compact separated engine/UI/map modules and lazy map import. |
| Visual design | Unverified; no rendered browser comparison. |
| User experience | Unverified; no interaction or mobile validation. |
| Development speed | GLM, **reported** 5m 51s; not independently timed. |
| Economy | No complete-cost winner. MiMo has the lowest supplied partial visible cost and token total; accounting scope is incomplete. |
| Overall | No definitive overall winner. DeepSeek leads this limited technical review; visual and runtime browser evidence is missing. |
