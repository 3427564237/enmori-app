# LI isolated Account producer and writer handoff

13 October 2026 SGT. Owner LI; new-code reviewer DU. Approved scope:
[S-PM-1013-LI-REMAINING-AI-A](../../decisions/2026-10-13-li-remaining-isolated-ai-contract-a.md),
P-LI-1/2/3/4 and the selected N02 Account generation inventory. Executable source
**c866eae8e266fcecb3ff035102d188a6c0a6c912**, over accepted #93 **110eda4**.
Only the new producer delta is submitted; unchanged #93 helpers need no repeat review.

## Delivered producer

Both existing Firestore Account repositories accept an optional **explicit
controlled Emulator environment**. Supplying it verifies the existing isolated
profile/demo-project/loopback/no-ambient-credentials guard before use. The
ordinary constructor remains the existing legacy behavior; bootstrap is unchanged.

Fresh isolated onboarding creates `purposeRevocationGeneration:0` in the same
transaction as its existing Account/binding/reservation/idempotency records.
It adds no wire field and performs no migration. Replay returns the original
projection and never resets an existing generation.

In isolated preferences writes, missing/bad/negative/fractional/overflowing
generation is unavailable, never an inferred zero. accepted→rejected advances
generation atomically with the existing Settings revision; regrant, repeated
accepted saves and visibility-only/Profile changes preserve it. Overflowing
withdrawal fails before a write. Stale revision returns its existing precondition
failure without an effect. A legacy writer encountering an opted-in Account
cannot change its consent and bypass this history; independent Profile/visibility
changes preserve all existing fields. No new API or error code.

The new pure policy is Account-owned; no Domain import of Firebase. Infrastructure
still uses the existing transaction gateway and failure/result mapping.

The selected Account generation index exclusion is declared in
`firestore.indexes.json` as the single new accounts/purposeRevocationGeneration
field override with no indexes. Existing History index declarations are retained.
This is a versioned declaration only, not index deployment or Emulator/cloud
index-enforcement evidence. It was added after the actual c866eae execution;
all seven executable/test/launcher inputs remain byte-identical. JSON shape and
preservation of the existing indexes were checked separately.

## Complete observed Account-parent writer inventory

| Observed writer or path | Handoff / guarantee in this source |
| --- | --- |
| `FirestoreOnboardingRepository.complete` | Only creates an absent fresh Account; selected isolated mode initializes generation0. Existing UID binding conflicts/missing bound Account fail safely; replay never rewrites. |
| `FirestoreAccountPreferencesRepository.saveSettings` | Selected mode reads current Account/generation, increments only on accepted→rejected and writes generation/consent/settingsRevision atomically. Plain mode rejects a consent change on an opted-in Account. |
| `FirestoreAccountPreferencesRepository.saveProfile` | Existing spread replacement retains generation, Settings, consent and unrelated fields; selected mode validates generation before write. |
| Interest, Persona, Friend, History and Event repositories | Source scan found Account-parent reads; their own writes target distinct feature paths. They do not replace the Account consent/generation. Generic gateway is infrastructure, not another product writer. |
| Existing ordinary `controlled-runtime.ts` | Still constructs ordinary repositories. It does not opt into this purpose or initialize generation. Later selected isolated composition must pass its validated environment to both Account constructors. No hidden ordinary wiring is delivered. |
| Synthetic setup/maintenance | Focused test creates through selected onboarding and deletes only its four new owned records after use. New fresh AI fixtures must explicitly initialize0; legacy missing must not be repaired by readers. No ordinary migration, Account restore/replacement/delete or unbounded maintenance authority is granted. Any future parent writer must preserve generation or perform the selected atomic withdrawal transition. |

This inventory covers the submitted production source, not arbitrary privileged
external database writes. An unreviewed maintenance writer or restored/reused
Account is not a supported producer guarantee. AI must fail closed when current
binding/completed Account/purpose/generation cannot be proved.

P-LI-1 reuses trusted verifier→UID binding→completed Account and the original
token/session boundary; client owner fields do not confer access. P-LI-2's
`checkin_conversation` purpose mapping is the explicit new selected synthetic
scope, independently from visibility. Existing consent copy is not promoted as
ordinary-user AI enablement. P-LI-3 supplies the actual writer delta above.
P-LI-4 requires the new AI reader/effect transaction to read these same authority
documents in its common conflict boundary; sequential HTTP checks are not an
atomic permission proof. ZHOU owns that reader/store implementation and tests.

## Actual validation

- Existing Node24.19.0/TypeScript7.0.2 and locked dependency cache: strict compile
  Pass; full Backend **550/550 Pass**, exit0, no failed/cancelled/skipped/todo.
  Eight new producer cases are included, not additive to550. No install/version
  or lock change. Temporary node_modules symlink removed without deleting target.
- Guarded actual Auth/Firestore Emulator **3/3 Pass**, test/CLI/outer exit0.
  Actual Auth token verification and onboarding initialization; concurrent same-
  revision withdrawals yield one saved/one precondition failure and generation1;
  regrant/Profile/stale save/replay preserve history. SDK conflict schedule is
  observed here, not a universal retry-count promise.
- Named synthetic test owns one new Auth identity and exactly four onboarding
  records, checks initial absence, deletes only those paths and identity, and
  verifies their absence. No global dataset reset, pre-existing record deletion
  or real/cloud data. SDK termination, nested/outer profile cleanup and all
  four ports8080/9099/4400/4500 free on launcher shutdown passed.
- Launcher verifies existing FirebaseTools15.29.0/Admin14.3.0/Firestore8.7.1,
  cached checksum-verified Emulator1.22.0 and locked Node before starting.
  Stable report only; token/password/vendor raw output are not published.
- Exact diff whitespace Pass; committed source bindings in
  [the manifest](2026-10-13-li-isolated-ai-account-producer-source.json).

Reproduce with the existing locked dependencies and Node:
`node node_modules/typescript/bin/tsc --project backend/tsconfig.json`,
`node --test 'backend/dist/test/**/*.test.js'`, and
`node backend/scripts/run-isolated-ai-account-producer.mjs`.
The launcher requires unused ports, cached verified JAR and no ambient credentials.
It creates/removes isolated profiles; do not remove an occupied service or supply
credentials to force it to pass.

Full-suite log SHA256
`6368c1bf64ffcf2331b1d77900d9ae03e378c092e04133169e0a9054c2c76b18`;
sanitized actual Emulator receipt
`833afd2932da3b60df86e02ec3ef437d6ae5211189a30f37ed356601aac335ed`.
Raw local receipts remain under `/tmp/enmori-li-20261013/`. Earlier549 was before
the additional legacy-writer negative case;550 is the final source result.

## Remaining localized boundaries

This producer is **owner-delivered, awaiting DU independent review**, not LI
self-accepted. ZHOU can prepare its reader concurrently and integrate this
producer after review/acceptance, without another unchanged business decision.
DU's immutable Note/time/delete/non-reuse handoff remains its own prerequisite;
no own-History read is treated as AI source permission or proof of never-reused IDs.

No actual AI source reader/store, model, runtime fence, cleanup runner, new index
deployment, Flutter/device, ordinary/runtime or complete source-retention guarantee
is delivered here. Those new-source tests remain Not Run. #93 and #92 observations
are not relabeled onto this source. Keep Draft/Open, no merge/task closure/board
change, replacement deadline, whole M26/Sprint/UAT/Release completion.
