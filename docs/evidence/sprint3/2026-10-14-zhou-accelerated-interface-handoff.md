# ZHOU accelerated AI interface handoff — 14 October 2026

Owner: ZHOU. New-delta independent reviewer: LI. Base: accepted #96
`67056c778a03595c386a69ec7ea33046fdd4205d`. This is the thin interface
publication requested by [S-PM-1014-LI-AI-ACCELERATION](../decisions/2026-10-14-li-ai-acceleration-and-target.md)
and [the parallel package](../planning/2026-10-14-li-ai-accelerated-delivery-plan.md).
It does not claim the storage adapter or complete journey has been implemented.

## Concrete boundaries

- [Async Conversation Port](../../../backend/src/ai-conversation/ports/async-conversation.ts)
  defines original verified identity/session/token-instance/request, operation,
  full-precision accepted read and original runtime budget. `open`, `submitUser`,
  `submitAssistant`, `confirmAssistant`, `close` and `reconcile` distinguish
  committed/rejected/unknown, settled and durable closed/unresolved observations.
  These are inner methods, not additional public HTTP operations or storage fields.
- JIN implements that asynchronous storage/control boundary in separate
  Infrastructure files. Content transactions must independently check actual
  epoch/fence/current owner/purpose/source/used-Persona/expiry and same-U claims.
  `confirmAssistant` clears only the original operation's confirmed claim in a
  separate no-content transaction; it cannot clear a later operation's claim.
- [Guarded generation adapter](../../../backend/src/ai-conversation/application/async-conversation-generation-transport.ts)
  awaits current dispatch authority, then immediately borrows the minimized
  projection for the existing generation Port. The one-use callable handle is
  Backend-local and must never be serialized as model input. The original runtime
  owns 60/5/45, capacity and actual-stop quarantine. No synchronous fake Port or
  existing runtime is changed.
- ZHOU supplies asynchronous Application orchestration, separate fixed/current
  reader Infrastructure and feature-owned mobile/HTTP adapters. LI supplies shared
  Home/router callbacks. Bootstrap/Transport/OpenAPI and complete cleanup remain
  JIN-owned; no competing writes to those files are included.

## First-source checkpoint and dependency-local gaps

The requested 18:00 reply was published on
[#83](https://github.com/3427564237/enmori-app/issues/83#issuecomment-6164036777).
The first coherent implementation/test packet targets 14 October 17:30 SGT;
21:00 is the first usable increment target and 15 October 23:59 remains the
confirmed delivery target. These targets do not constitute reviewer acceptance
or a promise that unprovided dependencies/all42 routes/Release are complete.

1. DU's source-bound canonical millisecond UTC/immutable owner-Note-time and
   permanent deletion/no-restore/no-ID-reuse guarantees are absent at this
   checkpoint. They hold dependent real Note queries/current-source reads and
   cleanup integration only. The read adapter defaults to unavailable before
   a Note query when those prerequisites have not been established.
2. JIN's actual storage/control/HTTP/cleanup contribution is not supplied at this
   checkpoint. New inner interfaces allow independent development; fake Port
   success cannot establish Firestore persistence or actual transaction ordering.
3. Actual controlled model/host digest/matching tokenizer/input measurement and
   semantic evidence remain unverified. Only the conditional real-model test
   waits for these facts. No model install/download or fallback is selected.
4. No Android device was attached and no cached Android Emulator executable was
   found at the configured SDK path. APK compilation and actual device execution
   will be reported separately; hardware/a11y/API24–25/UAT/Release remain Not Run.

## Observed interface validation

Pinned Node24.19.0/TypeScript7.0.2, interface-only strict no-emit compilation:

```powershell
node node_modules/typescript/bin/tsc --noEmit --target ES2024 --module NodeNext --moduleResolution NodeNext --strict --noUncheckedIndexedAccess --exactOptionalPropertyTypes --types node backend/src/ai-conversation/ports/async-conversation.ts backend/src/ai-conversation/application/async-conversation-generation-transport.ts
```

Exit0, [complete compiler output](2026-10-14-zhou-accelerated/interface-build.txt)
(empty output). This validates types only. Implementation suites/actual SDK
reader/persistence/model/device results are Not Run at this first interface
checkpoint. Later source-bound records retain this historical limit.

The five imported 14 October decision/plan documents preserve upstream #66
text. They are existing PM authority, not new choices made by ZHOU. The older
deadlines, formal decisions and accepted source/review trail are retained.
All PRs remain Draft/Open; no merge, task/Project transition or runtime enablement.
