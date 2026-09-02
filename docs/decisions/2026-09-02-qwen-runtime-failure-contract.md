# Qwen runtime and failure contract — 2026-09-02

- **Status:** Approved; Q31-A through Q31-E approved; Q-31 Resolved
- **Decision owner:** LI HOURUI, ENMORI PM
- **Source ID:** S-PM-0902-Q31
- **Approved scope:** Qwen model identity/isolation/evidence, request budgets/concurrency/terminal semantics, raw JSON/schema validation, semantic model-output policy, use-case-specific retry/fallback behavior, operational states, and Release evidence/closure conditions
- **Builds on:** [S-PM-0901-BACKEND](2026-09-01-backend-architecture.md), [S-PM-0901-Q17](2026-09-01-recommendation-ai-field-allowlists.md), [S-PM-0901-Q19](2026-09-01-persona-conversation-lifecycle.md), and [S-PM-0902-Q14](2026-09-02-retention-logging-audit-policy.md)

## Q31-A — Model identity and runtime isolation

Qwen3.5-9B is the sole production and Week 9 Release-acceptance model. It runs through Ollama on the controlled demonstration host. The Backend calls Ollama through the approved internal Qwen Adapter and returns a complete, non-streaming response only after the later-approved validation/fallback contract has completed.

Qwen3.5-4B is a manually selected development or low-spec verification alternative only. It requires explicit Backend/operator configuration, is never an automatic failover target, and cannot replace Qwen3.5-9B Release-acceptance evidence.

Model selection is controlled only by trusted Backend deployment configuration. Flutter, public request DTOs, ordinary users, Personas, and prompt content cannot select or override a model.

Qwen receives only the approved minimized, purpose-specific projection. Qwen is not exposed to application-level filesystem, network, database, shell, tool-calling, or persistent-memory capabilities. Ollama may access only deployment-controlled resources required to load and execute the approved model.

Ollama or model unavailability does not terminate the Backend process. AI availability and readiness may degrade independently. Exact endpoint behavior remains unapproved until the later Q31 failure/fallback subsection.

## Model identity evidence

Release evidence records both:

- the human-readable model reference; and
- the immutable resolved model/manifest digest actually loaded by Ollama.

Mutable tags alone are insufficient evidence of model identity. Evidence from the 4B development alternative cannot satisfy the 9B Release gate.

## Q31-B — Request budget, concurrency, and terminal states

Each accepted AI use case has exactly one Backend-authoritative end-to-end deadline:

```text
requestDeadline = acceptedAt + 60 seconds
```

The 60-second elapsed-time budget starts when the authenticated Backend AI use case is accepted. It never pauses or restarts across queueing, model-facing input construction, Ollama generation, validation, fallback processing, or pre-delivery authority revalidation.

Enforcement uses a monotonic elapsed-time source so wall-clock correction cannot shorten, extend, or reopen the request. Server UTC timestamps may record `acceptedAt` and terminal evidence, but wall-clock arithmetic is not the enforcement clock.

The queue and generation limits are internal sub-budgets, not additional or independently restarted deadlines:

```text
queueEnd      = min(acceptedAt + 5 seconds, requestDeadline)
generationEnd = min(generationStartedAt + 45 seconds, requestDeadline)
```

All later processing receives only the time remaining before the same `requestDeadline`.

### Model-facing token ceilings

The runtime context ceiling is 8192 tokens. The 4096-token input ceiling covers the complete model-facing input submitted to Ollama, including Backend-owned instructions, structured-output instructions/schema, current user content, approved Check-in projection, approved Persona presentation projection, deterministic recommendation reason, and all framing tokens. It is not merely a business-projection limit.

Token measurement uses the tokenizer associated with the resolved loaded model. An over-ceiling input is rejected before generation. No field may be silently truncated, dropped, or reprioritized without a separately approved deterministic reduction contract.

AI Conversation output is limited to 512 generated tokens. Recommendation-explanation output is limited to 192 generated tokens. Field-level DTO limits remain separately reviewable and cannot bypass these aggregate ceilings.

### Host and per-user capacity

The controlled Week 9 host permits one active Ollama generation and at most two queued AI requests. Queue order follows trusted Backend acceptance order.

An authenticated user may own at most one non-terminal AI request. The per-user slot is acquired at `accepted` and remains held until that application request reaches a terminal state. A request rejected before acceptance does not acquire it. Releasing or retaining the underlying host generation slot is a separate runtime-capacity concern.

A queued request occupies one queue slot but not the active-generation slot. Its queue slot is released exactly once when it starts generation, disconnects, expires, is cancelled, or is discarded during shutdown.

An active request occupies the generation slot until the underlying Ollama invocation is confirmed completed, failed, or cancelled. Client disconnect or application-level timeout alone does not release that slot while Ollama may still be generating.

### Application terminal states and late results

Client disconnect makes the application request terminally `abandoned`. A queued request is removed immediately; an active invocation receives best-effort cancellation. No assistant result from that request may subsequently be persisted or delivered. Disconnect does not remove a user message already successfully persisted.

Reaching the unique 60-second deadline makes the application request terminally `timed_out`. A later model result is discarded and cannot be persisted or delivered.

Conversation deletion, Persona deletion, and graceful shutdown trigger best-effort cancellation. Q19 authority revalidation remains mandatory before persistence and response delivery regardless of cancellation outcome.

If an application request is terminal but Ollama termination is not confirmed, its active generation slot remains quarantined and no new generation is admitted. The AI dependency is unavailable/degraded until termination is confirmed or process supervision restores it. Resource cleanup may continue after the request deadline, but cannot extend or reopen the application request or its per-user slot.

Queue state is transient and is not persisted. Restart or shutdown permanently discards queued work; it cannot resume, persist, or deliver a result later.

Capacity rejection occurs before acceptance, does not enter the queue, and consumes neither a per-user slot nor the generation slot. It produces a stable application overload category; user-facing behavior remains Q31-D.

## Q31-C — Structured output and semantic policy

Qwen output is untrusted input. It must contain exactly one JSON root object and no surrounding prose, Markdown fence, trailing token, or second object.

AI Conversation output has exactly this logical shape:

```json
{
  "schemaVersion": "ai_assistant_message_v1",
  "message": "string"
}
```

Recommendation explanation output has exactly this logical shape:

```json
{
  "schemaVersion": "recommendation_explanation_v1",
  "message": "string"
}
```

Unknown, missing, duplicate, or incorrectly typed properties invalidate the entire output. The Backend does not extract JSON from surrounding text, coerce a value, repair malformed JSON, or accept a partial object.

### Raw JSON and deterministic runtime validation

The duplicate-key and single-root guarantees are enforced against the raw model response during JSON parsing, before it is materialized into an ordinary object representation that could discard duplicate keys. The parser rejects a duplicate key at any object level, multiple root values, trailing non-whitespace input, invalid encoding, and incomplete input.

Within the same Q31-B deadline, deterministic runtime validation then applies in order:

1. one complete duplicate-free raw JSON root object;
2. exact use-case schema and schema version;
3. exact property set and types;
4. trimmed, non-empty UTF-8 `message`;
5. maximum 2400 Unicode code points for AI Conversation or 800 for Recommendation explanation;
6. no prohibited control or bidirectional-control characters, HTML, executable markup, code fence, embedded object, URL, or tool instruction; and
7. current use-case authorization, purpose, source, Conversation, and Persona/deletion authority revalidation.

The application renders `message` as application-controlled plain text. Persona `bulleted` presentation may produce newline-separated textual bullets, but the client does not interpret model output as executable HTML, arbitrary Markdown, links, or tool calls.

### Separate semantic model-output policy

Deterministic runtime validation and semantic model-output policy are distinct layers. Passing syntactic, schema, length, character, and authority checks does not prove that unrestricted natural-language output is factually grounded or semantically safe. The project must not claim that free-text grounding can be completely algorithmically proved.

The semantic acceptance policy rejects an output when it:

- exposes or infers private, non-consenting, or non-projected information;
- claims access to Firestore, tools, memory, location, accounts, or external systems;
- contains diagnosis, treatment direction, crisis judgement, or prohibited health inference;
- claims an application mutation or real-world action occurred;
- introduces a Recommendation candidate, factor, score, relationship, or Event fact not supplied in the approved model-facing input;
- contradicts the authoritative deterministic Recommendation result;
- reveals Backend instructions, schema internals, credentials, tokens, or deployment details; or
- otherwise exceeds the approved use-case purpose.

A Recommendation explanation may describe only the single Backend-selected result and the supplied deterministic reason; it cannot add a factor, comparison, rank claim, or unsupported candidate fact. AI Conversation may summarize or present only the current user input and approved Check-in/Persona projections. Persona changes presentation only.

Semantic policy enforcement is fail closed but is not represented as mathematical proof of free-text grounding. Its concrete policy checks, adversarial cases, and acceptance evidence must be documented and verified under Q31-E. Qwen cannot validate or moderate its own output, and a second model call is not an approved validator.

Any deterministic-runtime or semantic-policy failure rejects the output as a whole. No fragment is persisted or delivered. Rejection creates no assistant message, does not advance `lastPersistedMessageAt`, is not logged as raw content, and follows Q14 request-only disposal. The stable internal classification is `invalid_output`, `unsafe_output`, or `stale_authority`; retry, fallback, and user-facing behavior remain Q31-D.

## Q31-D — Retry and use-case fallback

The Week 9 MVP performs no automatic Qwen retry. Timeout, overload, dependency failure, invalid output, unsafe output, stale authority, and cancellation terminate the current application request or model attempt according to the approved terminal rules.

A user-initiated retry is a new request. It captures current authority, source state, Persona snapshot, `asOf`, capacity slot, and a new 60-second deadline. It cannot resume the previous generation or reuse rejected output.

Fallback processing never restarts or extends the Q31-B deadline. Overall-deadline expiry is terminal and permits no later fallback. Only a queue or generation internal sub-budget failure may select and deliver an approved fallback while time remains before the same overall deadline.

### AI Conversation

AI Conversation has no synthetic conversational-content fallback. Capacity, dependency, internal sub-budget, invalid-output, or unsafe-output failure may produce only a typed non-content application failure state while the request is still deliverable. It creates no assistant message.

Failure state itself does not advance `lastPersistedMessageAt`. An already-successfully-persisted user message remains and retains its Q14-B retention effect.

Overall timeout, `abandoned`, deletion-driven cancellation, and `stale_authority` are terminal no-content/no-late-delivery outcomes. Permanent Persona deletion cannot silently change the in-flight request to default presentation; a new request may use the then-current state.

### Recommendation explanation

For capacity, dependency, queue/generation sub-budget, invalid-output, or unsafe-output failure, Recommendation explanation may use Backend-owned deterministic presentation logic only while the original deadline still has time remaining.

The Backend renders that fallback from the approved safe explanation projection for the single already-selected result. It never renders from raw factors, raw scores, private reason data, candidate pools, or rejected model output. It cannot introduce a candidate, factor, comparison, score, rank, or model-authored claim.

Recommendation fallback is request-time presentation data and is not retained as Recommendation history. Q31-D does not implicitly persist it as an AI Conversation message.

`stale_authority` takes precedence over availability fallback. Deleted, unauthorized, or purpose-invalid data cannot be returned through deterministic presentation. Overall-deadline expiry, client abandonment, and deletion-driven cancellation permit neither late fallback nor late model delivery.

### Stable semantic failure categories

The application distinguishes at least:

- capacity/overload;
- dependency unavailable;
- timeout;
- invalid model output;
- unsafe or semantically rejected output;
- stale authority; and
- abandoned/cancelled.

These are semantic application categories, not approved public error-code strings, HTTP status mappings, or final user-facing copy. Raw failed/rejected output never enters a fallback, API response, or log and remains request-only under Q14.

## Q31-E — Operational state and Release evidence

### Readiness and admission are distinct

Backend liveness remains independent from Ollama. AI dependency state distinguishes:

- `ready`: the approved 9B identity is confirmed, Ollama is reachable, and no active generation-slot quarantine exists;
- `unavailable`: Ollama or the approved model cannot accept work;
- `identity_mismatch`: the loaded model reference/digest does not match the approved deployment identity; and
- `quarantined`: an application-terminal invocation has not confirmed underlying termination.

`busy` is a capacity/admission condition, not dependency unhealthiness. Readiness and admission state remain semantically distinct. A healthy runtime may reject admission because its bounded active/queue capacity is occupied without being classified dependency-unready.

`unavailable`, `identity_mismatch`, and `quarantined` make affected AI operations unavailable while non-AI endpoints remain live where their own dependencies permit. Public health responses do not expose model paths, immutable digests, host details, raw dependency errors, or deployment configuration. Detailed identity evidence is restricted to the approved Backend operator evidence record.

### Mandatory Release evidence

Release evidence must cover:

1. **Model and isolation:** the loaded Qwen3.5-9B reference and immutable resolved digest; private Ollama/Backend-only access; absence of application-level filesystem, network, database, shell, tool, and persistent-memory capability; and explicit development-only labelling of any 4B evidence.
2. **Timing and capacity:** the single monotonic 60-second deadline, nested queue/generation sub-budgets, wall-clock-change immunity, one-active/two-queued host limits, accepted-to-terminal per-user slot, and pre-acceptance capacity rejection.
3. **Terminal behavior:** abandoned/timeout terminal states, late-result discard, generation-slot quarantine, Q19 deletion races, and non-restoration of transient queue state after restart/shutdown.
4. **Token and raw JSON validation:** complete model-facing input accounting, all token/context/output ceilings, pre-Ollama over-limit rejection, and rejection of duplicate keys, multiple roots, trailing tokens, invalid encoding, malformed JSON, unknown/missing properties, and wrong schema versions without extraction, repair, coercion, or partial acceptance.
5. **Semantic policy:** a versioned allowed/prohibited/ambiguous adversarial corpus and the concrete policy version/results.
6. **Fallback and retention:** non-content AI Conversation failures, safe-projection-only Recommendation fallback, no fallback after overall expiry, stale-authority precedence, correct `lastPersistedMessageAt` effects, and no raw/private prohibited data in persistence, fallback responses, or logs.

The adversarial corpus verifies that prohibited semantic content is never delivered. Safe policy-conforming responses may pass; deterministically detectable violations fail closed. Ambiguous mandatory cases fail closed. The corpus is evidence of the defined cases, not proof of universal natural-language grounding.

Normal CI uses a fake Qwen Adapter for deterministic timing, capacity, cancellation, parsing, validation, and fallback cases. Controlled-host evidence uses the approved Qwen3.5-9B digest and covers successful Conversation generation, successful Recommendation explanation, dependency unavailability, timeout/cancellation, safely injectable invalid structured output, and non-AI continuity during Ollama failure.

Evidence records the test command/version, controlled-host profile, model identity, timestamp, observed latency/result, and pass/fail outcome. Observed performance is evidence and does not authorize changing Q31-B limits.

### Closure and implementation readiness

Q-31 is Resolved at the requirement-contract level by approval of Q31-A through Q31-E.

Runtime implementation is Ready for Release acceptance only when all mandatory automated and controlled-host evidence passes with the approved 9B digest and there is no unresolved defect that:

- violates Q31-A through Q31-E; or
- causes mandatory Release evidence or approved safety, persistence, logging, or delivery requirements to fail.

Readiness does not depend on an undefined generic “high-priority” label. Failed implementation evidence blocks implementation readiness; it does not reopen the approved requirement decision unless remediation requires changing this contract.

## Explicitly not yet approved

Q31-A through Q31-E do not approve:

- user-facing fallback/error copy; or
- concrete Ollama tag, digest, installation command, host sizing, or deployment configuration.

## Authority and readiness

This is a current PM runtime-boundary decision, not a Sponsor/Supervisor decision and not implementation or verification evidence. Q-31 is Resolved at the requirement-contract level. The AI Assistant production PBI remains Not Ready until applicable API/schema, UI, owner/reviewer, platform, and the mandatory Q31-E implementation-evidence gates pass.
