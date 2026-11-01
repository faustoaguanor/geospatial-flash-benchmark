# Evaluation rubric and observed-scope results

Scores are reviewer judgments applied to the documented evidence, not pre-registered measurements. The owner requested removal of uncompleted visual criteria from scoring. The effective maximum is therefore **88 points: 80 technical + 8 visual**. No score is normalized to 100, no excluded criterion receives zero, and no points remain reserved for those criteria.

| Criterion | Maximum | DeepSeek | GLM | MiMo |
|---|---:|---:|---:|---:|
| Geospatial correctness | 30 | 23 | 17 | 22 |
| Functional quality and verification | 20 | 14 | 13 | 14 |
| Architecture and maintainability | 15 | 13 | 11 | 14 |
| Robustness and security | 10 | 6 | 5 | 4 |
| Documentation | 5 | 5 | 4 | 4 |
| Technical subtotal | 80 | 61 | 50 | 58 |
| Visual design: aesthetics and composition | 8 | 7 | 6 | 4.5 |
| **Evaluated-scope total** | **88** | **68** | **56** | **62.5** |

The technical scores are unchanged and retain their provisional character. All 171 original tests and three builds passed on GitHub Actions. Screenshot evidence covers initial loads, popups, filter controls and mobile layouts, but rules, tolerance changes, exports, restoration and complete accessibility were not tested in-browser. Those limitations remain documented; this score is not a production-readiness or comprehensive QA certification.

## Visual rubric used

| Criterion | Maximum | DeepSeek | GLM | MiMo |
|---|---:|---:|---:|---:|
| Aesthetics and visual identity | 4 | 3.5 | 3 | 2.5 |
| Hierarchy and composition | 4 | 3.5 | 3 | 2 |
| **Visual total** | **8** | **7** | **6** | **4.5** |

Cartographic design, full interaction quality and responsive/accessibility are excluded as scored criteria. Relevant observed issues, including GLM's mobile overflow and MiMo's long expanded rules panel, remain qualitative evidence in the visual report. The original prompt proposed a broader 100-point rubric; the current 88-point scope supersedes its uncompleted visual portion at the owner's direction.

## Interpretation

DeepSeek has the highest score within this evaluated scope (68/88), followed by MiMo (62.5/88) and GLM (56/88). This describes these three submissions and does not establish universal model superiority.

| Category | Finding and qualification |
|---|---|
| GIS | DeepSeek, provisional: contact classification and both-parcel indicators in shared cases; general polygon validity remains incomplete. |
| Architecture | MiMo, provisional: separated engine/UI/map responsibilities and deferred map loading. |
| Visual aesthetics and composition | DeepSeek: strongest reviewed hierarchy, map priority and consistent identity. |
| Mobile arrangement | DeepSeek has the strongest observed arrangement; complete tactile/keyboard usability is excluded from scoring. |
| Development speed | GLM, reported 5m 51s, not independently timed. |
| Economy | No complete-cost winner. MiMo has the lowest supplied partial visible amount and token total; accounting is incomplete. |

More model-authored tests earn no automatic credit. Different generated datasets prevent direct ranking by incidence counts. See [technical findings](../results/reports/technical-comparison.md), [visual evidence](../results/reports/visual-comparison.md), [browser matrix](../results/reports/browser-functional-audit.md) and [professional conclusions](../results/reports/conclusions.md).
