# ZHOU internal AI lifecycle — local delivery for Issue #78

**Historical checkpoint:** later review found an unresolved-Retry race and
incorrectly required Q17 optional fields despite the passing tests below.
See [the local fixes and expanded verification](2026-10-12-zhou-ai-lifecycle-review-fixes.md)
for the current source and corrected coverage. This original record and its
manifest remain preserved; their pass alone does not prove those two behaviors.

Recorded 12 October 2026, SGT (UTC+08:00). Owner: ZHOU. **Local implementation
and owner verification complete; no upload, independent JIN implementation
review or LI implementation acceptance has occurred.** This is not M26/M27,
whole-module, Sprint, UAT or Release completion.

## Authority and exact source

- Controlling decision: [S-PM-1012-LI-FRIEND-SEARCH-INTERNAL-AI-A](../../decisions/2026-10-12-li-friend-search-and-internal-ai-approval.md),
  published at [`06082d3afe7706440aaba82b57fc4a23acf4f67c`](https://github.com/3427564237/enmori-app/blob/06082d3afe7706440aaba82b57fc4a23acf4f67c/docs/decisions/2026-10-12-li-friend-search-and-internal-ai-approval.md).
  Full source retained locally in commit `aa0f991`; text was compared with the
  fetched source after normalizing line endings/trailing newline. The complete
  decision also records Friend search, which is outside this implementation.
- Exact approved candidate: [#76 `8f4f61d3e5c7fbc53d75209df5b9ce51f6f2a092`](https://github.com/3427564237/enmori-app/pull/76),
  based on #74 `f5adfb8d59601d7fb663d2e1884a6f74ca6a858e`.
  JIN's [candidate review 5482881656](https://github.com/3427564237/enmori-app/pull/76#pullrequestreview-5482881656)
  and LI's [document review 5485815060](https://github.com/3427564237/enmori-app/pull/76#pullrequestreview-5485815060)
  are retained as candidate evidence, not reviews of this new code.
- Implementation release: [LI's explicit decision on #76](https://github.com/3427564237/enmori-app/pull/76#issuecomment-6116042619),
  [#44 release](https://github.com/3427564237/enmori-app/issues/44#issuecomment-6116042875)
  and assigned [Issue #78](https://github.com/3427564237/enmori-app/issues/78).
  All C01–C07 and LC01–LC16 selected; local implementation/verification released.
  The old candidate's proposal status remains as historical context and is
  explicitly superseded only for this selected internal slice.
- Local repository: `D:/3851 AI/formal/enmori-app`.
- Local branch: `codex/zhou-ai-lifecycle-local-20261012`.
- Implementation head: `d408d2ef7147107583801255dad11261b8354941`.
- Implementation tree: `41750a533880dcc839c4fa4df95383ce6c0e23d4`.
- Published review branch retained at `8f4f61d`; seven historical untracked
  Persona evidence/decision files remain excluded from the new commits.
- [Source manifest](2026-10-12-zhou-ai-lifecycle-source-manifest.json) records
  141 tracked verification inputs with Git blobs/working-file SHA-256, raw-log
  hashes and the preserved seven untracked files.

## Delivered behavior

The existing runtime now supports an internal Application path under the same
capacity owner. It captures immutable authorized input at admission and retains
the original per-user slot/deadline until guarded sink acceptance or failure.
Generation settlement frees the generation lane independently; cancellation of
an active invocation quarantines it until actual transport settlement.

`backend/src/ai-conversation/` orchestrates actual fake user/assistant message
effects, separate model-dispatch and delivery guards, content-free duplicate
observations, explicit fresh Retry, original owner/session cancellation and
fenced uncertainty readback. Only message effects advance UTC retention anchors.
Processing holders and watchers clear once at terminal. There are no public
routes, physical storage schemas, production readers, real model adapters,
Flutter changes or new dependencies.

The model projection preserves Q17's UTC inclusive seven-day/max-five/current
message scope, Q19's Persona enum projection/default semantics, minimal
presentation metadata and Backend-only source provenance. Q14 message retention,
Conversation deletion/expiry and source-unavailable tombstones are represented
by handwritten synthetic stores. Q31 parser and 60/5/45 limits are preserved.

## Actual verification

Environment: Windows, Node **24.19.0**, pnpm **11.19.0**, TypeScript **7.0.2**;
existing pinned dependencies. No install or dependency/version change.

Final command: `pnpm backend:verify` (strict `tsc --project backend/tsconfig.json`,
then `node --test "backend/dist/test/**/*.test.js"`). It ran through the task-local
`D:/3851 AI/drafts/2026-10-12-zhou-ai-lifecycle/verify.ps1` runner, which places an
existing cached pnpm 11.19.0 wrapper first on PATH for the command and its child
scripts, then restores PATH. The wrapper and scripts remain in drafts.

**Result: PASS, exit 0; 465 tests passed, 0 failed, 0 cancelled, 0 skipped.**
This includes 366 pre-existing Backend cases, 21 new runtime cases and 78 new
Conversation lifecycle cases. Existing runtime/parser suite: 85 previous plus
21 new = 106 passing cases. A separate Application run passed 78/78 before the
final full Backend run. No real model, network service, emulator or device was
needed for the selected internal scope.

| Selected acceptance | Actual evidence in the new tests | Result |
| --- | --- | --- |
| LC01 admission | Shared component/Application FIFO capacity, duplicate-user/overflow rejection, dependency/identity/input denial before capture/effects | Pass |
| LC02 capture | Queued immutable Persona/Check-In/default view, missing-read denial, seven-day boundaries/max five/tie sort, whitelist and UTC normalization | Pass |
| LC03 current authority | Used Persona/source deletion, purpose revocation, Conversation deletion and expiry during queue/generation; unrelated deletion/edit remains eligible | Pass |
| LC04 time | Exact 5s/45s/60s boundaries, delayed preparation/effects, original budget, UTC correction independence; additional exact-boundary runtime cases | Pass |
| LC05 user write | One atomic saved-user/proof/anchor effect after pre-gates; cancellation/deadline/revocation after write but before dispatch never invokes generation | Pass |
| LC06 duplicates | Same capability has one cached content-free outcome; later deliberate identical-text Send is a new operation | Pass |
| LC07 Retry | Fresh capture/deadline with exact saved-user reuse; no append/restamp/history; changed input, foreign owner, deleted/expired target, accepted assistant and non-terminal previous command rejected | Pass |
| LC08 uncertainty | Unknown user non-effect/effect and assistant effect; terminal fence before authoritative readback; old callback cannot write; late unknown cannot undo resolved readback | Pass |
| LC09 cancel identity | Wrong owner/session/unknown capability denied; old A cannot cancel B; observation has no unguarded cancellation method | Pass |
| LC10 full lifetime | Held candidate checks, assistant commit and sink retain same-user ownership while allowing a different user's generation | Pass |
| LC11 terminal/commit | Cancel/timeout before actual assistant effect prevents it; cancel/timeout after commit retains the accepted message without delivery | Pass |
| LC12 delivery | Authority/deletion/expiry changes between commit and sink; source tombstone vs historical Persona behavior; sink refusal; success remains terminal despite late cancel/ack | Pass |
| LC13 termination | Active-generation abort clears input but quarantines until actual settlement; zero-invocation lane releases immediately; late preparation cannot write | Pass |
| LC14 output/gates | Actual raw-byte parser rejects duplicate keys/invalid JSON/URL; injected identity/token/ambiguous/unsafe/stale fake decisions fail closed; no fallback or automatic retry | Pass |
| LC15 disposal | Cleared holder/watcher/effect references and no raw generation Promise in fake call history after settlement; no content-bearing observation; shutdown does not resume queue | Pass |
| LC16 compatibility | Strict build and all 465 Backend tests; original component/runtime/parser cases; scoped source delta and unchanged public/infrastructure/dependency/Flutter paths | Pass |

Case names in `backend/test/ai-conversation/lifecycle.test.ts` carry LC labels;
`backend/test/ai-runtime/runtime-application.test.ts` tests scheduler behavior
independently. Fakes exercise orchestration, not real identity verification,
tokenization, semantic safety, distributed transactions or network delivery.
Disposal assertions inspect owned references and effect behavior; they do not
claim a VM heap-forensics or real-model process-memory audit.

## Failure and repair history

Raw records are preserved only under
`D:/3851 AI/drafts/2026-10-12-zhou-ai-lifecycle/`:

- Initial default pnpm attempt: startup blocked by ambient pnpm **11.25.0**
  against pinned **11.19.0**; no product tests ran. Existing cached pinned pnpm
  was used. The first nested `backend:verify` still resolved ambient pnpm;
  `backend-verify-01.log` retains this failure. Task-local PATH wrapper fixed
  child-command resolution; `backend-verify-02.log` contains the final pass.
- Initial in-progress compile checkpoints: missing runtime exports before that
  implementation was saved; one Application optional-return narrowing error;
  one readonly assignment in the new test. These were repaired without changing
  the approved contract. Records: `initial-checks.txt`, `runtime-build-01.log`,
  `application-build-01.log`. Later builds passed.
- Application checkpoint: `application-tests-01.log` **62/62**; after additional
  regressions, `application-tests-02.log` **78/78**. Runtime checkpoint:
  `runtime-tests-01.log` **106/106**. These are historical checkpoints; the final
  full-run source/result is the controlling local verification evidence.
- Internal cross-check found and closed three issues: malformed source fields or
  ambiguous timestamps entering a copied projection; late unknown acknowledgment
  re-marking resolved readback; and an observation exposing runtime cancellation
  without owner/session validation. Regression assertions and full verification
  cover the repairs. Internal agent review is not JIN's independent approval.
- Additional throwaway fixture probes initially encountered an incompatible
  TypeScript JS-loader API, and a stale malformed-input expectation after its
  repair. Corrected synthetic probes passed; these unpersisted probes are not
  counted in the 465-case evidence.

Real Firestore/producer/model/host/deployment, emulator integration and
Flutter/Android/UAT execution: **Not Run, excluded from this approved slice**.
No old Persona or joint-validation result was reused as approval for this code.

## Review handoff and remaining gates

The local repository, implementation commit, manifest and this evidence are ready
for an authorized exact-source handoff. Suggested review range:
`8f4f61d3e5c7fbc53d75209df5b9ce51f6f2a092..d408d2ef7147107583801255dad11261b8354941`.
It contains the retained authority record plus the selected internal implementation
and tests; the following evidence-only commit does not change executable source.

1. Obtain authorization for whichever source-sharing/upload path is used. No
   source was sent to JIN by this task, and no GitHub comment/PR/Issue state changed.
2. JIN reviews this actual implementation and evidence; resolve any findings
   within the approved scope. Prior candidate reviews do not satisfy this gate.
3. LI accepts the selected implementation after that review. Public API,
   production storage/producer, Flutter, real model/host and other AI choices
   remain outside this approval.

There is no declared review completion date or substitute for the expired
11 October target. The local-only development follow-up stops after this delivery;
it does not upload or expand the next implementation scope.
