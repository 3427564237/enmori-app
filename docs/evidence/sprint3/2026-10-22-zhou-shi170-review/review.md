# ZHOU independent source-boundary review — SHI #170

22 October 2026, Asia/Shanghai. Conclusion: **changes required for one confirmed P2**.

## Reviewed source and authority

- PR: https://github.com/3427564237/enmori-app/pull/170
- Exact reviewed head: `b39ec5e19cc462fc0f588480044766b249fc6104`.
- Product: `fdbac3c60ac6259120f4e65a78e0d7a272a37e74`; tree `646e2916477ea55bdc14a5259104812017cff46a`.
- Base: `986d4f895252f266c1f6bf785b7f0c24ee03643e`, `souma/li-zhou-runtime-20261020`.
- Exactly seven changed files. Product→reviewed head adds only SHI's evidence document. This later ZHOU branch adds review evidence/probes only, not an author product correction.
- Authority: [SHI complete task](../../../handoff/2026-10-21-parallel-completion/shi-events.md), [parallel decision](../../../decisions/2026-10-21-li-parallel-completion.md), [EP1](../../../../api/event-participation-contract.md), [FA2](../../../../api/friend-activity-display-contract.md), existing EB2/Backend boundaries. The new FA2 supplement requires unavailable when current source/title disappears, while actual privacy/participation revocation remains omitted.

## P2: recheck source after the asynchronous participation read

`backend/src/bootstrap/social-event-source.ts:55` checks `ready(asOf)` before awaiting `tx.get` at56. While that read waits, disable, page-zero replacement, or replacement of the observed later-page slot can remove the source title. The participation row, timestamp and permission remain current. Lines59–60 then return `undefined` for the missing `peek`, which `FirestoreFriendActivity` treats as removed/revoked content and skips. Actual HTTP becomes `200 {"activities":[]}` rather than dependency-unavailable503.

The existing83 cases do not hold this particular display read across source invalidation. The new reviewer probes use the actual controlled gate/projection, source ID mapping, producer, in-memory transaction gateway and canonical participation identity. The HTTP probe additionally uses actual Friend Activity Repository, authority, Fastify registration and response schema. No real provider requests or user data are involved.

Reproduction:

1. Warm page0 and an explicitly observed page1. Save a currently permitted Interested row for the canonical page1 Event ID with actual selectedAt; obtain activity metadata.
2. Start display and hold its exact participation-document `get`, after the initial ready check.
3. Disable the gate, replace page0, or replace page1 so that the original ID is no longer observed. Do not revoke or change the participation row.
4. Release the read. Current implementation resolves `undefined`; real HTTP returns200 empty. It should fail unavailable.

Required correction is bounded to this producer: after the await, distinguish a still-authorized matching participation with missing current source from genuine participation/privacy removal. Revalidate current source and treat a missing `peek` as dependency-unavailable. Merely moving `ready` is insufficient for page1 replacement, where the generation can remain ready but the specific ID disappears. Keep true permission/participation revocation as omission. Add the held-read counterexamples without repeating unrelated suites.

## Actual checks, including failures

Node24.19.0 and locked pnpm11.19.0/TypeScript7.0.2. Reviewer frozen offline install reused cached packages and did not change lockfiles/dependencies. Strict compile passed; stdout was empty and no compile log file was generated.

- Independently executed SHI's ten affected Backend files: **83/83 Pass**,0 skipped/cancelled. These are the same cases as the author's83, not166 distinct cases. The verified breakdown is6+13+8+3+4+19+5+3+8+14.
- New direct-producer probe: **2 Pass / 3 Fail**, exit1. Unchanged canonical source/title returns the expected item; actual participation-visibility revocation is correctly omitted even after disable. Three held-read source-invalidation assertions fail because display resolves undefined instead of rejecting.
- Initial real-HTTP composition probe: **1 Pass / 4 Fail**, exit1. The three races actually return200 empty. The private-visibility control passes. Its normal positive control unexpectedly returns503 because of the separate inherited ID mismatch below. That positive control is not relabelled Pass; the direct-producer group establishes the clean positive boundary.
- Exploratory cache/raw-title equality probe: **1 Pass / 1 Fail**. The failing assertion required repeated same-page cache publication and in-flight raw Detail to always have identical titles within one initialized generation. That is stronger than the approved cross-generation guarantee and the raw path predates this PR; it is excluded from new findings. Its log/probe hashes are retained rather than claiming every exploratory assertion passed.
- Scoped source/contract/whitespace checks passed. No product fix was applied, and no Flutter, actual Emulator, provider, model, APK, host or device check was repeated.

The [receipt](verification.json) binds source blobs and exact probe/log SHA256. Raw logs remain local; a hash is not a claim that an author's or reviewer's private raw log was uploaded. The author83 log itself is not present here; its old SHA receipt retains author attribution. Reviewer logs are separate.

## Separate inherited integration compatibility issue

`sourceEventId` produces canonical `tm_event_<64 hex>` and EP1's `validEventId` accepts it. The unchanged `FirestoreFriendActivity` rejects every ID beginning `tm_`, and unchanged Friend Activity Transport schema uses `^(?!tm_)...`. Thus the real positive route returns503 even with a valid, currently observed canonical title. This is not a new #170 code finding: all four relevant source files have identical base/head blobs, listed in the receipt. It should be coordinated by LI/JIN against the approved canonical-ID contract, without inventing a substitute mapping or treating the current synthetic generic-ID fixtures as end-to-end acceptance.

## Reuse and disposition boundary

Inspected page bounds20×50/1000IDs, original five-minute anchor, exact cursor asOf, failed/repeated page publication, abort/disable/supersession, cloned immutable rows and first-page-only recommendation candidates. No additional introduced cache-generation blocker was confirmed. Existing stable/ordinary raw Detail code blocks and storage/DTO/dependencies/Flutter/root are unchanged; prior #167 approval is reused only for those unchanged scopes, not as approval of this new producer delta. No title archive, unvisited-page fetch, recommendation mapping or authority expansion was introduced.

SHI owns the producer correction and exact new head handoff. LI/JIN coordinate the inherited canonical-ID compatibility and LI retains final real-source/device composition. Keep Draft/Open; this review does not merge, deploy, release, close Issues/boards, self-approve an author change, or establish whole-project Done.

## Portable counterexamples

The three `.mjs` files beside this record are exact copies of the executed ignored-build probes. To reproduce in a checkout of the reviewed head, compile the existing Backend, copy the chosen probe to that checkout's `build/` (its relative imports intentionally target `../backend/dist`), then run:

```text
node --test --test-reporter=tap build/zhou_pr170_producer_race_probe.mjs
node --test --test-reporter=tap build/zhou_pr170_social_race_probe.mjs
```

Expect the failures recorded above on `b39ec5e`. The separate `zhou-page-detail-probe.test.mjs` is retained only as the explicitly excluded stronger exploratory assertion; it is not an extra requested product requirement.
