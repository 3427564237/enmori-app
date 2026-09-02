# Qwen runtime and failure contract design

- **Status:** Approved PM design; Q31-A through Q31-E approved; Q-31 Resolved
- **Date:** 2026-09-02
- **Authority:** S-PM-0902-Q31
- **Implementation status:** Not implemented or verified

## Approved Q31-A boundary

| Concern | Approved contract |
|---|---|
| Release model | Qwen3.5-9B only |
| Runtime | Ollama on the controlled demonstration host, reached only through the Backend Qwen Adapter |
| Response transport | Complete, non-streaming response after Backend validation/fallback processing |
| 4B model | Explicit development/low-spec selection only; never automatic failover or substitute Release evidence |
| Selection authority | Trusted Backend deployment configuration only |
| Model capabilities | No application-level filesystem, network, database, shell, tools, or persistent memory |
| Ollama resources | Deployment-controlled resources required only to load and execute the approved model |
| Failure isolation | Ollama/model failure does not terminate Backend; AI readiness/availability may degrade independently |
| Identity evidence | Human-readable reference plus immutable resolved model/manifest digest actually loaded |

Qwen continues to receive only the purpose-specific fields approved by S-PM-0901-Q17 and S-PM-0901-Q19. Q31-A does not broaden those allowlists or authorize a retained processing copy under S-PM-0902-Q14.

## Approved Q31-B timing and capacity contract

One monotonic 60-second budget controls the complete accepted AI use case. The 5-second queue and 45-second generation values are nested ceilings within it and never restart the overall clock. UTC timestamps support evidence; monotonic elapsed time enforces the deadline.

| Resource | Acquisition | Release / terminal rule |
|---|---|---|
| Per-user slot | When the authenticated AI request becomes `accepted` | When the application request reaches a terminal state; underlying Ollama cleanup cannot retain or reopen it |
| Queue slot | On admission to the bounded queue | Exactly once on generation start, disconnect, expiry, cancellation, or shutdown discard |
| Active generation slot | When the Ollama invocation starts | Only when the underlying invocation is confirmed completed, failed, or cancelled |

The per-user limit is one non-terminal request. The host limit is one active generation plus two queued requests. A capacity rejection happens before acceptance and acquires no slot.

Application-terminal behavior is fail closed:

- client disconnect produces `abandoned`;
- reaching the unique deadline produces `timed_out`;
- neither state permits a later result to persist or be delivered; and
- already persisted user messages are not removed merely because the generation request disconnects.

If Ollama may still be executing after the application request becomes terminal, the active generation slot is quarantined and the AI dependency degrades until termination is confirmed or supervision restores it. Cleanup cannot extend the application request.

The full model-facing input is limited to 4096 loaded-model tokens, including every Backend instruction, schema/framing token, user field, approved business projection, Persona projection, and deterministic explanation reason submitted to Ollama. Over-limit input is rejected before generation; there is no silent truncation. The runtime context ceiling is 8192 tokens; output ceilings are 512 tokens for AI Conversation and 192 for recommendation explanation.

### Timing acceptance examples

```gherkin
Given an AI request was accepted at monotonic time M
When it spends 5 seconds queued and 45 seconds generating
Then validation and authority revalidation have at most 10 seconds remaining
And no stage can restart the 60-second budget
```

```gherkin
Given the wall clock moves forwards or backwards during an accepted request
When its deadline is enforced
Then the monotonic elapsed-time budget remains 60 seconds
And the request cannot be extended or reopened by the wall-clock change
```

```gherkin
Given a user's request is accepted
When it is queued or actively generating
Then that user retains the per-user slot
Until the application request becomes terminal
```

```gherkin
Given the client disconnects during active generation
When cancellation has not yet been confirmed by Ollama
Then the application request is terminally abandoned and its per-user slot is released
But the host generation slot remains quarantined
And no later result may be persisted or delivered
```

## Approved Q31-C output contract

AI Conversation and Recommendation explanation each accept exactly one versioned JSON object containing only `schemaVersion` and `message`. The applicable schema versions are `ai_assistant_message_v1` and `recommendation_explanation_v1`.

### Layer 1 — Raw parsing and deterministic runtime validation

Raw parsing must preserve enough information to reject duplicate object keys before constructing a normal object/map. It also rejects a non-object root, more than one root value, trailing non-whitespace tokens, invalid encoding, or incomplete JSON. No substring extraction, JSON repair, coercion, or partial acceptance is allowed.

After raw parsing, exact-schema, type, trim/non-empty, code-point length, prohibited-character/markup, and current-authority checks run within the original 60-second deadline. Conversation text is at most 2400 Unicode code points; Recommendation explanation is at most 800.

```gherkin
Given raw model output contains the property "message" twice
When raw JSON validation runs
Then the output is invalid before object materialization
Even if an ordinary JSON parser would otherwise keep one value
```

```gherkin
Given one valid JSON object is followed by another value or non-whitespace token
When raw JSON validation runs
Then the single-root guarantee fails
And no object is accepted
```

### Layer 2 — Semantic model-output policy

Semantic policy is a separate fail-closed acceptance layer covering purpose, privacy, unsupported action/system claims, prohibited health inference, deterministic-Recommendation contradiction, unsupported Recommendation facts, and disclosure of internal instructions or secrets.

A deterministic runtime pass proves only the conditions that layer checks. It does not prove unrestricted natural-language grounding. Project reports, tests, and Release evidence must not describe free-text grounding as completely algorithmically proven.

The implementation must document the concrete semantic policy checks and adversarial evaluation cases. Uncertain or violating output is rejected as a whole. Qwen cannot self-approve, and no second model validator is approved.

Rejected raw output is request-only data: it creates no message, advances no retention anchor, enters no raw log, and is discarded. Q31-D controls whether the use case retries or returns a fallback.

## Approved Q31-D failure matrix

There is no automatic model retry. A manual retry is a completely new request with newly captured authority, inputs, capacity, and deadline.

| Failure / terminal condition | AI Conversation | Recommendation explanation |
|---|---|---|
| Capacity rejection | Typed non-content failure; no assistant message | Backend deterministic presentation from safe explanation projection, if deliverable within the overall deadline |
| Dependency unavailable | Typed non-content failure; no assistant message | Same bounded deterministic presentation |
| Queue/generation internal sub-budget | Typed non-content failure while time remains | Same bounded deterministic presentation while time remains |
| Invalid/unsafe output | Reject whole output; typed non-content failure | Reject whole output; safe deterministic presentation while time remains |
| Overall 60-second deadline | Terminal; no later fallback or content | Terminal; no later fallback or content |
| Stale authority | Fail closed; no fallback | Fail closed; no fallback |
| Persona deletion in flight | Fail closed; no switch to default Persona | Fail closed; new request uses current state |
| Client abandonment/deletion cancellation | No response, fallback, or persistence | No response, fallback, or persistence |

Only queue/generation sub-budget failures permit fallback while the unique overall deadline has time remaining. Expiry of that overall deadline is terminal and cannot be followed by fallback processing or delivery.

Recommendation fallback is generated by Backend-owned deterministic presentation logic from the approved safe single-result explanation projection. Raw factor data, scores, private reason data, candidate pools, and rejected model text are not fallback inputs.

```gherkin
Given generation exceeds its 45-second sub-budget
And the overall request deadline has not expired
When the use case is Recommendation explanation
Then Backend may render the approved deterministic safe explanation projection
And the original overall deadline remains unchanged
```

```gherkin
Given the overall 60-second deadline has expired
When a model response or possible deterministic fallback becomes available later
Then neither is delivered or persisted
```

```gherkin
Given a user message was successfully persisted before an AI failure
When the failure state is returned
Then the failure does not advance lastPersistedMessageAt
But the already-persisted user message and its Q14-B retention effect remain
```

## Required evidence cases

```gherkin
Given the Week 9 Release build uses Qwen
When model identity evidence is captured
Then it includes the human-readable Qwen3.5-9B reference
And the immutable resolved model or manifest digest actually loaded by Ollama
And a mutable tag alone cannot satisfy the evidence gate
```

```gherkin
Given Qwen3.5-4B is explicitly selected for development
When evidence is recorded
Then it is labelled development or low-spec evidence
And it cannot satisfy the Qwen3.5-9B Release-acceptance gate
```

```gherkin
Given Ollama or the approved model is unavailable
When a non-AI Backend endpoint is used
Then the Backend process remains live
And the non-AI endpoint is not failed solely because Ollama is unavailable
```

## Approved Q31-E operational and evidence contract

Dependency readiness and admission capacity are separate dimensions. `busy` means bounded capacity is occupied; it does not mean Ollama is unhealthy. Dependency state separately distinguishes `ready`, `unavailable`, `identity_mismatch`, and `quarantined` under the decision record.

Public health output contains no model path/digest, host detail, raw error, or deployment configuration. The Backend operator evidence record retains the approved detailed model-identity evidence under Q14 access/logging boundaries.

### Mandatory evidence matrix

| Area | Required evidence |
|---|---|
| Identity/isolation | Approved 9B reference and loaded digest; private Backend-only Ollama; prohibited capability isolation; 4B labelled development-only |
| Timing/capacity | Unique monotonic deadline, nested budgets, wall-clock immunity, host/per-user limits, admission-before-slot semantics |
| Terminal/cancellation | Abandoned/timeout, late discard, quarantined slot, Q19 races, queue non-restoration |
| Token/parser | Complete-input counting and ceilings; duplicate/root/trailing/encoding/schema rejection without repair |
| Semantic policy | Versioned allowed/prohibited/ambiguous corpus, policy version, expected and observed delivery decision |
| Fallback/retention | Non-content Conversation failure, safe-projection fallback, no late/stale fallback, anchors and no prohibited retained/logged data |

The adversarial corpus proves only its defined cases: prohibited semantic content in those cases is never delivered, deterministically detectable violations fail closed, and safe policy-conforming responses may pass. It is not universal proof of natural-language grounding.

Normal CI uses the fake adapter. Live evidence uses the approved 9B digest on the controlled host and covers both successful use cases plus unavailable, timeout/cancellation, safely injectable invalid output, and non-AI continuity cases.

```gherkin
Given Ollama is healthy but the active and queue capacity is occupied
When dependency readiness and request admission are evaluated
Then dependency readiness remains healthy
And the new request is rejected by admission control as busy
```

```gherkin
Given an adversarial case contains a deterministically detectable prohibited violation
When the semantic policy is applied
Then the content is not delivered
And the evidence claims only that defined case, not universal grounding proof
```

### Closure

Q-31 is Resolved as a requirement decision. Runtime implementation reaches Release-acceptance readiness only after every mandatory automated and controlled-host item passes with the approved 9B digest and no unresolved defect violates Q31-A–E or causes mandatory evidence or approved safety, persistence, logging, or delivery behavior to fail. Generic defect-priority labels are not the gate.

Concrete endpoint DTOs, public error strings/status mappings, final UI copy, and deployment commands remain separate contracts.
