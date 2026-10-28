# Cloud durable quota: concrete integration proposal

Original status: proposed schema and persistence choice, not approved or deployed.

Subsequently LI approved implementation and offline testing in the
[cloud recovery decision](../decisions/2026-10-28-li-cloud-independent-request-recovery.md).
The proposal is retained below; no real database write or deployment follows.
The cloud recovery rule is already approved. LI now requests real Groq transport,
restart-safe state, complete limiting and Azure integration, keeping the Free
Plan. This document identifies the additional persistence choice explicitly.

## Existing state to retain

Conversation operation fences, canonical messages and runtime epochs already
live in Firestore. Continue their existing restart retirement/readback rules;
do not copy message text into an Azure file, replay generations, or delete an
unknown target. Reuse `ai_runtime_fence/current` as the authoritative epoch.

## One new operational document

Propose `ai_cloud_quota/current` in the existing Backend-only Firestore database.
No new database product, dependency, client permission or public DTO. Fields:

- `schemaVersion`: `cloud_quota_v1`.
- `provider`: `groq`; `model`: configured validated model ID.
- `scope`: a deployment-selected non-secret account/project binding, preventing
  accidental reuse of one ledger for a different provider account.
- `policy`: minute/day window durations and request/token ceilings plus the
  conservative tokens reserved per attempt; exact match required on recovery.
- `processEpoch`, `generation`: the existing confirmed runtime fence values.
- `lastObservedAtMs`: trusted UTC milliseconds, for rejecting clock rollback.
- `reservations`: bounded array of `{ minuteExpiresAtMs, dayExpiresAtMs, tokens }`.
- `blockedUntilMs`: conservative rate-limit cooldown, never auto-retry authority.

No user IDs, conversation IDs, prompts, message text, credentials or provider
response bodies are stored here. Keep reservations through their day window;
compact only confirmed expired accounting rows. Expiry does not mean physical
termination. Never refund an unknown request or replay it after restart.

Each recovery/reservation/cooldown transaction reads the current runtime fence
and quota document before writing, uses `maxAttempts: 1`, checks original
request liveness immediately before its write, and rejects stale epochs. A lost
transaction acknowledgment is unknown: close admission until fresh recovery,
without dispatching another request. Recovery cannot create an empty ledger or
reset quotas. Missing, corrupt, mismatched or clock-invalid state fails closed.
A live deployment needs a separately verified initial ledger; unknown prior
usage must be conservatively reserved, not replaced by zero. All app consumers
must share this account-level authority; other apps using the same Groq
organization can still exhaust provider quota and cause 429.

For the currently verified Free account, enforce both sliding windows:
60,000 ms / 30 requests / 8,000 tokens and 86,400,000 ms / 1,000 requests /
200,000 tokens. Reserve from the original overall deadline plus each window,
so asynchronous preparation/confirmation cannot age out a slot before dispatch.
The transport must bound input/output and reject unsupported configurations.
The byte-based estimate used by synthetic evaluation is not a proven tokenizer;
production token accounting remains an explicit validation obligation.

## Requested implementation boundary

Approve this single operational Firestore document and atomic transaction
adapter, minute/day limiting and offline/fake/emulator tests. This would not
create the document in the real database, change existing user records, adopt
a failed model, authorize more model calls, grant cloud IAM, or deploy a VM.
Actual Azure deployment and cloud-processing consent remain separate concrete
steps after model quality and integration evidence are available.
