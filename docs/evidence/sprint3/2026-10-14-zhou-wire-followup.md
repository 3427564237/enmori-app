# Zhou N01 consumer and network follow-up, 14 October

This is the isolated follow-up to reviewed #103. LI's exact-source acceptance is
preserved in `docs/decisions/2026-10-14-li-reviewed-component-disposition.md`, copied
unchanged from #106 at `a0ceb620b465847feb04815f389b2c94d9d73cd5`.

## Source inputs and review boundary

- #103 `1af4d391546cbb456988da526f37109f86671638`: LI independently approved the
  unwired Application/reader/mobile component, review `5516236916`.
- #105 `784ed9a34f565083a3bc7d4fe2e70c960b117f90`: imported into this development
  checkout by a local Git merge. JIN owns these storage/HTTP/gateway changes;
  their new-source review and actual production composition remain separate.
- #106 `a0ceb620b465847feb04815f389b2c94d9d73cd5`: the AI page is copied unchanged
  to preserve LI's social renderer and guarded Persona callback. The shared
  Home/router/shell is not edited in this follow-up. DU reviews #106 separately.

The local source merge does not merge either GitHub PR, change main, close an
Issue, update Project state, enable a runtime, or approve the combination.

## First follow-up interface checkpoint

`ports/application-conversation-operations.ts` supplies a vendor-free consumer
boundary for selected N01. Ordinary reads, retry metadata, deletion, identifiers,
authority and execution are injected; absent suppliers fail unavailable. An
actual synchronous complete-body sink capability is required before execution.
Returning a pair for a later `reply.send` cannot stand in for F02 acceptance.

At this checkpoint `node --version` reported `v24.19.0` and
`node node_modules/typescript/bin/tsc --project backend/tsconfig.json` passed.
This is compile evidence only. Consumer implementation, network tests and a
joined Application/store/HTTP journey are not claimed by this checkpoint.

## Local gaps and handoff

JIN's concrete adapter must provide authoritative original-U metadata immediately
after definite User ACK and canonical U/A projection after Assistant settlement.
The lower store's void User ACK cannot be replaced by a made-up clock or sequence.
The route must accept the complete serialized pair inside the guarded completion
event, and avoid sending the accepted response a second time. These are the
specific producer seams handed off in #105 comments `6166193205` and `6166243370`.

DU's #44 comment `6165457742` establishes immutable Note/time within app/API
scope, but not permanent no-restore/no-ID-reuse or external/restore writer
guarantees. Dependent Note read/current/cleanup behavior remains unavailable;
independent approved empty-source, UI and storage work continues. A controlled
empty-source fixture is test evidence, not a declaration about ordinary data.

Real model-host, restart/unknown-write/cleanup, physical device and complete
service journey gates remain separately evidenced. No source registry,
incarnation, migration, dependency, infrastructure or deployment choice is added.

## Subsequent usable source and resolved seams

The first interface checkpoint was available in #107 at **18:31:17 SGT**. The
implemented consumer/mobile checkpoint `75d27278cde4b192171ad8c060106ac303965457`
was pushed before18:46 (commit time18:44:22+08:00). The earlier #105 handoff's
literal “published18:46” was corrected in comment `6166750572`; it was not an
exact publication timestamp. The earlier #103 source delivered16:49 remains
separately recorded in its original evidence.

The final executable checkpoint for this packet is
`788155808e021087ae0cea1e04441289434d2f5f`, tree
`438eb6989acbad06ab063af4efdc29360380b62e`, commit time **19:09:19 SGT**,
published before tonight21:00. Later evidence-only changes do not transfer this
verification to different executable inputs.

This checkpoint also imports JIN #105
`f887524075469f55db7d6a862804470158ce0d4e`. Its public `bridge.read(context)`
provides actual canonical settled U/A and stored presentation; its Transport
accepts the serialized complete body synchronously at the guarded sink event.
Both earlier supplier gaps are resolved for these source inputs. JIN remains
their author and SHI remains the assigned new-code reviewer. LI's independent
706/103 verification and bounded disposition apply to the earlier `d17432d`
join, not automatically to this subsequent source.

The unchanged later LI disposition and Linux-host/content direction are retained
in `docs/decisions/2026-10-14-li-pr106-and-ai-join-disposition.md` and
`docs/decisions/2026-10-14-li-real-runtime-deployment-and-content-direction.md`,
copied from `c87a4afec99241d1d0c878a28506ddd036876514`. The latter prospectively
permits LI's specified Linux model installation, while JIN owns its adapter.
It does not authorize a Windows model deployment here or erase prior Not Run
observations. DU has approved #106 at exact `a0ceb620`, review `5516453059`;
the shared UI/571/APK attribution remains LI's separate source.

## What the new Zhou implementation does

- `ApplicationConversationOperations` implements selected N01:15s preparation,
  original token/key control, body validation before single consumption, explicit
  Retry using authoritative original U text/sequence/nanoseconds, Cancel,
  current-owner normal reads, history and whole-delete supplier boundaries.
  Missing suppliers fail unavailable. Normal reads can use a fresh verified
  token; consumed operations never regenerate or replay a response.
- `AsyncConversationOperationExecutor` joins the unchanged reviewed Application
  to injected request-local Authority/Reader/Store/pair suppliers. All share one
  revocable original capability. `verifyRead` accepts the exact Application
  context object and original identity/budget, rather than obtaining a token
  from UID/global state. Complete response acceptance is inside F02's event.
  Runtime terminal synchronously clears both inner and outer input, verifier,
  context and sink holders; original digest/key clear after matching close
  settles, including an unknown result. No saved response lives in the registry.
- `FirebaseAdminConversationOperationAuthority` implements the minimal fresh
  ordinary owner/purpose resolution through actual isolated SDK reads. Unknown,
  disabled/replaced identity, corrupt account and abort fail closed.
- `acquireTargetLease(owner,cid,closed|idle)` gives JIN a vendor-free admission
  hook. Closed revokes matching tickets and pending prepares before awaiting;
  idle drains existing live commands without cancelling. Unknown barriers give
  no usable lease; locks remain content-free until an explicit new acquisition.
  A held lease blocks new target prepare/execute and uses guarded release.
  **This is registry/admission proof only.** JIN must additionally await all
  actual initialization/content I/O before cleanup work. It is not model-stop
  proof, production cleanup coordination or a retention SLA.
- The injected mobile network surface preserves LI's social renderer and guarded
  Persona callback. The executable Dart probe uses runtime stdin for a synthetic
  token, emits only non-content step/status observations, and exercises a new
  Conversation. It never automatically retries an uncertain execute. See the
  separately attributed [client evidence](2026-10-14-zhou-network-probe.md).

## Observed verification and input bindings

All results below are ZHOU owner verification; they are not LI/SHI acceptance.
Locked Node24.19.0, TypeScript7.0.2, Admin14.3.0, Firestore SDK8.7.1,
CLI15.29.0/cached JAR1.22.0 and Flutter3.47.2/Dart3.13.2 were reused.
No dependency, gateway, Transport, API, Bootstrap or launcher was edited by ZHOU.

| Actual command / source | Result and bounded scope |
| --- | --- |
| `node node_modules/typescript/bin/tsc --project backend/tsconfig.json`, `7881558` | Strict compile/exit0, before tests; `noEmitOnError` respected. |
| `node --test "backend/dist/test/**/*.test.js"`, `7881558` | **774/774**, exit0, fail/cancel/skip/todo0. Includes consumer35, executor20 and ordinary-authority8 new cases; these subsets overlap the total. |
| `FIREBASE_EMULATORS_PATH=C:/Users/ASUS/.cache/firebase/emulators` then `node tool/run_ai_store_emulators.mjs`, `7881558` | **119/119**, outer/worker exit0, fail/cancel/skip/todo0. Existing JIN launcher/cache/binding audit; both profiles removed and fixed ports freed. Includes four ordinary-authority and four upper/HTTP Zhou cases; these overlap119. |
| `fvm flutter test --no-pub`, `75d2727` | **537/537**, exit0, default concurrency. All Flutter/probe inputs are byte-normalized unchanged through `7881558` (`git diff --exit-code` over `lib`, `test`, pubspec/lock/analysis/FVM/probe inputs passed). This checkout is a different shared composition from LI's571 source; counts are not interchangeable. |
| `fvm flutter analyze --no-pub`, `75d2727` | No issues, exit0, same unchanged Flutter inputs. |
| New client suites/analysis/CLI peer | Eight new cases and related51/51 overlap537; the standalone handwritten peer remains client-only evidence in the linked record. |

The **actual additional HTTP case** spawned the pinned Dart CLI against numeric
loopback Fastify, using actual selected JIN routes, Firebase token verification,
Zhou consumer/executor/fixed-current SDK reader, JIN bridge and Firestore store.
Token went only through child stdin; CLI output was checked for absence of
token/key/business IDs/text. Prepare, execute, outcome, history and whole-delete
passed. Actual full-precision U/A metadata, canonical claim, original closure,
all issued store-I/O settlement, actual child/fence/parent deletion and socket
closure were checked. The production pair and HTTP sink were used directly.

Its Qwen/semantic/token gates remain explicit fakes and the fixture declares a
complete owned **empty** Note inventory. Ordinary history/readback supplies are
limited to one known canonical fixture pair; deletion combines the actual
registry lease and tracked store I/O for that fixture. This is not general
production paging, an operational producer declaration, a full production
coordinator, real model, Android device or a privacy/cleanup SLA.

The final run checked **376** tracked source/config inputs before the guarded
launcher and after completion, all matching immutable `7881558` Git blobs after
line-ending normalization. Both captures have aggregate normalized SHA256
`ccbcace56524379a04e714ba32bb5967c3fa0d076265f82c7a09e23e6ff4c042`.
Published [run manifest](2026-10-14-zhou-wire-followup/run-manifest.json), raw
Backend/Emulator/Flutter logs and both input captures retain source and command
attribution. No content/credential output was found by the stated log inspection;
this does not claim general-purpose secret detection.

Source/document whitespace checks pass with raw `.log` artifacts excluded. The
all-file check reports one retained trailing-padding line in the original
Flutter analyzer progress output; raw invocation bytes are not rewritten to
make that check green. This is not an all-file whitespace-pass claim.

The earlier `a296a63` **761/110** in-process/test-pair run is also retained with
its371-input captures. It preceded JIN's production pair/sink source and is not
relabelled as the subsequent actual HTTP case.

## Retained first failures and local remaining work

The linked mobile record retains the canonical-import, unauthenticated/scheduled
widget expectation and braces-analysis corrections. Inner development also
retains: a new coupled fixture's non-UUID owner was correctly rejected (64/65);
typed factory extraction caused TS2345 literal widening; a test assigned a
readonly factory (TS2540/contextual errors), after which a chained old15 test
run was stale and is not new evidence; and an SDK fixture referenced nonexistent
`runtime.state.active` (TS2339). All corrections were to test construction/types,
not relaxed business rules. Raw bytes for those intermediate agent invocations
were not preserved; these are attributed reports, not reconstructed logs.
Final strict compile, focused tests and the root full runs above actually passed.

| Remaining boundary | Owner / localized impact |
| --- | --- |
| Complete operational Note/time/deletion/nonreuse facts | DU. Holds dependent real Note capture/current/source transactions and cleanup; this fixture is no substitute. |
| General authoritative verify-target/Retry/history/readback suppliers and full production cleanup I/O coordinator | JIN-owned combination, using Zhou's published consumer/lease. Absent suppliers stay unavailable; this packet's one-pair fixture is not general completion. |
| New JIN code/source sweep/restart/normal fence retirement and whole-service evidence | JIN implementation; SHI independent code review; LI evidence/disposition. Root pass is not review substitution or full operational acceptance. |
| Controlled Linux9B/digest/tokenizer/Q31 and real content/provider prerequisites | LI host setup, JIN adapter, respective producers. No live model or real-user content was run here. |
| Shared installable candidate, physical device/API24/25/manual accessibility/UAT/Release | Respective assigned owners; Not Run by this packet. LI's existing571/APK result retains its own source. |

LI reviews #107's new source and composition. Draft/Open, main/Issues/Project
states remain unchanged; no whole module/Sprint/UAT/Release claim follows.
