# ZHOU accelerated AI implementation delivery — 14 October 2026

Owner ZHOU; mandatory independent reviewer for this new delta **LI**.
Base: accepted #96 `67056c778a03595c386a69ec7ea33046fdd4205d`.
First thin interface publication: `ddd991f82458da949bd29daa43134833e8e5b2a9`.
Tested executable publication: **`3a8beaf320ddde617a37289ffda241bc858aebe2`**,
tree `b473c51dfe9aa2697bd60b37e86eae1e5b03a032`.
Later README/evidence changes do not change executable inputs.

Authority: [14 October release](../../decisions/2026-10-14-li-ai-acceleration-and-target.md),
[parallel package](../../planning/2026-10-14-li-ai-accelerated-delivery-plan.md),
[conditional real-model selection](../../decisions/2026-10-14-li-controlled-qwen-and-synthetic-event-selection.md),
selected N01/F01/N02/F03/R-A/C-A and unchanged Q14/Q17/Q19/Q31.
The seven copied current decision/plan files retain exact upstream #66 blobs;
[publication manifest](2026-10-14-zhou-accelerated/publication-manifest.json)
records those imports, all308 unchanged verification inputs, Git blobs,
working-byte log hashes and the APK hash. This is owner validation and local
technical cross-checking, **not LI independent acceptance**.

## Concrete usable source

1. `AsyncConversationApplication` composes the existing runtime through a separate
   asynchronous Port. Acceptance fixes original session/request, monotonic
   deadline and UTC asOf together; queued requests immediately start fixed-view
   reading. User/assistant/claim observations are explicitly committed, rejected
   or unknown. Known user and assistant ACKs are operation-bound; a separate
   `confirmAssistant` settles only the original U claim. Local terminal disposes
   content before any asynchronous close/readback. Unknown and same-U other-pending
   cases remain protected; late ACKs do not reopen dispatch or delivery.
2. The one-use guarded generation adapter rechecks fresh current authority before
   immediately borrowing the minimized model projection. Callable handles never
   enter Qwen JSON. Actual-stop quarantine and original60/5/45 stay in the original
   runtime. The delivery callback requires fresh revalidation and one synchronous
   actual sink acceptance; missing validation or a late event cannot complete.
3. Separate `FirebaseAdminRealContextReader` and minimal preaccept authority
   Infrastructure use the locked SDK. The fixed read-only transaction checks exact
   returned readTime for documents, queries and rows; complete Persona membership;
   inclusive seven-day window; timeDESC/IDASC; raw page25 keysets and at most five
   legal Notes. Current checks distinguish valid, deleted, denied and unavailable;
   purpose-generation rollback is unavailable, not a deletion claim. Missing DU
   prerequisite capability prevents Note queries, even if the result would be
   empty. Trusted test-only facts describe the complete owned fixture inventory.
4. `HttpAiWireTransport` implements the selected six-operation client boundary
   with caller-owned HTTP client, root HTTPS address (explicit numeric-loopback
   constructor for isolated tests), disabled redirects, complete UTF-8 response,
   per-request abort and no automatic retry. The ordinary Repository provider
   remains unavailable. Optional Persona navigation uses the existing leave fence,
   in-flight/read/delete guards and approved draft-discard copy.
5. `lib/ai_persona_harness.dart` runs actual AI and Persona management/editor pages
   and controllers with labelled memory-only/scripted fixtures. CRUD/activation,
   protected detour and return are usable. Its banner explicitly says there is no
   real storage/model and no proof of AI Persona request snapshots.

The original synchronous fake Application/Ports/runtime, dependencies, shared
gateway, API/Bootstrap, indices and LI shared Home/router are unchanged. The
prepared reader Port has only an updated historical implementation comment.

## Actual verification and attribution

| Root check | Observed result | Actual transcript |
| --- | --- | --- |
| Pinned Node24.19.0 / TypeScript7.0.2 strict project compilation | Pass, exit0 | [build](2026-10-14-zhou-accelerated/backend-build-final.txt) |
| Full Backend default test invocation | **650/650**, fail/cancel/skip0, exit0 | [Backend](2026-10-14-zhou-accelerated/backend-tests-full.txt) |
| Full Flutter default concurrent invocation, pinned3.47.2 | **483/483**, exit0 | [Flutter](2026-10-14-zhou-accelerated/flutter-tests-full.txt) |
| Whole-project fatal-info analysis | Pass, no issues, exit0 | [analysis](2026-10-14-zhou-accelerated/flutter-analyze-full.txt) |
| Guarded full Auth/Firestore Emulator invocation | **77/77**, fail/cancel/skip0, exit0 | [Emulator](2026-10-14-zhou-accelerated/emulator-tests-first.txt) |
| New reader cases after cache-binding correction | **6/6**, exit0; overlap the77 | [cache recheck](2026-10-14-zhou-accelerated/emulator-reader-cache-recheck.txt) |
| Synthetic AI/Persona debug APK | Pass, compilation only | [APK build](2026-10-14-zhou-accelerated/android-harness-build.txt) |
| Non-writing Dart format for9 mobile inputs | Pass, zero changed | [format](2026-10-14-zhou-accelerated/mobile-format.txt) |

The26 new async and14 SDK-subset unit tests are **inside650**. Mobile owner175
is **inside483** and its [separate handoff](2026-10-14-zhou-accelerated/mobile-handoff.md)
retains its source/hash and failure attribution. Local agents inspected the new
boundaries without claiming formal LI review. Existing historical approvals and
test counts are not relabelled as this execution.

The six actual new SDK/Auth cases prove fixed asOf across acknowledged
Account/Persona/Note mutation, page25 then5; Prepared first-five projection;
edit/switch/visibility versus permanent source/Persona deletion; omitted
prerequisites/no Note query; unavailable future readTime without latest fallback;
and fresh Auth after actual synthetic-user disable. Each case removes its own
references and Auth identity, verifies absence and settles/terminates the SDK.
The credential profiles were removed and owned Emulators stopped; ports8080,
9099,4400,4500,9150 had no listeners in the subsequent check. These are reader
Port observations, not an AI message-store or HTTP persistence journey.

## Retained corrections and execution limits

- The first isolated verification helper checked the existing cached JAR but
  changed homedir with its credential profile without forwarding the cache path.
  The locked CLI therefore downloaded the same version1.22.0 JAR into that
  disposable profile. Full77 still passed; that download line is retained. The
  cause was traced to cache resolution, then the helper supplied the checked
  existing `FIREBASE_EMULATORS_PATH`. A new six-case run passed without a download
  line. [First invocation source](2026-10-14-zhou-accelerated/emulator-invocation-first.mjs),
  [corrected invocation](2026-10-14-zhou-accelerated/emulator-invocation-final.mjs)
  and [focused worker](2026-10-14-zhou-accelerated/emulator-worker-final.mjs)
  are exact copies of disposable `backend/dist/` invocation files; they are
  evidence specimens, not new product launchers. Run them from those original
  `backend/dist/` locations so their relative imports resolve. JIN's tracked
  launcher/composition files were not edited. No new dependency/model is selected.
- Earlier mobile harness3/4 and four enum diagnostics were tool-observed but raw
  outputs were not saved; the owner handoff reports their causes and final actual
  reruns without reconstructing logs. An early concurrent async compiler diagnostic
  arose from spreading `operation.kind` after the close-result discriminant;
  returning explicit bound IDs corrected it. Its original raw output was not
  retained; final strict compilation is the recorded observed result.
- Full new staged whitespace check reports three command-generated padding lines
  in the preserved Android/analysis transcripts (exit2). Source and documentation
  whitespace checks pass. Raw logs and their byte/hash attribution are retained;
  no all-file whitespace pass is claimed or evidence silently trimmed.
- The SDK-binding guard relies on the locked Firestore8.7.1 Infrastructure
  settings mapping. Unknown/new mapping fails closed and needs new evidence.
  Non-millisecond asOf cannot widen the canonical string query and fails closed.
  Actual controlled Note IDs are ASCII; broader future Unicode-ID ordering must
  be checked against the applicable producer handoff, not inferred from these
  fixtures. No arbitrary cloud index enforcement, cleanup SLA or Auth-at-commit
  atomicity is claimed.

## Required dependent work and review

| Gap | Owner / dependent impact | Status here |
| --- | --- | --- |
| Complete canonical-ms-UTC immutable Note inventory; permanent deletion/no restore/no source-ID reuse | DU; real Note reads/current-source and dependent cleanup | Blocked for this operational source; test-only fixture capability is not its replacement |
| Actual asynchronous store/control/settlement/restart/full cleanup and six HTTP operations/shared gateway/Bootstrap | JIN; complete persisted AI journey and shared combination | Not supplied; new thin interface is published, ZHOU code does not edit those files |
| Actual controlled host/model digest/matching tokenizer/full input measurement/semantic evidence | JIN preflight + ZHOU integration; conditional real-Qwen test only | Not Run; no model/provider call or install |
| LI independent new-delta review; new shared candidate/device gate | LI + assigned combination owners | Pending; no self-approval |
| Connected Android device/hardware Back/background/TalkBack/API24–25/UAT/Release | Applicable platform/gate owners | Not Run; no attached device or configured cached Android Emulator executable |

Latest source checks still show #84's #101 test correction as its most recent
reply and #82's 14 October Note handoff request without DU's completed guarantees.
The [18:00 reply](https://github.com/3427564237/enmori-app/issues/83#issuecomment-6164036777)
and [early interface publication](https://github.com/3427564237/enmori-app/issues/83#issuecomment-6164108147)
already exist. This coherent source/APK packet precedes the17:30 first-packet
target; it is the independently usable source/harness increment for review,
not a claim that JIN/DU dependencies or tonight's real persisted vertical passed.
The15October23:59 target and earlier missed deadlines remain unchanged.

APK:157,503,592bytes, SHA-256
`35310b470828804d07d183f69841f9dafad476c7dfd86220082aa18d78582a1b`.
It remains a local build artifact outside Git. Build command:

```powershell
fvm flutter build apk --debug --no-pub --target lib/ai_persona_harness.dart --android-project-arg=kotlin.incremental=false --android-project-arg=kotlin.compiler.execution.strategy=in-process
```

Keep the delivery Draft/Open; no merge, task/Project transition, ordinary/cloud/
index/provider/model enablement or whole-AI/Sprint/UAT/Release/Done claim.
