# Evaluation rubric and outcome

All point values below are **provisional reviewer judgments**, applied after inspecting evidence; they are not pre-registered measurements. More model-authored tests earn no automatic credit. Detailed findings: [technical comparison](../results/reports/technical-comparison.md).

| Criterion | Maximum | DeepSeek | GLM | MiMo |
|---|---:|---:|---:|---:|
| Geospatial correctness | 30 | 23 | 17 | 22 |
| Functional quality and verification | 20 | 14 | 13 | 14 |
| Architecture and maintainability | 15 | 13 | 11 | 14 |
| Visual design and UX | 20 | Partial; total withheld | Partial; total withheld | Partial; total withheld |
| Robustness and security | 10 | 6 | 5 | 4 |
| Documentation | 5 | 5 | 4 | 4 |
| Observed technical subtotal | 80 | 61 | 50 | 58 |
| Full result | 100 | Withheld | Withheld | Withheld |

The subtotal excludes the entire visual criterion and is not normalized to 100. Functional points remain provisional: real screenshot evidence now covers initial loading, selection, filters and mobile layout, but the eight-test browser protocol is incomplete. The subsequent hosted execution passed all 171 tests and deployed successfully; original provisional scores are retained rather than silently rescored. No production-readiness conclusion follows from these scores.

Scoring anchors: GIS credit reflects appropriate area calculations, positive-area overlap discrimination, geometry checks and indicator correctness, with deductions for shared validity/duplicate limitations and reproduced model-specific defects. Functional credit reflects existing tests/builds and diagnostic cases, reserving points for missing end-to-end proof. GLM's sandbox-only generator failure is documented, not treated as a proven application defect. Architecture rewards DOM-free modules and clear responsibility boundaries; MiMo also defers map loading. Robustness deductions reflect invalid-input failures, limited topology/error reporting and CSV/security review gaps. Documentation assesses the original README's reproducibility, schema/rule explanations and limitations, not length.

| Category | Finding and confidence |
|---|---|
| GIS | DeepSeek, provisional: precise edge/vertex classification and both-parcel indicators in shared cases; general polygon validity remains incomplete. MiMo is a close alternative with safer invalid-geometry metric gating. |
| Architecture | MiMo, provisional: compact separated engine/UI/map modules and lazy map import. |
| Visual design | DeepSeek leads the reviewed aesthetics/composition, provisionally: 7/8 versus GLM 6/8 and MiMo 4.5/8. This is not the full 20-point design criterion. |
| User experience | Full winner withheld. DeepSeek has the strongest observed mobile arrangement; GLM overflows the requested width and MiMo places its map below a long expanded rules panel. Keyboard/touch and complete interaction checks remain pending. |
| Development speed | GLM, **reported** 5m 51s; not independently timed. |
| Economy | No complete-cost winner. MiMo has the lowest supplied partial visible cost and token total; accounting scope is incomplete. |
| Overall | No definitive overall winner. DeepSeek leads this limited technical review; the browser functional protocol and visual/accessibility criteria remain incomplete. |

## Subsequent rendered evidence — separate from technical scores

The owner executed the temporary Brave/Playwright capture script; all 12 authentic full-page images and its manifest were reviewed. Aesthetics/composition scores are DeepSeek 7/8, GLM 6/8 and MiMo 4.5/8. The remaining 12 design points are not assigned. No partial visual score is added to the technical subtotal or normalized to 20. Original technical scores remain unchanged.

All three loaded maps and indicators without recorded page JavaScript exceptions. Popup identities were confirmed for MiMo and GLM; DeepSeek's row-to-popup correspondence remains partial. Sector/severity controls were applied, but full filtering consistency was not established. Rules, tolerance changes, export validation and restoration were not tested. Mobile layout was inspected, without gesture or keyboard validation. See [browser findings](../results/reports/browser-functional-audit.md), [visual evidence](../results/reports/visual-comparison.md) and [professional conclusions](../results/reports/conclusions.md).
