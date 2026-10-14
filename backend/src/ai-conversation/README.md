# Internal Conversation lifecycle — Issue #78

This is the local implementation of PR #76 C01–C07 and LC01–LC16 released by
[LI's 12 October decision](../../../docs/decisions/2026-10-12-li-friend-search-and-internal-ai-approval.md).
The candidate's former proposal-only status remains in its original record;
the later decision explicitly releases this bounded internal slice. Independent
implementation review belongs to JIN and acceptance to LI.

Construct `ConversationApplication` with one shared `BoundedAiRuntime`, Sources,
MessageStore, Gates and DeliverySink. The only supplied collaborators are the
handwritten synthetic fakes under `backend/test/ai-conversation/`. Nothing is
wired into Bootstrap, public routes, Flutter, Firestore or a real model host.

## Commands and effects

- `createSend` creates an immutable, opaque, in-process command capability with
  trusted owner/session and explicit input. `dispatch` returns one cached,
  content-free observation. It contains no cancellation capability. Repeating a
  command observes the same outcome; a deliberate new Send remains distinct.
- Runtime admission reserves existing capacity and synchronously captures the
  original monotonic budget and immutable authoritative start view before queueing.
  Q17 selects only authorized, eligible Check-Ins in the inclusive seven-day UTC
  window, at most five, newest first with stable ID tie-breaking. Only the five
  approved fields reach the model; the four optional text/label fields remain
  omitted when absent. Q19 copies only the four Persona projection
  fields; a captured default remains default despite later activation.
- After queueing and fake input gates, a guarded user-message effect atomically
  records the saved message, effect proof and UTC retention anchor. A second
  synchronous guard at actual model dispatch prevents a late acknowledgment from
  starting generation after cancellation, expiry or revocation.
- Raw transport bytes pass the existing Q31 parser and fake candidate gates.
  The actual assistant effect rechecks authority and the original deadline, then
  records message, minimal presentation metadata and provenance atomically.
  The actual sink acceptance repeats those guards and ends the lifecycle once.
- `cancel(command, trustedCaller)` requires both original owner and session.
  Late cancellation of an old command cannot cancel another request. The original
  deadline wins at `now >= deadline`; successful sink acceptance stays terminal.
- `createRetry` requires fresh explicit input matching a live saved user, a
  terminal previous command, resolved effects and no accepted assistant. It
  captures fresh context and capacity/budget, without appending or restamping the
  original user message or recovering saved history as model input.
- Every started store call is marked unresolved before the Port can execute.
  A live, consistent acknowledgment resolves it; if it becomes terminal while
  pending, only authoritative readback can resolve it. A saved-user target guard
  prevents an older capability from bypassing a later unresolved retry attempt.
  Unknown acknowledgment terminates and fences the old operation. Explicit
  `reconcile` reads authoritative, content-free effect status only after that
  fence. A late unknown acknowledgment cannot undo a completed readback. No
  automatic retry, HTTP idempotency protocol or durable receipt is introduced.

## Cleanup and limits

Each terminal path clears processing input, context, candidate, watcher and old
command references once. Suspended callbacks access a revocable holder rather
than retaining content across awaits. Started generation remains quarantined
until actual transport settlement; abandoning an unused reserved lane releases it
immediately. Shutdown permanently fences outstanding and queued work.

Fake storage models Q14/Q19: only successful message writes advance the UTC
anchor; Conversation expiry/deletion removes its messages; used-source revocation
clears the entire assistant's content and provenance; Persona deletion does not
rewrite committed historical messages. The fake recipient's received messages
are a synthetic sink effect, not an Application replay cache.

The gates deliberately represent supplied synthetic authority, identity,
token-budget and semantic decisions. They do not implement or prove a tokenizer,
model identity, semantic safety classifier or real distributed transaction.
Physical schemas, public recovery semantics and production adapters require their
own approved scope. This slice changes no dependencies or public API.

## Selected real-effect policies — local and unwired

The [13 October F01 decision](../../../docs/decisions/2026-10-13-li-delegated-f01-b-c-d-selection.md)
selects the isolated real-adapter semantics separately from this strict fake Port.
Under the [local development instruction](../../../docs/decisions/2026-10-13-user-zhou-local-ai-development-scope.md),
`domain/real-effect-expiry.ts` evaluates full-precision retention mathematics and
`application/real-write-control.ts` tracks local terminal/durable-close observations
and checks the original guard after each fresh external Auth observation. Neither
is wired into the existing Application, Infrastructure, Bootstrap, HTTP or Flutter.
They hold no content, perform no I/O themselves and grant no write/read permission.

Missing existing lineage is unavailable, never an implicit first message; a late
copy cannot establish a retention anchor. An unknown barrier cannot mean rollback,
and a closed barrier still needs authoritative effect/readback proof. Callers must
dispose Application content immediately on local terminal and synchronously
recheck the original guard before actual SDK handoff. SDK retention/destruction,
wire dispatch, commit ordering and complete cleanup remain unproved here.
Their physical and producer mapping belongs to the
[remaining concentrated contract packet](../../../docs/planning/2026-10-13-zhou-real-ai-remaining-contract-packet.md).

## Selected F03 prepared reader — local and unwired

The [formal Remaining A selection](../../../docs/decisions/2026-10-13-li-remaining-isolated-ai-contract-a.md)
now selects that packet's sections 3–6 inside the synthetic Note-only boundary.
The earlier unselected observations remain historical. This local increment adds
`ports/real-context-reader.ts` and `application/real-context-reader.ts`; it does
not replace the existing synchronous fake Sources/effect Port.

`PreparedRealContextReader` receives the already accepted, trusted original
context, a read Port, the original monotonic clock and continuation guard.
`prepare()` returns a non-content status and reads authority before Persona or
Note content. All view envelopes must retain the same identity and exact
seconds/nanoseconds `asOf`. Selection keeps the inclusive seven-day bounds,
time DESC / opaque ID ASC, page25 and at most five eligible Notes. Only
`occurredAt`/`noteText` and the four Q19 Persona fields enter the model projection;
source IDs/versions and revocation generation remain separate request-only
dependencies. Complete legal Persona membership is required even for default.

`revalidate()` consumes a fresh current observation: withdrawal/regrant generation
increase, used-source invalidity or used-Persona deletion ends this request;
missing/corrupt/rollback evidence is unavailable. Persona edit/switch and allowed
visibility-only changes do not recapture or automatically revoke its snapshot.
The result is not a lease or proof of a future database commit/model dispatch.
Actual F01/F03 effect boundaries still need their own fresh checks.

`dispose()` synchronously clears reader-owned content, dependencies, original
context/clock/guard and pending completion. Already opened content-free handles
are closed immediately; a late opening handle is closed without reading content.
Close does not prove SDK settlement or supplier buffer destruction. Borrowed
projections must be released by the caller at its original terminal. The runtime
continues to own the unchanged 60/5/45 budgets and terminal AbortSignal; this
reader starts no new budget, timer, automatic retry or acceptance event.

No real implementation of this Port, datastore access or runtime wiring is
supplied here. The [producer prerequisite audit](../../../docs/evidence/sprint3/2026-10-13-zhou-reader-producer-prerequisites.md)
binds the reviewed LI producer and the remaining DU source facts. A real adapter
must prove the same-database fixed `readTime`, original Auth/session, complete
canonical time inventory, source identity/no-restore guarantees and current
authority checks. Unit fakes cannot prove those properties. R-A and reader local
evidence is [recorded separately](../../../docs/evidence/sprint3/2026-10-13-zhou-ra-reader-local-development.md).

Run `pnpm backend:verify` using the repository-pinned Node 24.19.0 and pnpm
11.19.0. Lifecycle tests are named with LC identifiers; runtime and parser
regressions remain under `backend/test/ai-runtime/`.
