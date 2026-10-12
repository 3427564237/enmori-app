# ZHOU local pre-upload self-check — 11 October 2026

Scope: the local owner-report and decision-input packet on `codex/zhou-local-handoff-20261011`, based on accepted #72 `0839c46b865bb6092020ad0ae77e17922ea40eb0`. This is a documentation and integration-boundary check. It does not authorize publication, merging or a new AI implementation. All generated files remain under `D:/3851 AI`, with formal records separate from draft scripts and logs.

## Acceptance is complete for the existing candidate

JIN's [#72 source review](https://github.com/3427564237/enmori-app/pull/72#pullrequestreview-5470543060), LI's [P08 component acceptance](https://github.com/3427564237/enmori-app/pull/72#pullrequestreview-5474994250), and LI's [#73 final combined gate approval](https://github.com/3427564237/enmori-app/pull/73#pullrequestreview-5479046298) are complete for their exact source/evidence. The [copied formal acceptance](../../decisions/2026-10-10-li-final-isolated-candidate-acceptance.md) matches the decision from #66 `aaf94e1e0518c227ebcefb67b92be3e86b75672d`. No repeat P08 approval or unchanged product-test execution is requested here. Approval does not itself merge these Draft PRs or enable ordinary runtime.

The corrected [next AI decision inputs](../../planning/2026-10-11-zhou-next-ai-decision-inputs.md) distinguish already-approved Qwen/Ollama, deadlines, Persona snapshot/deletion, retention and context-minimization rules from pending concrete integration contracts. Only decisions applicable to the selected next slice are prerequisites; M27 placement and live-host execution are independent follow-on boundaries.

## Local packet and pinned integration checks

| Check | Evidence and result | Limit |
| --- | --- | --- |
| Payload against accepted #72 | Exact allowlist: copied final acceptance, owner handoff, six-route JSON mapping, next AI decision inputs, and this self-check. No tracked product-code delta. | The packet is documentation; it does not deliver M26/M27. |
| Provenance and links | Existing offline validator checks six route mappings, original state relationships, 25 source/test references, exact acceptance blob, links and document structure. A packet-wide check also covers this report. | Local link existence is not a fresh external-source or fragment-anchor check. |
| Candidate-content screening | High-signal credential/private-key patterns and merge markers are checked only in the intended documentation payload; exact staged paths are checked. | A scoped screening result is not a guarantee about every file on the machine. |
| Pairwise Git merge simulation | Object-only `git merge-tree --write-tree --name-only` against the three pinned refs below. The checks do not modify the index or working tree. | A clean text merge cannot prove semantic compatibility, simultaneous integration of every branch, or future changes. |
| Product tests | No new Backend, Flutter or Android suite run: the tracked executable tree is unchanged from accepted #72. | Existing source-bound evidence remains historical evidence for that source, never a pass for future AI code. |
| Publication state | Local branch has no upstream; remote source heads and absence of a same-named remote branch are read back. No push, PR/comment, review request or merge performed. | Readback is a timestamped checkpoint, not a lock on subsequent remote changes. |

Pinned read-only comparison sources:

- `main`: `f46a903cb5b339365ac2024004b32b7b96b99e7c`.
- #66: `aaf94e1e0518c227ebcefb67b92be3e86b75672d`.
- #73: `c3e1f84bd305093ffe7f4d6d83b6df3d0289baa5` (evidence based on #72 `0839c46`).

The final post-commit machine results, exact local HEAD, file hashes and merge-result trees are recorded separately at `D:/3851 AI/formal/evidence/2026-10-11-zhou-preupload-receipt.json`. Draft scripts and raw check results are under `D:/3851 AI/drafts/2026-10-11-zhou-preupload-check`. The earlier `2026-10-11-zhou-local-handoff-receipt.json` is retained as historical evidence.

## Upload-base and worktree findings

The intended documentation delta is measured against #72 `0839c46`. Comparing this branch directly against current `main` also includes more than one hundred inherited feature files. If publication is later authorized, preserve the accepted #72 branch and use the separate owner-report branch with that exact reviewed base, or reassess the base after its authorized merge. Do not describe a main-based combined diff as a five-file report. This recommendation neither creates a PR nor authorizes publishing.

Seven older untracked evidence/decision files remain untouched and excluded from this packet. Two paths also occur in #66:

- `docs/decisions/2026-10-09-li-persona-p08-isolated-flow-approval.md`: local normalized and incoming blob both `bbdcdc085c0835aa5857beafa328b1d7ba92dc10`.
- `docs/evidence/sprint3/2026-10-09-persona-p08-implementation-release.md`: local normalized and incoming blob both `dd88a9e84702a5125ccca8531e7e47041b41e910`.

These are identical-content path overlaps, not divergent content. Object-only merge simulation does not examine untracked worktree files. Recheck and deliberately preserve/reconcile these paths before an actual checkout or merge; do not bulk-add, overwrite or delete them merely to make status clean. Their presence does not add them to this branch's committed upload payload.

## Concrete future integration risks

| Boundary and observed source | Conflict to prevent in the assigned AI slice | Required validation when that slice is implemented |
| --- | --- | --- |
| [Shared BackendApiClient](../../../lib/core/network/backend_api_client.dart), [providers](../../../lib/app/providers.dart) | Non-AI uses a 15-second foreground budget including token work; Q31 uses 60 seconds from Backend acceptance. Client `close()` closes the shared client; it is not request-scoped cancellation. | Exercise token, header/body delay and original-operation cancellation under the confirmed P04/P05 policy; retain existing non-AI tests. |
| [Persona session](../../../lib/features/personas/domain/persona_session.dart) and shared client | Persona-create late completion and page-exit semantics are operation-specific. An abandoned/timed-out AI operation must never persist or deliver a late assistant result. | Exercise cancellation, page exit, retry and late completion without accepting a result from an older operation. |
| [Auth repository](../../../lib/features/auth/data/firebase_auth_repository.dart), [Persona providers](../../../lib/features/personas/persona_providers.dart) | Bind work to the actual auth-session lifetime, not UID alone. Token refresh and a new same-UID login have different lifetimes. UI display revision is not Backend authorization or snapshot evidence. | Verify refresh, sign-out and fresh same-UID login; revalidate ownership/consent/deletion at the actual protected boundary. |
| [Bounded runtime](../../../backend/src/ai-runtime/application/bounded-ai-runtime.ts) | Runtime `prepare` starts only after entering the generation lane; capturing Active Persona there would miss request-start semantics. Runtime candidate completion releases its timer/slot; persisting in a later `outcome.then(...)` would fall outside that component's lifetime. | Verify request-start snapshot versus queue-time edit/switch, deletion before commit/delivery, and one approved deadline/user-slot lifetime through the full Application operation. |
| [Generation transport Port](../../../backend/src/ai-runtime/ports/generation-transport.ts) | Abort signalling alone is not proof that generation terminated. Candidate validation/admission is not proof that dependencies are ready or a failed model was stopped. | Assert actual terminal settlement, quarantine/readiness behavior and no persistence/delivery after abandonment or timeout, using fake transport until live execution is authorized. |
| [Router](../../../lib/app/router/app_router.dart), [isolated composition](../../../lib/app/router/isolated_persona_pages.dart) | Home/router integration remains LI-owned; ZHOU owns approved feature/session/Repository builders. The accepted isolated enablement does not authorize ordinary AI UI or a global router redesign. | Exercise the explicit selected composition and retain omission of isolated features from ordinary composition. |
| [Backend bootstrap](../../../backend/src/bootstrap/build-app.ts), [Android build](../../../android/app/build.gradle.kts), [device fixture](../../../tool/persona_android_fixture.mjs) | Synthetic Auth/Firestore, test-only routes, default-false flags, `.personatest` debug identity and local fixture transport do not authorize a real model host or production release. | Preserve guards and recheck environment/identity/cleanup boundaries for the actually assigned execution scope. |

No new serious conflict was identified in the unchanged accepted P08 implementation by this static review. Future AI safety depends on the concrete approved composition above and its actual tests. This self-check does not claim that unspecified future development is conflict-free or that live model, physical keyboard, iOS or global visual/accessibility gates were run.
