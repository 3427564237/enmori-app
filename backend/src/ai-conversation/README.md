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

Run `pnpm backend:verify` using the repository-pinned Node 24.19.0 and pnpm
11.19.0. Lifecycle tests are named with LC identifiers; runtime and parser
regressions remain under `backend/test/ai-runtime/`.
