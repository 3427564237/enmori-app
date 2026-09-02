# COMP3851B Week 9 Android product UAT platform amendment — R2

- **Status:** Approved by LI HOURUI on 2026-09-03; every case and platform instance remains `Not Run`
- **Baseline ID:** UAT-B-0902-R2
- **Approval authority:** [S-PM-0903-UAT02](../decisions/2026-09-03-uat-r2-platform-amendment.md)
- **Semantic/case base:** [UAT-B-0902-R1](2026-09-02-comp3851b-uat-baseline.md)
- **Platform-timing authority:** [S-PM-0902-IOS01](../decisions/2026-09-02-ios-product-delivery-deferral.md)
- **Release/refinement authority:** [S-PM-0901-SCOPE](../decisions/2026-09-01-comp3851b-mvp-scope-priorities.md), [S-PM-0902-BR01](../decisions/2026-09-02-backlog-refinement-priority.md)
- **Execution status:** Every R1 case and every R2 platform instance remains `Not Run`

## 1. Amendment purpose and boundary

R2 changes only the platform/timing projection of R1. It does not change R1's user types, Given/When/Then semantics, authorities, fixtures, controlled-host rules, evidence fields, result vocabulary, privacy boundaries, stop conditions, Q18 Release gate, CORE-16 authority gate, or readiness disclaimer.

R1 remains the immutable accepted semantic/case trail. S-PM-0903-UAT02 approves this exact R2 platform mapping and aggregation contract. Approval does not itself execute any case or support a Week 9 Android UAT Pass claim.

For Week 9:

- Android product case instances are the mandatory user-visible platform instances unless the base case is separately gated below;
- controlled-host `Shared` evidence remains mandatory where R1 requires it;
- iOS product case instances remain `Not Run` with the gate `Deferred until after Week 9`;
- Android evidence never counts as iOS evidence; and
- Week 9 acceptance, if later evidenced, is Android product acceptance only and is not final dual-platform Release acceptance.

## 2. Platform-instance notation

| R1 classification | R2 Week 9 interpretation | Deferred iOS relationship |
|---|---|---|
| `Both` | Create an `.A` Android instance using the same case semantics. It is mandatory unless the base case is gated. | The corresponding `.I` instance remains `Not Run — Deferred until after Week 9`. |
| `Shared + surface` | Shared controlled-host evidence plus the `.A` Android surface instance are both required for the base case to Pass. | The `.I` surface instance remains `Not Run — Deferred until after Week 9`; Shared evidence does not substitute for it. |
| `Shared` | Run once against the approved controlled environment if the base case is mandatory. | No platform substitution is implied; later iOS product work may reuse valid Shared evidence only if its authority, build, environment, fixture and freshness remain applicable. |
| Gated | Preserve the existing non-mandatory gate. | Platform deferral does not resolve or promote the case. |

`.A` and `.I` are evidence-instance suffixes, not new requirement IDs. Defects and traceability continue to reference the R1 base ID plus the recorded platform instance.

## 3. Exact 52-case Week 9 mapping

| Classification | Exact R1 base IDs | Base-case count | Week 9 Pass rule |
|---|---|---:|---|
| Mandatory Android instance | `ENV-01`, `ENV-05`; `CORE-01–07`, `CORE-10–15`; `REC-01–07`; `AI-01–04`, `AI-06`, `AI-12`; `X-02`, `X-04` | 30 | The `.A` instance must Pass. The `.I` instance remains deferred `Not Run`. |
| Mandatory Shared + Android surface | `ENV-02`, `ENV-04`; `CORE-08–09`; `REC-08`; `AI-05`, `AI-07–11`; `X-01`, `X-06` | 13 | Required Shared evidence and the `.A` surface instance must both Pass. The `.I` surface instance remains deferred `Not Run`. |
| Mandatory Shared | `ENV-03`, `X-03` | 2 | The base Shared case must Pass once in the approved controlled environment. |
| Deferred dual-platform comparison | `X-05` | 1 | Not mandatory for Week 9 and remains `Not Run`. It becomes applicable only when later Android/iOS equivalence can be assessed under an approved dual-platform plan. |
| Existing authority/Release gated | `CORE-16`; `FRIEND-01–05` | 6 | Remains non-mandatory and `Not Run` unless its existing authority or Release-scope gate is separately resolved. iOS product instances are additionally deferred. |
| **Total** | All R1 base IDs exactly once | **52** | **45 mandatory Week 9 base cases; 7 non-mandatory/deferred base cases.** |

## 4. Case-specific platform projections

The common instance rule above is sufficient except for these cases:

| Base ID | R2 projection |
|---|---|
| `ENV-01` | `ENV-01.A` verifies Android application ID `com.enmori.app` and Android build/install/launch evidence. The iOS bundle/build portion becomes `ENV-01.I` and remains deferred `Not Run`. |
| `ENV-05` | `ENV-05.A` requires a complete Android evidence record. `ENV-05.I` retains the same evidence schema and remains deferred `Not Run`. |
| `CORE-08`, `CORE-09` | Controlled-host Weather provider/request/validation/failure evidence plus independent Android surface evidence are mandatory. iOS attribution/fallback presentation remains deferred. |
| `X-05` | The original cross-platform-equivalence assertion cannot be partially passed from Android. The complete base case remains deferred `Not Run`; individual Android feature cases provide Week 9 product coverage. |
| `CORE-16` | The participant disclosure authority gate remains controlling. Android-only timing does not make its expected identity/count/Friends-versus-Others projection known. |
| `FRIEND-01–05` | The Q18 pack remains Release-scope gated/non-mandatory. Android-only timing does not promote it into the Week 9 mandatory backlog. |

## 5. Week 9 aggregation and evidence rule

A Week 9 UAT gate may be satisfied only when all 45 mandatory base cases have valid evidence under their R2 rule:

- all 30 mandatory `.A` cases Pass;
- all 13 mandatory Shared-plus-Android cases have both valid Shared evidence and a passing `.A` surface instance; and
- both mandatory Shared cases Pass.

Any mandatory case that is `Fail`, `Blocked` or `Not Run` prevents the Week 9 Android UAT gate from passing. A deferred `.I` instance, `X-05`, `CORE-16`, or Q18 case does not fail the Week 9 gate solely because it remains `Not Run`; its non-mandatory/deferred gate must be recorded explicitly.

This aggregation does not imply Release acceptance. All other R1 stop conditions, readiness boundaries, reviewer/PM acceptance rules and implementation evidence requirements remain.

## 6. Later iOS and dual-platform relationship

R2 does not schedule, estimate, assign or approve later iOS product work. When iOS implementation is planned after Week 9:

1. the applicable `.I` instances begin from `Not Run`, never from inferred Android Pass;
2. Shared evidence is revalidated for authority, build/environment compatibility, fixture identity and freshness;
3. every applicable iOS instance requires its own device evidence;
4. `X-05` is executed only when Android and iOS results can be compared under the same approved product scope; and
5. final dual-platform Release acceptance requires a later approved plan and cannot be backdated to Week 9.

## 7. Approval boundary

S-PM-0903-UAT02 approves only this platform mapping and aggregation rule and resolves Q-32. It does not record a case Pass, make a PBI Ready, approve a Sprint assignment, schedule iOS work, close historical COMP3851A evidence questions, or authorize GitHub Projects/Notion writes.
