# Independent exact-head review ledger

25 October 2026. Reviewer: QA / Evaluation, thread
`01a171a5-81c3-7ba0-a07b-f57440ea5e6d`. Authority and baseline readback are in
[qa.md](qa.md); acceptance meanings and required layers are in
[qa-matrix.md](qa-matrix.md).

The observations below concern isolated candidates and existing App behavior.
They do not approve A/B/C, broader production data use, new contracts, cloud
spending, proactive delivery, release or UAT. Historical small-plan failures
remain Fail. No new model or cloud call was made by QA.

## Exact sources and execution provenance

| Artifact | Exact source independently reviewed | State at this checkpoint |
| --- | --- | --- |
| App presentation | `f514a325878d351ecfd5de314a516954db2161ad` | No blocking source finding; 16 targeted independent widget tests passed. |
| Context projection | `3a32f11c2a9f72bc70c44b4fe4e5b254a95d1f21` | 42 existing candidate tests passed; independent exclusion-through-history counterexample failed. Revised head pending. |
| Proactive pure policy/lifecycle | `6d3b590a75bdafb6130b7adb920cf90ace32b4cc` | No blocking source finding; 29 candidate tests passed independently. No durable store, scheduler or sender exists in this candidate. |
| Runtime evaluation harness | `f9a97652ee532cfe374120962b2c5dd66643dd62` | Reviewed; two corrections required before a real local evaluation. Revised harness/cloud-runner candidate pending. |
| Product decision text | `22e8bea4bf71fc2404d357b64a695985202a9633` | A/B/C remain choices; C recommendation is not approval. Interactive prototype independent review pending its exact commit. |

QA used one temporary review branch in its existing worktree. Review assembly
`4267548c36b2aa4e773405ebd310aac03dbdb98a` contains the initial QA commit plus
Runtime f9a976, Proactive 6d3b590 and Context 3a32f11. Those merges are not part of
QA's delivery branch. QA returned to `souma/ai-companion-qa-20261025` to commit
only owned evidence/tools; it authored no production fix.

Backend used the already-approved Node 24.19.0 / TypeScript 7.0.2 toolchain
recorded in `/home/miku/.local/state/enmori-ai-companion-20261025/toolchain.json`.
An existing node_modules tree was linked; no install, prune, package or lockfile
change occurred. Lockfile SHA-256:
`27fcc951d38f289233cf8105e429dc0b3430575933e0f96239f0a3cd04b26c69`.

## App: bounded existing-flow regression

Read the exact presentation diff and existing controller boundaries. Retained
outgoing text now stops saying Sending when there is no cancellable active
operation; its unknown persistence state is described without asserting a
failed write. Text/key preservation and recovery behavior remain in the existing
controller. System Back first closes the social conversation drawer. The body
and search context use the existing body typography with line height 1.5.

Integration granted a serialized Flutter slot. The App author held its clean
head while QA independently ran, under the global nonblocking flock:

```text
fvm flutter test --no-pub --reporter expanded
  test/features/ai_conversation/ai_chat_usability_test.dart
  test/features/ai_conversation/ai_conversation_page_test.dart
  --name 'retained outgoing text|system Back closes the conversation drawer|long reply scrolls|withdrawn AI authority clears|session replacement removes the composer draft|same-session auth rejection clears the draft|system Back leaves a running request|ordinary reads and outcome checks do not resend'
```

**16/16 passed, exit 0.** This includes the eight new usability cases plus eight
focused existing authority/session/Back/no-resend cases. The clean head and
tracked lib/test/pubspec files were checked before and after. The slot and author
freeze were then explicitly released.

Evidence file:
`/home/miku/.local/state/enmori-ai-companion-20261025/qa-review/app-f514a325/flutter.log`;
SHA-256 `e2c39a7b8d316382e59de9ed9e4ab56b19eed515a306a842a8ac39333f1a9dc9`.
The author's separate tests and Integration's later 40 router tests are not
added to this count. This supports only the exercised S-layer portions of
REC-01/02/03 and UX-01/02. Device fonts, actual keyboard, TalkBack, app restart,
service behavior and native acceptance remain separate.

## Context and Proactive: independent execution and counterexample

At the review assembly above, QA executed strict Backend compilation followed
by the built Context and Proactive tests:

```text
<pinned-node> <pinned-tsc> --project backend/tsconfig.json
<pinned-node> --test backend/dist/test/ai-context/context.test.js
  backend/dist/test/proactive/policy.test.js
```

Build exit 0; tests exit 0; **71/71 passed (Context 42, Proactive 29)**.
These are independent executions of candidate tests, not 71 product acceptance
rows. Logs and recorded exit codes are under
`/home/miku/.local/state/enmori-ai-companion-20261025/qa-review/context-proactive/`.
`tests.log` SHA-256 is
`f814e1cb59b6bd96dfe760bd13af3656b639cc359260cbcbddcc5f5ddd01d478`;
`exits.json` SHA-256 is
`af52b5ba2d486f96385403bf0b9ac91148737cca505656cb7d1f69915641cca2`.

| Finding | Exact observation and response | Status at reviewed head |
| --- | --- | --- |
| CTX-15, P1: inherited excluded source | With a selected Check-in X, selected history pair H requiring X, and X explicitly excluded, 3a32f11 returns `prepared`, claims X omitted, then includes X in dependencies and the inherited assistant text in the model projection. Sent author a minimal synthetic repro; no real data or provider used. | **Open / Fail** at 3a32f11; blocks this candidate's exclusion claim. |
| CTX-16 preflight: history data-use categories | New history contract carries actual required categories, rejects unknown metadata, denies revoked location even when Check-ins/history remain allowed, and rechecks the category at later checkpoints. | Correction present and candidate regression passed at 3a32f11. No real reader or backfill proved. |
| History order preflight | Newest two pairs use sequence; request-local historyTurn preserves pair/order with tied or reversed timestamps and mixed records. | Correction present and candidate regression passed at 3a32f11. |
| CTX-18 preflight: Persona exception | Known still-existing/authorized Persona edits retain the request-start snapshot; permanent deletion denies; malformed/unknown version cannot grant permission. | Correction present and candidate regression passed at 3a32f11. |
| Proactive stale-source preflight | A fresh authority envelope can no longer wrap a stale individual source observation. Historical record time remains distinct from fresh observation time. | Corrected before 48ac991 and verified at 6d3b590. |

The exclusion counterexample script and raw result are
`excluded-history-counterexample.mjs` and `excluded-history-counterexample.log`
in the same private evidence folder. Its safety assertion returned exit 1;
log SHA-256 `c2d6398a6ae994ebdefc3823dbdec6bf5cd83812850430f89ad9b399c678de7e`.
Passing the author's tests did not override this independent failing case.

Proactive review confirmed source/consent/scope checks on both phases, full
candidate binding in generation proof, cross-midnight/DST quiet handling,
rolling-cap accounting of attempted dispatch, no unknown-result replay, and
recovering reserved/prepared work as failed when unpublished output is transient.
The documented concurrent-empty-ledger example still needs an owner-atomic
transaction. No pure `allow` result is a durable reservation or dispatch permit.
Retention alternatives R-ANCHOR/R-SPLIT/R-EXTEND remain unchosen Q14 changes.

## Runtime: evaluation evidence protection

Read the f9a976 prompt/adapter/runner/test diff. The mock report contains all
32 synthetic rows and zero real provider calls; semantic reviews are explicitly
unreviewed. Its seven source hashes match the f9a976 committed bytes despite the
precommit manifest correctly recording its earlier dirty source state. The
original 16-case corpus hash remains unchanged. Mock schema successes cannot be
passed as real semantic outcomes.

Mock report:
`/home/miku/.local/state/enmori-ai-companion-20261025/runtime/mock-initial/report.json`;
SHA-256 `e6da3fac1c8348f17948c98c50dd4bd997a48dbdb0afaef6762188905f7d4b11`.
It records 31 response-observed envelopes and one deliberate unconfirmed case;
all 32 semantic verdicts remain unreviewed.

| Finding | Evidence | Required disposition |
| --- | --- | --- |
| QA P2: outside-repository guard | `relative(root, out).startsWith('..')` accepts an in-repository directory named `..raw/run`. QA reproduced the path calculation without creating the directory or writing raw evidence. | Segment-aware and canonical-path validation, including a symlink-ancestor case; new exact head and bounded tests. |
| Runtime self-found unknown envelope, independently source-confirmed | HTTP 200 with malformed/null JSON could be classified response-observed, letting the local runner move on without a terminal provider proof. Missing Gemini finish reason is also unconfirmed. | Preserve raw unknown result, stop the local lane, nonzero ineligible outcome; new exact head and tests before real local24. |

Integration was told to hold the real local24 run until both corrections are
reviewed. The proposed Gemini runner additionally needs its new source review;
no cloud execution is authorized by this evidence. QA independently checked the
[official model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash),
[Standard pricing](https://ai.google.dev/gemini-api/docs/pricing), and
[terms](https://ai.google.dev/gemini-api/terms) on 25 October. The documented
Gemini 3.8 Flash candidate and current USD 0.75 input / 3.75 output per million
tokens agree with those pages; output includes thinking tokens. Paid-service
data handling requires an active billing project and is not zero retention.
Audience/region eligibility and actual project billing/credentials remain
unverified; no new age collection or provider choice was approved by QA.

## Remaining acceptance work

Recheck the revised Context/Runtime commits; independently inspect the final
Product prototype; review every raw output only if Integration schedules an
authorized bounded model run. New Context/Proactive production integration,
durable cancellation/restart, real source navigation, notifications, provider
spending, current data snapshots, APK and LI/SHI phone tests remain **Not Run**.
The comparator's 12 unit tests do not establish any actual preservation result.

Later exact-head repair and prototype results are recorded in
[qa-review-followup.md](qa-review-followup.md). This earlier checkpoint remains
intact so its failures and pending states are not rewritten as original passes.
