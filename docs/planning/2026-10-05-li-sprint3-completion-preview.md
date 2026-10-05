# LI Sprint 3 completion and PM action preview — 2026-10-05

**Latest teammate/publication update:** the verified LI Profile/Settings packet has been [published to #50](../evidence/sprint3/2026-10-05-li-profile-settings-publication.md). ZHOU now has a JIN-approved exact-head preparation in #53; LI's [completed preparation acceptance assessment](../evidence/sprint3/2026-10-05-li-zhou-preparation-acceptance.md) supplies the next concrete external batch. This supersedes only the earlier no-artifact/review-Pending snapshot for #49. Its physical decisions and product gates remain Pending.

**Later PM disposition:** the [JIN/SHI preparation acceptance assessment](../evidence/sprint3/2026-10-05-li-pm-preparation-acceptance.md), [exact next Profile/Settings proposal](2026-10-05-li-profile-settings-contract-preview.md) and [publication/merge/closure package](2026-10-05-li-pm-action-package.md) follow this earlier snapshot. LI approved that exact contract and batch in [S-PM-1005-LI-PROFILE-SETTINGS](../decisions/2026-10-05-li-profile-settings-approval.md). The authorized preparation publication/merge/closure is complete in the [execution record](../evidence/sprint3/2026-10-05-li-pm-preparation-execution.md). New implementation remains subject to DU review and its own publication boundary; the historical preview below is retained.

Owner: LI HOURUI. This is a reviewable action preview, not a confirmed new product decision or external-write approval. Source hierarchy and existing scope remain governed by [AGENTS.md](../../AGENTS.md), [coverage](../decisions/2026-09-24-sprint3-figma-coverage-ownership.md), [practical delivery](../decisions/2026-09-30-sprint3-practical-delivery.md), and [own Profile approval](../decisions/2026-09-30-own-profile-first-slice-approval.md).

## Verified current state

GitHub and Project #1 were read on 5 October, Asia/Singapore. Main remains `432f5285966a6c2705473be21a2652ca2869520a`. The five assignments and Iteration 3 (28 September–11 October) remain unchanged. Reviews below apply only to the named commits and scopes; older Pending wording in the original PR descriptions is retained as historical wording, not current review state.

| Package | Current artifact and assigned review | LI action / remaining boundary |
|---|---|---|
| LI #45 | [PR #50](https://github.com/3427564237/enmori-app/pull/50), `acc6763b8b2cc53dc67b38a4a7c7a3fa7ff4ebf5`; DU approved this head on 4 October | First approved own-Profile increment exists. New Android owner evidence follows in the [execution record](../evidence/sprint3/2026-10-05-li-profile-android.md); the additional test/evidence diff needs DU disposition before acceptance |
| JIN #46 | [PR #52](https://github.com/3427564237/enmori-app/pull/52), `c31bb35057c0ad7596758cd43057c326b9fa47d7`; SHI approved this head on 4 October | Preparation acceptance candidate; physical Friend contracts, identity/lifecycle/block sources and authorized consumer projections remain Pending |
| SHI #47 | [PR #51](https://github.com/3427564237/enmori-app/pull/51), `742a14e81e41916cd469058e41ee4359952abfc1`; ZHOU approved this head on 1 October | Preparation acceptance candidate with explicitly recorded permission/credential/contract gaps; new Event integration is not Ready |
| DU #48 | No preparation artifact in Issue comments or current open PR inventory | LI independent review Not Run; no reviewable diff has been supplied in those inspected surfaces |
| ZHOU #49 | No preparation artifact in Issue comments or current open PR inventory | JIN independent review Not Run; no reviewable diff has been supplied in those inspected surfaces |

Project snapshot: #44 Backlog, #45 In Progress, #46–#49 Ready for their bounded preparation. No snapshot row is converted into a Done claim.

## LI preparation acceptance trace

| #45 acceptance item | Concrete evidence | Current disposition |
|---|---|---|
| Audit existing Auth/onboarding/interests/Home against approved sources | [Original LI checkpoint](../evidence/sprint3/2026-09-30-li-start.md), all 16 LI routes counted once | Prepared; retained gaps are explicit |
| Prepare DU packet for #43 at its exact diff/base | [Combined packet](../evidence/sprint3/2026-09-30-li-du-review-packet.md), #43 `27b899f` over #42 `479619e` | Prepared; #43 itself has no formal review. DU's #50 approval explicitly excludes its predecessor |
| Smallest Profile/Settings proposal including purpose, visibility, operations, errors and save/read evidence | [Approved first-slice preview](2026-09-30-li-own-profile-first-slice-preview.md), existing own Username/Interests, existing editor/revision behavior | Approved and implemented for the bounded first slice. Other Profile fields and Settings writes remain Pending |
| Collect first route/Home dependencies | Original checkpoint plus the concrete producer table below | Updated against JIN/SHI's actual artifacts; no absent producer input is invented |
| DU independent preparation review | Formal #50 review at `acc6763`; limited to the bounded own-Profile/navigation increment over #43 | Satisfied for that reviewed scope; predecessor review and the new test/evidence are distinct outstanding gates |

Preparation, implementation, reviewer disposition, merge and Sprint acceptance remain separate. The 16 LI routes and all 42 Sprint targets remain traceable; no still-unimplemented feature is silently removed.

## First producer handoff, updated from actual packets

| Consumer / destination | What LI can provide now | What remains required |
|---|---|---|
| Own Profile / Home | Existing owner Username and canonical saved Interest projection; current auth/onboarding gate; editor revision/save/reread; independent Home read on return | No additional producer required for this approved increment |
| JIN exact lookup/request | Existing immutable canonical Username vocabulary and internal Auth Binding are implementation inputs only | Q18's current DisplayName, authoritative ordinary-user lifecycle eligibility, either-direction blocking and any separately approved non-exposure source need concrete contracts. Do not substitute Username for DisplayName or completed onboarding for full eligibility |
| JIN recommendation/Activity | Q03/Q17 purpose and allowed-field boundaries | Candidate discoverability/Profile Privacy, other-user authorized Interest IDs, Activity consent/visibility and current lifecycle/relationship sources remain Pending. Own Interest APIs are not arbitrary-user readers |
| SHI Event → Home/router | Existing recommendation `eventId` and unchanged six-field record / existing response | Proposed Detail destination/read, acquisition/storage, occurrence identity, link policy and source status must be approved together. An external return cannot imply Going |
| DU Footprint/Calendar | Existing own Note create/read and Home Check-in entry | Need DU's first history/date route and purpose-authorized read proposal; no generic Activity/Calendar object |
| ZHOU Persona/AI | Existing optional-processing-consent vocabulary is available | Need ZHOU's actual operation/authority/wait/cancel contract; no assumed consent equivalence or global timeout change |

References: [JIN producer proposal at the reviewed head](https://github.com/3427564237/enmori-app/blob/c31bb35057c0ad7596758cd43057c326b9fa47d7/docs/planning/2026-10-02-s3-jin-friend-contract-proposal.md), [SHI Detail/consumer proposal at the reviewed head](https://github.com/3427564237/enmori-app/blob/742a14e81e41916cd469058e41ee4359952abfc1/docs/planning/2026-10-01-s3-event-detail-contract-proposal.md).

## Concrete action choices for LI

1. Publish the additional Profile Android test, isolated reproducer and evidence as a focused follow-up to #50; keep the same assigned reviewer DU. Record DU's existing exact-head approval accurately and make the changed test/evidence scope visible. Retain the stacked base until the predecessors are resolved; do not merge the chain implicitly.
2. Accept the reviewed #46 and #47 **preparation artifacts only**, preserving their explicit unresolved lists. If approved, reflect only preparation checklist/acceptance on those Issues. Product implementation remains Not Ready where its contract is Pending; no new product endpoint, schema, provider permission, or Done status is authorized by this option. Their publication/merge/status actions still need their specific authorization and relevant source/diff refresh.
3. Keep #45's overall completion open until the new DU disposition and predecessor/integration/merge/LI-acceptance gates are resolved. Do not label the full Account/Profile/Settings/Home module complete.

This preview does not choose a new Profile field or major data model. JIN's request is not yet a concrete physical contract: it expressly leaves endpoint, DTO, pair schema, action reference and protection values undecided. The next bounded design must specify these before requesting implementation approval. SHI E01–E07 likewise remain named decisions; current website `Concerts → interest_music` is an unapproved website-taxonomy candidate, not observed API taxonomy. Provider credentials/permission cannot be manufactured by a PM document.

No GitHub comments, member messages, approvals, merges, Issue checkboxes or Project statuses were written in preparing this preview. Five prototype-only behaviors remain Pending: `verify`, `forgot-password`, `going-people`, `checkin-edit`, `ai-safety`. Combined JIN gate, UAT and Release remain Not Run.
