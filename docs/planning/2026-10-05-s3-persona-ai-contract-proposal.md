# S3 Persona and AI operation contract proposal

Owner: ZHOU YAOYIN. Assignment: [Issue #49](https://github.com/3427564237/enmori-app/issues/49), under [Sprint 3](https://github.com/3427564237/enmori-app/issues/44). Independent reviewer: JIN ZIHAN. Prepared 2026-10-05 against main `adf20c8c34282263623d77724ad4e859c948926d`.

**Status: preparation proposal for independent review, pending JIN review and LI decisions.** This packet supplies the Persona physical-contract proposal, AI operation alternatives, initial producer dependencies, planned owner checks and a smallest later implementation slice. It does not implement or approve a route, DTO, storage mapping, timeout change, model installation or product behavior. All new physical names below are candidates for LI confirmation, not additions to normative OpenAPI. No requirement supersession is proposed or inferred.

## Authority and retained scope

| Source | What it controls here |
| --- | --- |
| [Q19 Persona and Conversation lifecycle](../decisions/2026-09-01-persona-conversation-lifecycle.md) and [detailed lifecycle design](../superpowers/specs/2026-09-01-persona-conversation-lifecycle-design.md) | Owner privacy, five live Personas, activation, mutation safety, projection, request snapshots and deletion races |
| [Q17 field and purpose allowlists](../decisions/2026-09-01-recommendation-ai-field-allowlists.md) | Authorized inputs, producer filtering and separate conversational versus recommendation purposes |
| [Q31 runtime and failure contract](../decisions/2026-09-02-qwen-runtime-failure-contract.md) | Complete non-streaming responses, one deadline, capacity, terminal states, validation, failures and model evidence |
| [Q14 retention and logging](../decisions/2026-09-02-retention-logging-audit-policy.md) | Request-only processing copies, Conversation expiry, source provenance and non-content telemetry |
| [Backend architecture](../decisions/2026-09-01-backend-architecture.md) and [detailed design](../superpowers/specs/2026-09-01-backend-architecture-design.md) | Verified identity, Backend-only product persistence and model access, Ports, REST/JSON and physical-contract approval |
| [Approved Q04-D surface disposition](../superpowers/specs/2026-09-02-q04-d-inventory-content-acceptance-draft.md) | Persona activation/zero-Active boundaries, consent-dependent AI state and prototype-only standalone safety surface; not detailed visual or implementation approval |
| [Pinned Sprint 3 handoff](https://github.com/3427564237/enmori-app/blob/479619e8d124f3342458506fc145dc4bfbe3f483/ASTRA_HANDOFF_S2_VISUAL_GAP_PREP_20260923.md) | Six ZHOU routes/states, JIN review, LI shared Home/router integration and early bounded producer reads |

The Q17 text originally withholding Persona input is historical: Q19 explicitly approved the exact presentation projection and closed that gate. This is not approval of its physical API/storage implementation. The pinned PR #42 handoff is not implementation approval. The accepted [SHI Event preparation](2026-10-01-s3-event-detail-contract-proposal.md) and [JIN Friend preparation](2026-10-02-s3-jin-friend-contract-proposal.md) preserve their unresolved physical and disclosure decisions after merge.

| Assigned route or state | Preparation coverage and retained gate |
| --- | --- |
| `ai-customize` | Active/no-Active Persona overview and entry to management/approved structured creation; explicit activation remains required; precise layout/navigation Pending |
| `persona-management` | Owner list, saved selection and explicit activation; no cross-owner directory |
| `edit-persona` | Owner edit/delete with concurrency protection and later read |
| `ai-assistant` | Proposed operation/producer boundaries; public generation and Conversation persistence remain gated |
| `ai-limited` | Q04-D consent/authority-dependent bounded state of M26 AI Conversation; separate from Q31 runtime failures; exact presentation and public copy remain for acceptance |
| `ai-safety` | Prototype Evidence Only. Standalone placement/content or a mapping into Conversation/Settings needs its own decision |

ZHOU supplies the AI/Persona Home entry and states; LI owns shared Router/Home integration. The [Q04-C route/state matrix](../evidence/ui/figma-make-v5/Q04-C_ROUTE_STATE_MATRIX.md) supplies supporting inventory evidence for the overview and state mapping, subject to the approved Q04-D corrections and Q19 semantics; its rows are not detailed UI approval. These mappings are coverage, not six implemented routes or permission to copy prototype behavior.

## Current implementation and the first gap

The [route inventory](../../backend/src/transport/route-inventory.ts) contains no public Persona or AI operations. The [internal AI runtime](../../backend/src/ai-runtime/README.md) supplies bounded scheduling and structural parsing; it is not wired to Bootstrap, Firestore, public transport or a model host. Its tests use fake time/transport and a fake remaining-pipeline checkpoint.

The [Flutter Backend client](../../lib/core/network/backend_api_client.dart) has a default 15-second budget covering token acquisition, response headers and body. `Future.timeout` stops local waiting; it does not prove HTTP cancellation or Backend abandonment. The [shared provider](../../lib/app/providers.dart) closes the whole client on disposal, not one AI request. The client currently has GET/PUT/POST helpers, no DELETE helper or request-specific cancellation handle; proposed operations need a later bounded client change after approval.

The runtime enforces the 60-second overall, 5-second queue and 45-second generation limits and generation-slot quarantine. Its success is a structural candidate, not permission to save or deliver an assistant message. Token accounting, model identity, semantic policy, producer authorization, Persona/Conversation revalidation, fallback, persistence and delivery remain integration obligations. Existing code and tests are implementation evidence only; this preparation does not rerun or promote them into full AI acceptance.

## Persona semantics that remain unchanged

- At most five live Personas per owner; new Personas are inactive. Duplicate display names are allowed. Client selection alone has no persisted effect; explicit confirmation atomically replaces the sole Active authority. Zero Active is valid. No independent per-Persona `isActive` flags may compete as authorities.
- Only the owner may read, edit, activate, delete or use the Persona. Another ordinary user or an Admin receives no access by role. Backend derives ownership; no caller-supplied UID/account ID controls it.
- Creation prevents duplicate effects. Edit/activation/deletion protect against conflicting newer state. Permanent deletion removes live content and frees capacity; deleting Active clears selection without selecting a replacement. There is no Trash, Restore or implicit deactivation feature added here.
- At AI use-case start, resolve Active once and take an immutable request-only presentation snapshot. Later edit or activation affects later requests and does not invalidate an already-started request. Permanent deletion is different: before persistence and delivery revalidate that the used Persona still exists; otherwise discard output with no default-persona substitution for that request.

The owner-management fields approved by Q19 are opaque identity/owner, `displayName`, the three structured style enums, server created/updated times and a concurrency revision. `displayName` is trimmed, non-empty and control-character-free; its maximum length and exact DTO normalization remain decisions. No free-text prompts, system instructions, role-play fields, URLs, tool instructions or extension maps are introduced.

The model-facing projection is exactly:

```text
schemaVersion = persona_presentation_v1
tone = neutral | warm | encouraging
responseLength = concise | balanced | detailed
formatStyle = plain | bulleted
```

It excludes IDs, owner, display name, revision, timestamps and original objects. Backend validates the enums and maps them to lower-priority presentation guidance. The projection cannot expand safety, purpose, access, recommendation factors/order, tool access or fallback.

## Candidate Persona physical contract for LI review

This is a coherent candidate for the first small slice, not an approved interface. All reads/mutations use verified Auth and the established completed-account boundary, subject to LI confirmation for this feature. Authentication/authorization occur before domain mutation processing. Firestore remains Backend-only.

### Identity and DTO candidates

Q19's owner UID and the existing Backend's opaque Account ID are different identities. **Candidate:** resolve verified Firebase principal through the existing Auth Binding, then key the owner partition by that Account ID while retaining the verified ownership association in trusted Application context. Do not send either owner identity in a Persona mutation DTO or copy a UID into product records merely for convenience. LI must confirm this physical mapping and its account-lifecycle effects before implementation.

| Candidate type | Exact proposed fields | Authority and unresolved limits |
| --- | --- | --- |
| `PersonaInput` | `displayName`, `tone`, `responseLength`, `formatStyle` | Q19 semantics/enums above; display-name maximum, exact normalization and request-size limit need LI confirmation; reject undeclared fields |
| `PersonaView` | `personaId`, the four `PersonaInput` fields, `createdAt`, `updatedAt`, `revision` | Owner-only; opaque server ID/revision, authoritative UTC timestamps; owner identity is not returned |
| `PersonaSetView` | `items` of `PersonaView`, optional `activePersonaId`, `stateRevision` | Omit Active ID when none; pointer must reference a live owned item. Candidate returns the entire set, at most five; LI must approve this bounded exception to the architecture's cursor-pagination default or specify a cursor contract |
| Mutation preconditions | Observed Persona revision and, for membership/selection changes, observed owner-state revision | Wire header/body names and precedence remain Pending; no client chooses new revision values |

### Candidate operations

| Candidate operation | Proposed use and result | Decision required before coding |
| --- | --- | --- |
| `GET /v1/me/personas` | Independent later read of the owned set and sole Active authority | Collection response, order and pagination choice |
| `GET /v1/me/personas/{personaId}` | Read one current owned `PersonaView` for edit/reload | Privacy-safe missing/non-owner policy and exact public errors |
| `POST /v1/me/personas` | Create from `PersonaInput`, inactive, atomically enforce the five-live limit; return saved view | Create command identity/replay contract, success status and protected capacity error |
| `PUT /v1/me/personas/{personaId}` | Replace the four editable fields under observed Persona revision; return authoritative saved view | Update precondition, no-op/revision and stale-state response rules |
| `PUT /v1/me/persona-selection` | Confirm one owned live `personaId` against the observed state/target revisions; return authoritative selection | Exact DTO, activation preconditions and no-op behavior; omission is not a new clear-selection operation |
| `DELETE /v1/me/personas/{personaId}` | Owner-confirmed permanent deletion; clear Active atomically if this is its target; later reads cannot reconstruct content | Delete preconditions, response and repeated-delete behavior; no content returned after deletion |

The existing `Idempotency-Key` convention is a candidate for create duplicate-effect protection only. Its retained receipt fields/location, same-input replay/different-input conflict, scope, validity period and cleanup must be explicitly confirmed. Do not copy the older Check-in 24-hour window by analogy. A retried old create after deletion must never resurrect the Persona or disclose its deleted content; LI must choose a non-content replay outcome and the approved receipt retention basis.

P03 must cover both interruption directions: creation commits but acknowledgment or duplicate-effect evidence is interrupted, and a receipt exists without completed creation. Retrying the same accepted command must not create another Persona or report an uncommitted success. The design must explain the consistency and recovery boundary between the mutation and its duplicate-effect proof; no particular transaction, receipt record or recovery mechanism is selected here.

The replay decision must distinguish a retry within the approved validity period, an old command received after receipt cleanup, and an explicitly new create. A bounded receipt window is not permanent replay protection. LI must confirm how expired commands are recognized/handled while preserving deletion without restoring or returning deleted content. Indefinite retention of receipts or original Persona content is not an assumed solution; receipt fields, retention, command freshness and safe expiry outcomes remain Pending.

Reuse the established safe error-envelope shape if approved. The new operation outcomes to map are invalid fields, capacity reached, unavailable/non-owned Persona, stale Persona/state revision, command conflict and dependency failure. Exact codes, HTTP statuses, messages, validation/precondition/no-op precedence and missing-versus-denied disclosure are Pending. Existing onboarding/Interest error codes are not automatically extended to Persona. No user/entity IDs, counts about another owner, provider errors or raw content may appear in failures/logs.

### Candidate storage and atomic boundaries

**Candidate physical names:** `accounts/{accountId}/personas/{personaId}` for live Persona records, and `accounts/{accountId}/persona_state/current` for one owner-level authority. Both collection names, path identity and field allowlists need LI approval. They add no fields to the existing Account document in this proposal.

| Candidate record | Proposed allowlist / responsibility |
| --- | --- |
| Live Persona | `displayName`, `tone`, `responseLength`, `formatStyle`, `createdAt`, `updatedAt`, `revision`; Persona identity and owner partition are in the server-derived path |
| Owner state | `livePersonaIds`, optional `activePersonaId`, `revision`; at most five distinct live IDs, one authoritative pointer. No duplicated per-Persona Active flag |
| Create replay receipt | No field list or persistence location selected yet; privacy-safe duplicate-effect proof and deletion behavior require P03 below |

Membership, capacity and Active changes must share one protected consistency boundary. The candidate owner-state record is a serialization point: concurrent fifth/sixth creation, creation/deletion and competing activations cannot breach capacity or point at a missing record. Create, activate and delete read/validate the relevant state and Persona revisions atomically; edit validates the target revision and cannot recreate a deleted object. Server alone advances effective revisions; no-op policy needs confirmation. UI renders only authoritative results and never retries a conflict as an unconditional overwrite.

P02 must also define a consistent read boundary for `items`, `activePersonaId` and `stateRevision`. For example, reading owner state, then encountering a concurrent create/delete/activation before loading the items must not produce an Active pointer absent from that response's live set or a revision paired with incompatible membership/selection. Return a coherent result at the approved read boundary or the approved safe failure; do not invent zero-Active or an empty set to conceal a failed read. This is response consistency, not a promise that no later mutation can make a response stale. The read mechanism and any retry/failure policy remain Pending.

Atomic mechanics, record bootstrap when the owner has no Personas, indexes/query shape and schema conformance require design approval and Emulator evidence. No receipt policy, migration, TTL/scheduler, counter repair or cleanup deployment is selected here. Deletion effects on in-flight AI must be validated by the later Q19 Application guard; successful record deletion alone is not that full integration.

## AI operation alternatives and terminal ownership

### Approved invariants for every option

Q31 requires one monotonic deadline from authenticated Backend acceptance: `acceptedAt + 60s`. Queue expiry is `min(acceptedAt + 5s, deadline)` and generation expiry is `min(generationStartedAt + 45s, deadline)`. Preparation, validation, fallback and authority revalidation share the remainder; no phase restarts it. Internal monotonic timestamps are not public UTC DTO fields.

At most one generation and two FIFO queued requests are allowed; one non-terminal application request per authenticated user. Observed client disconnect is terminal `abandoned`: remove queued work or request best-effort active cancellation, with no later assistant persistence/delivery. Overall expiry is terminal `timed_out`. The active-generation lane stays quarantined until underlying termination is confirmed, even after the application user slot is released. Restart/shutdown cannot restore queued work.

There is no automatic Qwen retry. Explicit user retry is a new request with fresh authority, sources, Persona snapshot, `asOf`, admission and deadline; it does not reuse discarded content. AI Conversation failure creates no synthetic assistant message. Recommendation explanation has its separate safe deterministic fallback only while deliverable within the original deadline, with stale authority taking precedence. Overall expiry, abandonment or deletion cancellation allow neither late fallback nor late model output.

### Options requiring LI choice

| Option | Proposed interaction | Benefit and cost | Approval boundary |
| --- | --- | --- | --- |
| A: complete-response AI call with its own wait/cancel policy | Keep non-AI 15-second behavior. Use an AI-scoped operation and request-specific cancellation, receiving one fully validated non-streaming response | Most directly matches current Q31; requires a client wait covering token/network time plus Backend acceptance-to-terminal time and agreed network margin | LI chooses the exact AI wait, cancellation/route-exit behavior and existing-edge timeout compatibility. Setting every request to 60 seconds is not the proposal; client and Backend clocks start at different events |
| B: retain the 15-second client interaction limit and abandon early | At the agreed client boundary, stop display updates and request cancellation/abort of this AI operation; Backend must observe disconnect or record an owner-authorized cancellation under an approved contract | Earlier user feedback but may discard work that would finish within the Q31 budget; retry may encounter an occupied slot or quarantined generation | LI must accept the shorter experience and define request-level cancellation evidence, any public acknowledgment and uncertain-outcome handling. Existing `Future.timeout` alone cannot implement this option |
| C: submit an operation and retrieve a result separately | Independently query operation status/result after the submission connection completes | Adds operation identities, status/cancel interfaces, retention, delivery ownership and recovery questions | Not implementable under an assumed exception to Q31. Detached continuation after disconnect and later delivery need an explicit competent interpretation/amendment retaining the old/new sources and scope; no approval is inferred |

**Recommendation for discussion, not a decision:** consider A first because it preserves complete-response Q31 behavior without an asynchronous operation model. Exact values and public operations remain Pending. B is a bounded alternative; C is an explicitly gated expansion. No option installs a model or enables streaming.

### What the client and server can actually prove

| Observation | Required treatment / unresolved mapping |
| --- | --- |
| Client stops waiting or leaves the page | Suppress late UI writes using request/session ownership. This alone proves neither HTTP disconnect nor server cancellation. Do not close the shared non-AI HTTP client to cancel one operation |
| Cancel is requested but connectivity is uncertain | Do not tell the user the server or model definitely stopped. Public cancel acknowledgment and copy need LI approval; an existing persisted user message is not rolled back by an unconfirmed cancel |
| Backend observes disconnect | Q31 terminal `abandoned`: remove queued work or best-effort cancel active generation; no later assistant persistence/delivery. A disconnected channel cannot be relied on for acknowledgment |
| Backend receives an explicit cancel request | Owner authorization, terminal mapping and public acknowledgment require an approved contract before implementation; cancellation intent alone is not evidence of model termination |
| Model transport reports termination | Only actual invocation termination releases the generation lane. A local aborted HTTP future does not prove this |
| User retries | New request, not background retry/resume; reacquire current permissions/capacity and use the agreed user-message duplicate-effect semantics |
| Persona edit or Active switch after acceptance | Keep the original snapshot for this request. Only subsequent requests use the edit/new selection |
| Used Persona, Conversation or required source becomes invalid | Revalidate before acceptance into persistence and before delivery; discard affected output. Deleted Conversation cannot be recreated by a late completion |

The eventual application flow must distinguish accepting an operation, successfully persisting its user message, receiving a model candidate and accepting/delivering an assistant message. Q31 preserves an already-persisted user message on abandonment; it does not mandate a new physical commit order here. LI must confirm message creation/replay semantics and the atomic boundary against deadline, cancellation and deletion. No operation can assume that an HTTP timeout proves a business write did not occur.

If a public cancel operation is chosen, P05 must bind it to the original logical operation and its verified owner. Exercise this ordering: A reaches terminal state, a fresh same-user request B is accepted, then A's delayed cancel arrives. B must remain unaffected, including its application slot, deadline, output and generation ownership. A user or Conversation identity alone cannot identify which operation to cancel. LI must confirm the physical operation reference, authorization and terminal/repeated-cancel response; this proposal neither creates a persisted operation entity nor treats an ordinary logging correlation ID as a cancellation credential.

### Internal runtime is not the product terminal boundary

In [the current runtime](../../backend/src/ai-runtime/application/bounded-ai-runtime.ts), settling `outcome` finishes its bounded component request, releases its user slot and stops its overall timer; a quarantined model lane remains protected separately. The fake `checkCandidate` hook must not persist or deliver as a side effect. A later integration cannot append `outcome.then(persist)` or perform fallback after that component settlement and call it Q31-complete.

The later Application design must retain one authoritative request lifetime, original deadline and per-user slot through semantic checks, authority revalidation, permitted fallback, persistence and delivery. How that lifetime composes with or changes the bounded component is P06, not an implemented wrapper or a second independent 60-second timer. Tests must cover a second same-user request during post-generation validation/commit, and deadline/deletion races at persistence and delivery. Raw candidate success never bypasses those checks.

P06 must explicitly relate AI use-case start, Backend acceptance/queue admission and the immutable Persona snapshot capture. The current component calls `work.prepare` only after it obtains the generation lane; putting the first Active-Persona lookup there would apply a queue-time edit/switch to an already-started request. Q19 instead preserves the request-start snapshot while a permanent deletion still prevents persistence/delivery. The later design must demonstrate that ordering without restarting the deadline or moving accepted-request work outside its budget. The exact capture/acceptance consistency mechanism remains Pending; this is an integration constraint, not a defect claim about the existing isolated runtime.

**Narrow Q31 interpretation question, Pending under P06:** Q31-B establishes a deadline at accepted AI-use-case start and rejects capacity before acceptance without acquiring a user slot. Q31-D also permits a capacity-failure Recommendation explanation fallback only within the original deadline. The current component's pre-acceptance rejection returns no `acceptedAt` or deadline. LI must clarify the applicable fallback lifetime/budget at this boundary before that path is integrated; the proposal does not declare the sources superseded, invent a new acceptance/deadline, or relabel a rejected operation as accepted. This question gates only Recommendation explanation fallback after pre-acceptance capacity rejection. It does not block the Persona first slice, AI Conversation's typed non-content capacity failure, or independently approved flows with an established deadline.

## First producer reads and dependencies

No common user/context object or general Event/history model is proposed. Each read has one purpose, an accountable producer and an explicit gate. Missing authority or an unavailable required producer must not be converted into a fabricated authorized empty result.

| Producer / owner | First required read | Fields and access boundary | Present state / dependency |
| --- | --- | --- | --- |
| Auth/account / LI | Verified requester, current account eligibility, applicable purpose/consent state; shared Home entry | Trusted identity and authorization inputs remain Backend-only. One existing optional-processing boolean cannot stand in for every AI permission | Existing Auth/account boundary exists; new AI purpose/consent/revocation mapping and Home interface require confirmation with [#45](https://github.com/3427564237/enmori-app/issues/45) |
| Persona / ZHOU | Current owner Active snapshot and used-Persona deletion revalidation | Exactly the four-field presentation projection above enters Qwen; identity/provenance stays internal and request-only where applicable | Q19 semantic gate resolved; candidate physical contract/adapter above Pending |
| Check-in / DU | Current owner's eligible context and required-source availability for `checkin_conversation` (candidate purpose label only) | Q17 filtered seven-day/five-record projection; no unrestricted history, source documents or client-selected context IDs | [#48](https://github.com/3427564237/enmori-app/issues/48) proposes first producer reads. Existing own Note-by-ID read is not a history/AI-context query; read/consent/deletion contract remains Pending |
| Conversation / ZHOU, with LI contract approval | Owned live Conversation authority and, only after persistence is approved, retained-message source revalidation | No automatic stored-chat-history input to Qwen; no unrestricted message/history DTO | No public Conversation or persistence contract is introduced by this preparation |
| Recommendation producer / corresponding owner | Later optional explanation for one already-selected authorized result | Only Q17 module/display label/reason and module-specific safe labels/count or Activity type/time category; no candidate set, scores, history or Special Care | Not needed for the first Persona slice. [SHI's participation-ID proposal](2026-10-01-s3-event-detail-contract-proposal.md) is for Friend computation and explicitly not Qwen input; [JIN's packet](2026-10-02-s3-jin-friend-contract-proposal.md) is not an implemented reader |

For the later consented Check-in use case, Backend captures one `asOf`, considers only `[asOf - 7*24h, asOf]`, removes unconsented/deleted/unauthorized/future/out-of-window records first, sorts newest-first with opaque ID as stable tie-break, and selects at most five. Model fields are only UTC `occurredAt`, authorized `noteText` and safe normalized `moodLabel`, `activityLabel`, `weatherConditionLabel`. IDs, paths, weather payload/temperature/provider, location and provenance do not enter Qwen. Absent Mood/Activity/Weather mappings in the current Note-only implementation must be resolved by the producer contract; never manufacture labels or extend collection just to fill the projection.

The current user message and permitted projection remain untrusted data. Constructed model input must include Backend framing/instructions in the Q31 token budget; no silent truncation is permitted. Normal testing uses fakes. Model identity/tokenizer, complete input <=4096 tokens, context <=8192, and output limits of 512 Conversation / 192 explanation tokens remain future integration/Release obligations, together with the versioned semantic-policy corpus. No second model validator, automatic retry or unsupported model fallback is proposed.

## Persistence and deletion boundaries for later AI integration

Do not retain raw prompts, full Persona/Check-in projections, explanation payloads or rejected/raw Qwen responses. The request-start Persona snapshot is not a historical Persona snapshot. Q19 allows only `presentationMode` and, when applicable, the non-identifying `presentationProjectionVersion` as generation-time Persona usage metadata. No Persona ID/name/enums/fingerprint or complete projection may be smuggled into that version.

Conversation content and approved metadata expire at the earlier of owner deletion or `lastPersistedMessageAt + 90 days`. Only successfully persisted user/accepted assistant messages advance that anchor. Reads, failures, rejected output, metadata changes and cleanup do not. Expiry is immediately enforced on reads; physical cleanup is due within 24 hours, with no grace/restore period. This draft does not pick the physical cleanup mechanism or authorize a deployment.

Owner-confirmed whole-Conversation deletion removes messages and associated metadata/provenance, not Persona/Check-in/Event entities; no individual-message deletion is added. Persona deletion does not rewrite retained historical conversations. If any required Check-in source is deleted or newly unauthorized, the entire dependent assistant message becomes unavailable; the read path fails closed before cleanup. Any retained tombstone is content-free and, after source deletion is processed, contains no deleted source ID. Provenance is Backend-only and cannot outlive its retained message/Conversation.

Q14's application-log allowlist remains controlling across API/edge/supervision: no UID/entity ID, content, query value, prompt, model output, Persona projection, Firestore path or raw vendor error. A server-generated per-request correlation ID is not an owner/session/idempotency identity. No training, embeddings, analytics provider or manual-review data copy is introduced.

## Decisions needed before affected implementation

| ID | Concrete question for the competent owner | What remains gated |
| --- | --- | --- |
| P01 | LI: confirm owner UID-to-Account mapping, Persona routes/DTOs, required Auth/account state, name/size limits, list ordering/pagination and safe errors | Persona Transport/OpenAPI and client operation contract |
| P02 | LI: confirm live Persona/owner-state mapping, revision/precondition/no-op rules, atomic membership/activation/delete behavior, consistent set-read boundary and query/index needs | Persona persistence, coherent reads and concurrency implementation |
| P03 | LI: confirm create mutation/duplicate-effect-proof recovery, replay validity, command handling after receipt cleanup and deletion, minimized retention and repeat-delete response | Retry-safe Persona create/delete behavior; no duplicate or false-success outcome across interruption |
| P04 | LI: choose A or B with exact AI wait/cancel/route-exit/uncertain-outcome rules, or explicitly resolve C's Q31 conflict before considering it | Client AI operations; no global timeout change |
| P05 | LI with ZHOU: confirm public AI/Conversation operations/errors, user-message persistence/retry semantics, and owner-authorized cancellation bound to the original operation, including terminal/repeated-cancel acknowledgment | Public AI API and Conversation persistence; a late cancel cannot target a newer retry |
| P06 | LI with ZHOU/JIN: approve request-start snapshot/acceptance ordering and the Application lifetime/slot/deadline through validation, fallback, commit and delivery; clarify the narrow pre-acceptance capacity-fallback budget question above | Affected runtime-to-product integration; the capacity-fallback interpretation gates only its Recommendation explanation path |
| P07 | LI with DU/producer owners: confirm first purpose-authorized reads, consent/revocation, missing optional fields and source availability/provenance/cleanup mapping | Context-bearing AI integration; no arbitrary history read |
| P08 | LI with ZHOU: confirm approved surfaces, final public copy and Home handoff; separately resolve standalone `ai-safety` placement/content | Affected UI only; failure semantics from Q19/Q31 remain unchanged |
| P09 | JIN: independently review this preparation packet; LI: later kickoff acceptance | #49 preparation closure; local automated checks do not substitute for the named reviewer |

These gates apply to their affected slices. Pending AI producers/model access do not prevent preparing or reviewing the Persona contract. No user confirmation in this drafting session is treated as a new PM decision.

## Smallest later implementation and owner verification plan

**Proposed first slice, subject to P01-P03 and applicable P08 approval:** authenticated owner Persona create/list/read/edit/delete, explicit activation and independent saved-state reread in the approved management surfaces. Keep it free of live Qwen, Conversation persistence, DU history, recommendation changes and `ai-safety` implementation. ZHOU owns relevant tests and the proposed feature; JIN independently reviews. LI handles shared route/Home integration and later scope acceptance. A separate approved implementation task must identify the finalized contract and checks before coding.

After that slice, a separately approved AI operation slice can first prove the full Application lifetime with a fake Qwen adapter and fake authorized producers. Real producer/Emulator integration and the approved controlled 9B evidence follow their own gates; a fake success or existing S2 runtime suite is not those results.

All cases below are **planned, Not Run for this new slice**. Assertions for candidate physical behavior become executable requirements only after the corresponding LI decision.

| Cases | Boundary / intended assertions |
| --- | --- |
| V01 owner privacy | Auth-first behavior; other ordinary users and Admin cannot read/use/mutate another owner's Personas; body/query owner substitution rejected; failures/logs disclose no protected content |
| V02 capacity and replay | Fifth valid create succeeds, sixth fails safely; concurrent creates never exceed five; interrupt after creation but before acknowledgment/proof, and after receipt but before completed creation: retry has no duplicate effect or false success; distinguish valid replay, old command after receipt cleanup and explicitly new create under P03; deletion frees capacity and old replay cannot recreate or disclose deleted content |
| V03 fields and projection | Exact approved enums/projection; trimmed valid label; duplicate labels legal; invalid/unknown/free-text fields fail; no identity/name/revision/timestamps in model projection; name-bound edges follow P01 |
| V04 selection | New inactive; unconfirmed UI selection does not persist; confirmation atomically switches one Active; zero Active valid; competing confirmations use approved revision behavior |
| V05 edit/delete races | Stale edit/activation/delete cannot overwrite newer state; edit cannot recreate deleted Persona; deleting Active clears without fallback selection; repeats follow P03 |
| V06 saved UI state | Owner API/Firestore later read matches saved data; interleave set read with create/delete/activation: items, Active pointer and state revision stay coherent or fail safely under P02, never fabricated empty/zero-Active success; overview/management/edit/confirmation/Back follow approved UI; distinguish consent-limited M26 from Q31 failures; stale navigation/account replies cannot update the current view |
| V07 request snapshots | Start/admit a request, keep it queued, then edit/switch Persona before generation: preserve the start snapshot under P06; separately delete its used Persona while queued or generating: prevent persistence/delivery even if cancellation is late; a new request may use current default/Active state |
| V08 client/server cancellation | Separate local timeout, observed disconnect/cancel and actual model stop; A terminal, B accepted for the same user, then A's late cancel: B and its slot/deadline/output remain unaffected; verify original-operation/owner binding and repeated-terminal response under P05; no false cancellation acknowledgment or shared-client shutdown; persisted user message survives |
| V09 budgets and capacity | Original monotonic 60s spans all phases; nested 5s/45s budgets; wall-clock changes have no effect; one generation/two FIFO queue slots; same-user request rejected through post-generation commit/delivery until the true terminal boundary |
| V10 terminal and retry | Each slot released exactly once; uncertain generation termination keeps quarantine; shutdown queue cannot resume; timeout/abandon/deletion cannot save/deliver late output; explicit retry is fresh, never automatic |
| V11 producer minimization | Authorization before filtering/ranking; rejected/withdrawn consent never permits unauthorized Check-in input; exact seven-day boundaries, future records excluded, five after filtering, stable ties; withheld permission not empty success; IDs/provenance/raw documents/history/location excluded from model input |
| V12 output and fallback | Actual loaded-model tokenizer ceilings; strict raw UTF-8/JSON/schema checks; concrete semantic/adversarial policy; no repair/partial acceptance or synthetic Conversation failure message; safe explanation fallback only while deadline/authority permit; pre-acceptance capacity-fallback assertions await P06's explicit interpretation and must not invent acceptance or a fresh budget |
| V13 retention and deletion | Whole-Conversation deletion/expiry and source invalidation fail closed before cleanup; no resurrection; correct 90-day anchor/24-hour cleanup boundary; only allowed historical usage metadata; no retained processing copies |
| V14 regression and evidence | Existing Auth/Note/Interest/Event APIs, Home/See All request independence and non-AI 15s policy preserved; controlled failure does not kill non-AI features; no secret or private content in fixtures/logs/evidence |

Use Domain/Application fakes, adapter Port contracts, Fastify injection/OpenAPI agreement, then isolated Auth/Firestore Emulator tests for the approved first slice. Add widget/routing checks and approved Android saved-state evidence for the relevant surfaces. Synthetic timing/model tests precede separately authorized controlled-host model checks. Record actual commands, exact source, toolchain and Pass/Fail/Blocked/Not Run; do not add CI, packages, a model host or deployment solely from this plan.

## Preparation handoff

The [preparation record](../evidence/sprint3/2026-10-05-zhou-kickoff-preparation.md) maps the Issue acceptance items, the completed local self-check additions and document-only checks. The first four preparation items have artifacts; JIN's independent review remains the outstanding named Issue acceptance item. P01-P08 need not all be resolved to review the preparation packet: they gate their affected later implementation slices. JIN's independent review and LI acceptance have not occurred. The publication contains only this proposal and its evidence record; the associated PR identifies the submitted head and carries the review request and eventual disposition. Publication alone does not close Issue #49 or approve implementation.
