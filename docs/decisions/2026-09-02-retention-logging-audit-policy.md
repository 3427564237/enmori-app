# Retention, deletion, logging, and audit policy — 2026-09-02

- **Status:** Approved; Q-14 Resolved
- **Decision owner:** LI HOURUI, ENMORI PM
- **Source ID:** S-PM-0902-Q14
- **Scope:** AI processing copies, Conversation retention, Recommendation computation records, operational logs, Admin Recommendation Configuration history, and Account Action Request retention/audit
- **Builds on:** [S-PM-0831](2026-08-31-pm-requirements-decisions.md), [S-PM-0901-BACKEND](2026-09-01-backend-architecture.md), [S-PM-0901-Q17](2026-09-01-recommendation-ai-field-allowlists.md), [S-PM-0901-Q03](2026-09-01-deterministic-v1-recommendation-formulas.md), and [S-PM-0901-Q19](2026-09-01-persona-conversation-lifecycle.md)
- **Detailed specification:** [`docs/superpowers/specs/2026-09-02-retention-logging-audit-policy-design.md`](../superpowers/specs/2026-09-02-retention-logging-audit-policy-design.md)

## Governing retention boundary

Data and secondary copies are not retained by default without an approved purpose. A primary product entity persists only according to its separately approved lifecycle contract; processing a value does not itself authorize creation of another retained copy.

The Backend does not retain a separate raw prompt, Check-in presentation projection, Persona presentation projection, recommendation-explanation payload, or raw Qwen response. A validated and accepted model output may persist only as the assistant message governed by the Conversation lifecycle. Model input/output is not approved for training, fine-tuning, embedding creation, or manual review.

Source provenance has no independent retention purpose. It exists only while necessary to enforce the Q19-C source-revalidation contract for a retained assistant message and is minimized or removed when that purpose ends.

Server-authoritative time controls every retention boundary. Active deletion and fail-closed read behavior take precedence over asynchronous cleanup. No custom backup or legal-hold exception is approved by this decision.

## AI Conversation retention

Conversation user messages, accepted assistant messages, and the approved Q19 metadata remain available until the earlier of owner deletion or automatic expiry 90 days after the Conversation's dedicated Backend-authoritative `lastPersistedMessageAt`.

The retention anchor must not use a generic `updatedAt`. Only successful persistence of a user or accepted assistant message advances `lastPersistedMessageAt`; reads, title/metadata changes, failed generations, rejected/unsafe/stale results, and cleanup do not.

At the expiry instant, the Conversation becomes immediately inaccessible. Physical cleanup must complete within 24 hours. This 24-hour interval is an operational cleanup SLA, not a soft-delete period, grace period, recovery window, Trash, or Restore capability.

Transient model-processing data exists only for the request. An invalid, unsafe, failed, stale, or discarded output creates no assistant message and does not advance the retention anchor. Provenance cannot outlive its retained assistant message or Conversation. Once a source-invalidated assistant message becomes an unavailable tombstone, the tombstone contains neither content nor a deleted source record ID and may remain only until the containing Conversation expires or is deleted.

## Recommendation computation retention

Event Recommendation, Friend Recommendation, and Friends Activity are request-time deterministic computations. The Backend retains no Recommendation entity, candidate pool, per-candidate score, factor breakdown, or ordering history, and the client cannot upload an authoritative ordering.

A computation guarantees one complete deterministic total ordering only within that request and its captured `asOf`. Separate Home and See All requests are independent computations unless a separately approved snapshot/pagination contract provides continuity.

An explanation may persist only when it is incorporated into an accepted assistant message governed by the Conversation contract. Operational logging is restricted to the aggregate fields expressly approved below.

## Operational logging

The application-controlled operational-log allowlist is limited to:

- server timestamp;
- route template and HTTP method/status;
- latency;
- a trusted per-request correlation ID;
- stable application error category;
- dependency status and duration; and
- for Recommendation requests only, module type, formula version, eligible-candidate count, returned-result count, latency, status, and correlation ID.

No operational log may contain a UID, business-entity or per-candidate identifier, IP/device identifier, token, request/response body, query value, prompt, generated or user content, location, Persona projection, Firestore path, raw vendor error, production stack trace, per-candidate score/factor, or ordering.

The allowlist applies across all application-controlled request-adjacent logging layers, including the HTTPS edge and process supervision. Default logging that would emit a prohibited field must be disabled or constrained.

The canonical correlation ID is generated by a trusted server-side component for each request. It must not reuse a client-supplied identifier, idempotency key, user/session identifier, or business-entity ID and may correlate only that request's trusted processing chain.

Logs expire 30 days after their dedicated server `loggedAt`. They become immediately inaccessible at expiry and are physically cleaned within 24 hours; that interval is not a grace or recovery period. Raw access is limited to the minimum out-of-app Backend operator role. Flutter, Admin product UI, and Qwen have no raw-log access; there is no third-party log sharing. Reports use non-content aggregates, and detailed development debugging uses synthetic data rather than production identifiers or content.

## Admin Recommendation Configuration retention and audit

Admin Recommendation Configuration remains Should / Not Ready. A Draft uses a dedicated `lastContentChangedAt` and expires after 90 days without a content change. Read, preview, validation, status inspection, or other non-content access does not extend it. At expiry or deletion the Draft is immediately inaccessible and is physically cleaned within 24 hours. An unpublished Draft is not configuration history.

Published versions are immutable while effective. A superseded published version is retained until the later of:

- 365 days after its replacement or deactivation; or
- the retention end of the last approved historical record that requires that version.

The end of a reference does not restart a new 365-day period. Deleting a configuration container cannot remove a published version still required by these rules.

Audit events cover create, update, delete, expiry, publish, replacement, deactivation, and cleanup. The audit allowlist is configuration/version ID, actor type, verified Admin UID only when applicable, server time, before/after revision identifiers, result or stable error category, and correlation ID; it excludes configuration bodies and ordinary-user data.

Audit actors distinguish `admin` from `system`. A verified Admin UID is recorded only for an authenticated Admin action. Automated expiry, cleanup, and other Backend-generated events use a system actor and must not fabricate an Admin identity. Audit records expire 365 days after the event, become immediately inaccessible, and are physically cleaned within 24 hours.

## Account Action Request retention and audit

This decision does not approve an Account Action Request action value, approval/execution workflow, or account-state mutation. The `requested-action enum` is only an approved retained field type for a later controlled vocabulary; it does not authorize `Disable`, `Suspend`, `Delete`, `Restore`, or any other value. Those semantics remain blocked by Q-27.

A Pending Account Action Request uses an immutable trusted-server `createdAt` and a precomputed UTC instant:

```text
expiresAt = createdAt + 90 × 24 hours
```

When trusted Backend time `now >= expiresAt`, the request's business state is immediately `Expired` and it cannot be processed. Read and processing paths enforce `expiresAt` fail closed regardless of scheduler delay; a delayed expiry job does not extend the lifetime. The canonical expiry time is `expiresAt`, not the cleanup job's execution time.

Before expiry, the approved retained field types are request ID, target Account ID, the not-yet-defined requested-action enum, restricted reason text, requesting verified Admin UID, `createdAt`, `expiresAt`, and `Pending` status. The request must not copy the target user's private product data. The reason is not sent to Qwen or ordinary logs and is immutable after creation.

Within 24 hours after canonical expiry, the Backend performs content minimization, not deletion of the whole Account Action Request. It removes the full free-text reason while retaining the minimal immutable audit record: request ID, target Account ID, requested-action typed field, requesting verified Admin UID, `createdAt`, `expiresAt`, `Expired` status, and system actor for expiry.

That minimized audit record is retained for 365 days from canonical `expiresAt`. At the end it becomes immediately inaccessible, and the entire Account Action Request record is physically cleaned within 24 hours. Both 24-hour intervals are operational SLAs, not grace, soft-delete, recovery, Trash, or Restore periods.

Until Q-27 separately defines permitted values, authority, transitions, and processing semantics, production Account Action Request behavior remains Blocked / Not Ready beyond creation of the already approved auditable Pending request boundary.

## Explicitly deferred

This decision does not approve:

- a legal-hold or custom-backup requirement;
- third-party production logging or analytics;
- a Recommendation snapshot/pagination continuity contract;
- Admin Recommendation factor registry, publish semantics beyond retention/audit, or production readiness;
- any Account Action Request action value, reviewer/approver/executor, state-transition workflow, notification, appeal, session effect, or account mutation;
- physical Firestore collection/field structure, cleanup scheduler/topology, DTO, endpoint, or stable error code; or
- Qwen runtime, timeout, structured-output, unsafe-output, and fallback behavior.

## Authority and change control

This is a current PM retention and audit decision. It is not a Sponsor/Supervisor decision, does not retroactively change COMP3851A evidence, and does not prove implementation or verification. Q-14 is resolved at the requirement-contract level. Q-27, Q-28, concrete API/schema, deployment cleanup mechanisms, access-control implementation, and verification remain separate gates; Q-31 is subsequently resolved at requirement-contract level by [S-PM-0902-Q31](2026-09-02-qwen-runtime-failure-contract.md).
