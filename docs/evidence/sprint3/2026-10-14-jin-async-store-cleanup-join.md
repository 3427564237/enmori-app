# JIN async store and initial cleanup join — 14 October 2026

SHI reviews new JIN code/composition; LI reviews JIN evidence/disposition.
This is the next usable increment under the already selected acceleration plan.
Keep Draft/Open. No ordinary runtime, merge, Issue or Project transition.

## Source

- Product source **3ebb88a33dd2fb3d8348979ff5fa713a95470278**,
  tree **5b4f12b20def7657c5ef530f688e5286c7e95123**.
- Actual two-parent source join **010d69f172b57f0bb518ab923c97ac8ef0ba4f72**,
  tree **4690a163049c634b07459104bf5b3149a9078472** combines JIN #105
  `784ed9a34f565083a3bc7d4fe2e70c960b117f90` and LI-approved ZHOU #103
  `1af4d391546cbb456988da526f37109f86671638` (review5516236916).
- JIN then adds guarded deletion/expiry at `4d9a782a51d86c0cd42d5d0ce6c3d0cc49ebf4f6`
  and the concrete async-store bridge at the product source above. ZHOU's source
  is retained unchanged. No root checkout or PR base was changed.
- This publication's final commit adds evidence only. Later local full-sweep
  work is excluded from this immutable source.

## Implemented behavior

`AsyncFirestoreConversationStore` implements the actual #103 `AsyncConversationStore`
open/user/assistant/confirm/close/reconcile Port with real lower store transactions.
It maps definite ACK versus unknown honestly, translates immutable user metadata,
uses fresh original Auth/current callbacks and revocable content suppliers, and
checks accepted provenance against the captured dependency. Retry now checks the
expected original user ID/sequence/full-precision createTime inside its claim
transaction. Assistant commit also checks supplied original user identity. An
existing effect prevents reopening an operation after later normal guard retirement.

The new fixture joins actual Auth, actual Account preaccept, fixed/current SDK
reader, original 60/5/45 runtime, ZHOU Application, JIN bridge/store and guarded
sink. It uses an explicitly **empty, complete owned synthetic Note inventory**;
the declaration is fixture-only and is not DU operational authority. Qwen and
token/semantic gates are explicit test doubles. The resulting user/assistant,
sequence/pair, pending-claim removal and ordinary readback are independently
checked in Firestore. Terminal processing disposal and settled original close
are checked. This is a meaningful persistence join, not real-model evidence or
the complete public six-operation controller/phone journey.

`FirestoreConversationCleanup` implements selected owner whole deletion and
known-target expiry. It checks owner/epoch, marks the parent deleting, requires
the injected original-ticket/admission/I/O quiescence proof, closes every matching
fence, clears all three child collections in batches25, clears all target fences,
then verifies absence and deletes the parent last. Final cleanupGeneration
increment and active source-progress deletion are atomic. Unknown settlement
keeps the result unresolved and the parent inaccessible; it never returns a
successful deletion. No target is recreated by this cleanup.

Expiry uses the complete authoritative message/createTime/appendBefore inventory
and original 90-day cutoff, not an old cached parent clock. A legitimate newer
anchor prevents stale-cutoff deletion. The injected quiescence callback in these
fixtures is backed by explicitly awaited, known fixture I/O and actual closed
fences; production Transport still must supply its full ticket/I/O coordinator.
It is not a claim that cancelling a promise stops SDK work or model generation.

## Actual owner verification

Existing pinned Node24.19.0 / TypeScript7.0.2 / Admin14.3.0 / Firestore8.7.1 /
CLI15.29.0 / Emulator1.22.0; cached JAR verified. Same guarded synthetic project,
validated actual SDK loopback binding, two private profiles, no cloud fallback.

| Check | Result |
| --- | --- |
| Strict Backend compile at final source | Pass, exit0 |
| Full Backend regression at final source | **706/706**, fail/cancel/skip/todo0, exit0 |
| Full actual guarded Emulator at final source | **103/103**, fail/cancel/skip/todo0, outer exit0 |
| Earlier initial-cleanup source `4d9a782` | Backend706/706 and Emulator101/101; intermediate, not added to103 |
| Existing/current API, dependency and Flutter files after source merge | Unmodified by JIN cleanup/bridge commits |
| New JIN code delta whitespace | Pass |

Commands from the isolated source root:

```text
node node_modules/typescript/bin/tsc --project backend/tsconfig.json
node --test --test-reporter=spec 'backend/dist/test/**/*.test.js'
node tool/run_ai_store_emulators.mjs
```

The final Emulator suite includes previous relevant components, new owned
multi-page deletion, denied/unsettled/resumed deletion, current-anchor expiry,
immutable Retry rejection with valid control, and the actual async persistence
join. All fixture records/controls, temporary Auth user, owned SDK/app handles,
two profiles and required ports were cleaned. These groups overlap earlier
runs and are not additional distinct cases. They do not establish a production
90-day/24-hour SLA, underlying disk erasure, or independently reviewed code.

The previous 91/92 single-attempt race assertion failure and its correction
remain in the [HTTP supplement](2026-10-14-jin-ai-http-store-vertical.md). Older
loader, publication whitespace, #99 Flutter and device failures remain on their
original sources. No historical count is relabelled as this source's execution.

## Still incomplete

The six HTTP handlers/OpenAPI exist, but the complete preparation registry,
Application/sink/controller wiring, ordinary message-page implementation and
production quiescence coordination are still being joined. Full source sweeps,
restart/normal-fence retirement, startup/hourly runner and their real failure/
continuation evidence are next; they are **not** completed by fixture teardown.
Nonempty Note writes/current-source cleanup still require the missing operational
immutable-time/no-restore/nonreuse facts. D1-A actual host/model/tokenizer and
semantic preflight remains missing; it holds that real-model execution alone.

New Flutter, Android/phone, API24/25, accessibility, real Qwen, complete six-use-case
journey, full cleanup/SLA and final combined acceptance: **Not Run / pending**.
The included #103 Flutter changes retain their existing LI review and owner
attribution until applicable new combined validation. SHI review of JIN's actual
new code remains required; LI does not substitute for that review.

Target15October23:59SGT remains prospective. This source does not finish all AI,
42 routes/38 states, Sprint, UAT, Release or the other owners' work.
