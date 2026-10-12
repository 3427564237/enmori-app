# ZHOU P05/P06 internal AI Application lifecycle — concrete contract candidate

Prepared 11 October 2026, SGT (UTC+08:00). Owner: ZHOU; independent reviewer: JIN; decision/acceptance owner: LI. **Proposal preparation only. Every new choice below is a recommendation awaiting LI's explicit scoped contract/assignment; no AI implementation is released by this document.**

This answers [LI's new #44 instruction](https://github.com/3427564237/enmori-app/issues/44#issuecomment-6106102758) to turn the existing input into one reviewable P05/P06 candidate. It does not resubmit the accepted #74 owner report or reopen Persona/final-gate acceptance. [LI's durable report acceptance](../decisions/2026-10-11-li-zhou-owner-report-acceptance.md), copied unchanged from `5370ceb28203a97975d111c9120a8436001165a0`, expressly withholds new AI implementation authority.

Candidate baseline: #74 `f5adfb8d59601d7fb663d2e1884a6f74ca6a858e`, on accepted #72 `0839c46b865bb6092020ad0ae77e17922ea40eb0`. The [October 5 alternatives](2026-10-05-s3-persona-ai-contract-proposal.md) and [October 11 decision inputs](2026-10-11-zhou-next-ai-decision-inputs.md) remain the prior proposal trail. This candidate narrows only the internal Conversation P05/P06 slice. It does not supersede an approved requirement or choose the outstanding public/client/physical contracts.

## Retained authority and exact proposed scope

[Q19](../decisions/2026-09-01-persona-conversation-lifecycle.md) fixes request-start Persona presentation, deletion revalidation, whole-Conversation deletion and minimized historical metadata. [Q31](../decisions/2026-09-02-qwen-runtime-failure-contract.md) fixes the single monotonic 60-second accepted-request budget, 5-second queue and 45-second generation sub-budgets, one generation/two queued requests, one non-terminal request per user, fresh explicit retries, no automatic retry or synthetic Conversation fallback, actual termination/quarantine, validation and fail-closed output. [Q17](../decisions/2026-09-01-recommendation-ai-field-allowlists.md) and [Q14](../decisions/2026-09-02-retention-logging-audit-policy.md) retain purpose/field minimization, one `asOf`, eligible seven-day/five-record context, request-only processing data and the 90-day retention anchor. [Backend architecture](../decisions/2026-09-01-backend-architecture.md) retains inner Ports, injected collaborators and existing toolchain/dependencies. None needs reapproval.

**Recommend one internal AI Conversation lifecycle slice:** evolve the existing [bounded runtime](../../backend/src/ai-runtime/application/bounded-ai-runtime.ts) and add its bounded Application composition, exercised only with synthetic trusted identity, a fake Qwen transport, fake purpose-authorized sources, a fake message store and a fake delivery sink. Existing parsing and unaffected runtime behavior remain subject to regression tests. No Fastify route, public DTO/error/header/identifier format, Firestore schema/index/transaction adapter, actual producer read, Flutter/UI/router edit, live model/configuration, deployment, new package or external execution is included. Recommendation explanation and its pre-acceptance capacity-fallback question are excluded from this Conversation slice.

This validates orchestration of checks and side-effect boundaries. Fake tokenizer/identity/semantic-policy decisions are explicit test inputs, not evidence of the loaded model, actual token counts, a production semantic classifier or Q31-E completion. Real producer consistency, data storage and network delivery need their later approved adapters/contracts.

## Recommended decisions for LI

The C identifiers below are candidate decision rows, not new product route/state IDs. Approve or amend these rows together with the bounded assignment; internal method names, handwritten fakes and ordinary test cases need no separate approval within that selection.

| Candidate | Single recommended choice | Applicable gate |
| --- | --- | --- |
| C01 | One authoritative lifecycle in the existing runtime/composition; candidate-ready is non-terminal and original deadline/user ownership continue through guarded commit and delivery. | P06 |
| C02 | One atomic synthetic admission/start event fixes acceptance order, original clock, user/host reservation and immutable source/Persona view before any queue wait. | P06 |
| C03 | Commit the user message once after lane admission and successful pre-generation input/authority checks, immediately before generation; do not write it on capacity rejection, queue expiry or failed pre-generation checks. | P05 |
| C04 | Distinguish duplicate dispatch of one internal command from explicit fresh generation retry. Retry a confirmed saved user message without appending it again; a confirmed uncommitted send becomes a new Send. Unknown effects must be fenced and resolved before retry. | P05 |
| C05 | Cancel via the original internal operation capability plus its trusted owner/session authority; repeated/terminal cancel is content-free and cannot target a later operation. | P05 |
| C06 | Guard commit and delivery separately at each actual fake side-effect event. A previously accepted, successfully committed message is not rolled back merely because later delivery fails; no post-terminal effect or late output is permitted. | P05/P06 |
| C07 | Preserve one-time terminal cleanup, separate model-lane quarantine, request-only disposal and source-bound non-content evidence. | P06/Q14 |

## P06 admission, capture and complete lifetime

### One start point, including queued work

1. The trusted Application boundary supplies verified synthetic caller/session authority. Validate the internal command envelope and prerequisite permission before accepting; untrusted body-supplied ownership is never authority. These are not actual Auth/account/P07 adapters.
2. In one non-yielding admission event, check dependency/capacity, reserve exactly the permitted user and queue/lane capacity, set `acceptedAt` from the monotonic clock, derive the sole `deadline = acceptedAt + 60s`, capture the synthetic authoritative UTC `asOf`, and freeze the request-start source/Active-Persona view. No request can observe a partially accepted state. If pre-acceptance checks reject, there is no slot, queued work, message write or generation. If an accepted capture cannot supply required authority, terminate that accepted operation safely under its original budget; do not fabricate zero Active/empty context.
3. For this fake-only slice, capture copies the source view at that exact event; it does not await a later mutable read. A deliberately delayed projection result must refer to that frozen view. Check-in selection, where included in a synthetic scenario, uses this single `asOf` and approved purpose-minimized projection. Source identities/provenance remain separate from model-facing input. No retained chat history is automatically appended.
4. Queue order and original sub-budget do not change. Queue expiry/cancellation removes the entry once. Input construction after lane acquisition uses only the captured view; it must never make the first Active-Persona lookup then. Post-start edit/switch applies to the next request. Permanent deletion/revocation still invalidates the protected commit/delivery boundary.
5. Every accepted phase consumes the original remaining budget. Generation receives `min(generationStartedAt + 45s, deadline)`; there is no second 60-second timeout or clock based on a delayed producer result. Monotonic enforcement and UTC retention timestamps remain separate.

This is an explicit consistency choice for synchronous synthetic producers, not a proposed distributed transaction, database lock or real-reader snapshot mechanism. A future real adapter must supply an approved consistent start-view contract; a current-state read performed after queueing cannot satisfy it by analogy. Slow real capture is not silently placed outside the accepted budget.

### Evolve the existing component rather than adding a second scheduler

The current `submit` creates one timer/user entry, `prepare` runs after obtaining the lane, and `finish` clears the timer/user entry before resolving the structural candidate. Its [documented `checkCandidate` hook](../../backend/src/ai-runtime/README.md) must not persist or deliver as a side effect. Appending `outcome.then(persist)` would move work beyond that lifetime.

Recommend explicit internal start-capture, pre-generation message-commit, post-validation assistant-commit and pre-delivery phases owned by that same runtime lifecycle. Candidate-ready only advances the internal phase; it is not public completion. Keep the existing validation checkpoint free of persistence/delivery side effects; the new explicit phases carry those responsibilities. Preserve one scheduler and host/user registry for old and new internal callers, not independent instances whose combined capacity exceeds Q31. Existing component-only callers remain on their original bounded path through the same shared capacity owner; their success remains a structural candidate.

Once generation actually starts, the generation lane is released only when transport settlement confirms actual termination; it may then serve a different user while the first user's Application checks/commit/delivery continue. If preparation or user-message commit fails, is uncertain, or is cancelled before generation starts, release the reserved lane immediately at Application terminal: there is no invocation to quarantine or settlement to wait for. The original user's slot and deadline otherwise remain until Application terminal. Same-user B is rejected while A is validating, committing or awaiting guarded delivery even if the generation lane is free. All callbacks check the same operation identity and terminal fence.

## P05 user message, duplicate dispatch and explicit retry

### Exact proposed write point

After successful capture and any queue wait, build the approved input and complete required pre-generation fake authority, identity/token-budget and availability checks. Immediately before calling generation, perform one guarded user-message commit through the fake store. The commit linearization event checks operation liveness/deadline, current trusted authority and owned live/unexpired Conversation; a failed or unknown commit must not start generation.

After an asynchronous commit acknowledgment or retry-target confirmation, check the same operation fence, `now < original deadline` and current applicable authority again at the actual model-dispatch event. A user commit is not unconditional permission to generate. Cancellation, expiry, deletion or revocation in that intervening window leaves any already committed user message under its normal lifecycle but makes zero model calls and releases the unused lane at terminal.

The successful user write advances `lastPersistedMessageAt` using authoritative UTC. Capacity rejection, queue expiry, pre-generation rejection and confirmed non-commit do not. Once written, the user message survives generation failure, cancellation or timeout under Q31 and normal Conversation deletion/expiry. These failures create no assistant message and do not independently change the retention anchor. A fake store models these logical effects without choosing any physical record fields, paths, index or scheduler.

The fake store's message effect, its authoritative effect observation and anchor update share one logical commit event: neither a success proof without a message nor a message without its duplicate-effect observation is permitted. This is a proposed internal Port guarantee, not a new persistent operation/receipt record. A Retry that reuses a confirmed saved user message skips the new-user commit and revalidates that target before generation; it does not restamp the message.

### Internal command identity and retry outcomes

The Application creates a request-local immutable command/capability; it is not a public request ID, correlation ID, persisted operation entity or a new idempotency header. Repeated dispatch of that same command returns the same operation observation and never accepts again or writes/generates again. It cannot be supplied a replacement body. An invalidated terminal capability returns only non-content terminal observation, never a cached user/model message or a replayed response. An intentionally new Send is distinct even when its text is identical; content equality is not identity.

| Original result / action | Recommended behavior of the next action |
| --- | --- |
| Original operation still non-terminal | Observe/cancel that operation; reject another same-user acceptance. Do not start a parallel retry. |
| User commit definitely did not happen | A new explicit Send supplies current input and creates a fresh operation. No old text/fingerprint is retained to compare or resume. |
| User commit confirmed; operation terminal with no accepted assistant commit | A new explicit Retry references the still-owned/live saved user message and supplies the current input explicitly. Verify exact text equality against that saved user message; mismatch is not a retry and has no write/generation effect. Use the explicitly supplied current input for the model, not automatic historical-message injection. Do not append the user message or advance its retention timestamp again. |
| Previous commit or delivery result uncertain | First revoke/fence the old operation's ability to perform any future store/delivery effect, then obtain authoritative fake-store effect readback. Absence before that fence is insufficient. Until committed/not-committed and accepted-assistant status are resolved, return non-content unavailable/uncertain observation and perform no retry generation/write. No automatic retry or timer restart. |
| Accepted assistant commit already exists, including uncertain later delivery | Do not generate another assistant or append another user message through Retry. Existing-message retrieval/regeneration UI/API is outside this slice. |
| Conversation, saved user message or required authority deleted/expired/unavailable | Reject retry without reconstructing content, reviving an entity, extending retention or substituting another Conversation. |

Every permitted Retry is a new Q31 application request: new operation capability, current authorization/start snapshot/`asOf`, fresh capacity decision and one new 60-second deadline. It never reuses the old model result, old Persona projection or old deadline. The new retry must atomically establish eligibility before generation; repeated dispatch of its own handle still has one effect. Ordinary terminal handles do not retain text, projection, raw output or a replay cache. The fake store reads only the explicit saved-user target and required authority; no public history/recovery endpoint is introduced.

The Application observation handle must not expose or retain the existing content-bearing `RuntimeRequest.outcome` promise as a reusable response. Deliver authorized content once through the guarded sink, then release processing/candidate references. A retained old cancellation handle provides only non-content control/terminal observation; it cannot recover deleted or previously delivered output.

This internal choice does not claim network retry safety across lost handles, process restart, multiple hosts or actual storage. Public command identity, durable duplicate-effect proof, lost-ack recovery, identifier shape, exact errors and physical retention are later P05 contracts. Pending write callbacks must lose their commit authority at terminal; a Port that can commit after that fence is unsuitable for this slice. Returning from a local timeout or observing an empty read alone is not proof of that guarantee.

### Cancellation stays bound to its original operation

Only the trusted owner/session authority associated with operation A may invoke A's internal cancellation capability. A fresh same-UID session is not silently the old session. Foreign/invalid capabilities return a non-content rejection without protected existence information. This selects no public cancel endpoint or bearer credential.

- First valid cancel while A is non-terminal makes A terminal, fences future effects, disposes request-only data and asks its actual generation to stop. It does not claim model termination until the transport confirms it.
- Repeated cancel or cancel after A's terminal state is a no-op with content-free terminal observation. It never rolls back already committed messages, extends a deadline, captures new context or launches another generation.
- If A finishes, B starts, and A's late cancel arrives, it addresses A only. B's timer, user slot, generation, commit and delivery remain unchanged. A user key or Conversation key alone is not a cancellation target.
- Observed disconnect makes the request `abandoned`; deadline has priority whenever monotonic `now >= deadline`. No late failure payload is delivered for terminal abandonment, timeout or stale/deleted authority. There is no shared-client shutdown involved in this internal contract.

## Commit, delivery and terminal races

Use explicit fake-store and fake-sink side-effect linearization events. Immediately at each event, atomically test the original operation/terminal fence, the original monotonic deadline and the current applicable owner/purpose/source/Conversation/Persona authority. A check before an awaited write followed by another check after it is not atomic protection. The fake should support barriers before and after the actual effect so tests can demonstrate ordering.

Assistant commit requires complete valid output plus a passing explicit fake semantic-policy decision and current authority. Persist only the accepted normalized assistant message, approved historical presentation metadata and necessary minimized provenance. No raw prompt/response, Persona ID/name/projection, rejected text or retained processing copy is created. Successful commit alone advances the Q14 anchor; later delivery/metadata/failure does not.

| Event ordering | Required proposed observation |
| --- | --- |
| Cancellation/deadline/deletion wins before commit effect | No assistant commit, no assistant delivery and no assistant-based anchor advance. |
| Valid assistant commit wins; cancellation/timeout occurs before delivery | Preserve the already accepted committed message under its ordinary lifecycle; suppress delivery and all new effects. Do not claim commit never happened or add unapproved individual-message rollback. Retry cannot generate a second accepted assistant for that saved user message. |
| Persona deletion occurs after valid commit but before delivery | No delivery. Retained historical message follows Q19: Persona deletion does not retroactively rewrite it. Conversation deletion instead removes its messages; source invalidation applies the existing Q19 unavailable-message rule. |
| Authority valid at commit but revoked/deleted/expired before sink event | Sink denies the output; earlier commit is handled by the applicable existing deletion/source/retention rule. A previously successful check is not a delivery permission. |
| Guarded sink acceptance wins before a later cancel | Mark Application success and release its user slot exactly once in the same lifecycle transition. Late cancel is a no-op. Fake sink acceptance is only test-local handoff, not proof that a client displayed network bytes. |
| Fake sink refuses/fails before acceptance | Terminal non-content failure/abandonment as applicable, no later send. Record actual commit effect separately; never regenerate or misreport it as an uncommitted operation. |

An accepted and committed assistant message is distinct from a merely parsed candidate and from successful delivery. Proposed C06 asks LI to approve the above write-outcome behavior within unchanged Q19/Q31; public unknown-outcome copy/recovery and real transactional/network realization would remain separately gated.

Cancellation during active generation releases Application ownership at terminal but quarantines the generation lane until [GenerationTransport](../../backend/src/ai-runtime/ports/generation-transport.ts) confirms actual stop. A local abort does not prove stop. Non-AI liveness remains independent. Shutdown permanently discards queued work and fences pending side effects; nothing resumes after restart. Cleanup may await actual resource termination but cannot reopen Application work or retain prompt/output for later use. Fakes dispose processing references at terminal and retain only committed message data under its modeled lifecycle, plus the minimum non-content control state required for pending cleanup; no durable operation receipt is added.

## Bounded acceptance cases — planned, not executed

All LC cases below belong only to the proposed internal fake-Port slice. They become the selected acceptance set if LI confirms the assignment. Existing source tests are regression inputs, not evidence that these new cases already pass.

| Case | Controlled ordering / assertion |
| --- | --- |
| LC01 admission | Invalid synthetic caller/authority and capacity/dependency rejection create no accepted request, slot, write or model call; verify one active/two queued and one same-user non-terminal across both existing/new internal entry paths. |
| LC02 capture | Accept while queued, change Active/edit old Persona, then resolve delayed input: old immutable start projection is used; a later request sees the new state. Start with zero Active then activate while queued: original request keeps default presentation. Failed required read is not default/empty success. |
| LC03 delete/revoke | Delete used Persona or Conversation, expire Conversation, or revoke required purpose/source while queued/generating: no protected later commit/delivery; no substitution, restoration or content leak. Deleting an unrelated Persona or editing the used Persona alone must not spuriously invalidate the request. |
| LC04 time | Fake monotonic time demonstrates unchanged 60/5/45 limits, exact-boundary rejection, no restarted deadline after delayed capture/write/check/sink, and immunity to UTC clock correction. |
| LC05 user write | First success has exactly one user commit, one model call, one accepted assistant commit and one guarded delivery. Capacity/queue/pre-generation failures write nothing. Generation requires a confirmed user commit or valid retry target plus a live model-dispatch guard. Insert cancellation/deadline/revocation after commit but before dispatch: user commit remains, zero model calls. Write/proof/anchor change atomically; only actual message commits advance the anchor. |
| LC06 duplicate | Re-dispatch the same command before/after its terminal outcome: at most one admission, user write and model invocation; no content replay. A distinct explicit Send remains distinct despite equal text. |
| LC07 fresh retry | Retry confirmed saved user input only after terminal/no accepted assistant; no duplicate user write or retention extension, but new snapshot/authority/`asOf`/deadline and model call. Changed input or deleted/expired target is rejected. Confirmed uncommitted original requires new Send. |
| LC08 uncertainty fence | Pause an old store effect, simulate unknown acknowledgment and attempt retry. No retry until old effect rights are fenced and authoritative readback resolves commit/assistant status. A late old callback cannot commit after the fence, duplicate a user message or bypass terminal. |
| LC09 cancel identity | A terminal, B accepted for same user, then delayed/repeated cancel A: B unaffected. Foreign/invalid/fresh-session capability cannot cancel A; cancellation observation never falsely claims model stop. |
| LC10 full lifetime | Hold candidate validation, commit or sink before terminal: same-user B rejected despite free generation lane; another user may use the lane after confirmed stop. No independent scheduler exceeds aggregate capacity. |
| LC11 terminal commit | Place barriers immediately around assistant side effects: deadline/cancel/delete before commit gives no write; valid commit then disconnect/timeout leaves only the earlier accepted message and no delivery/retry regeneration. |
| LC12 delivery authority | Delete/revoke/expire between commit and sink event: no delivery, correct existing historical/Conversation/source lifecycle, no retroactive success or individual-message rollback. Sink failure cannot become a late send. |
| LC13 termination | Abort an actual generation while fake transport refuses to settle: quarantine remains and no new generation is admitted; confirmed stop alone releases lane. Separately fail/cancel/leave user commit uncertain before generation: terminal immediately releases reserved lane, with zero transport calls and no fabricated quarantine. Terminal callbacks/cleanup release each slot once. |
| LC14 output gates | Malformed/raw duplicate-key output rejected by real existing parser; injected unsafe/ambiguous/stale-policy decisions fail before commit. No automatic Qwen retry, synthetic Conversation fallback or invalid-output fragment. Fake token/identity outcomes are not actual model evidence. |
| LC15 disposal | Capture sink/store/log calls: no processing content in operational evidence, no retained old snapshot/raw output/replay body, permitted metadata/provenance only; shutdown discards queues and late callbacks cannot revive them. |
| LC16 compatibility | Existing strict Backend build and affected/full Backend test command pass on the new source; existing component-only runtime cases retain semantics. No Bootstrap/API/schema/dependency/Flutter change. No new Emulator, device or live-host pass is claimed. |

Use handwritten fakes and deterministic barriers/clocks under the pinned repository test runner; no new tooling or dependency. The owner evidence must identify the tested source, commands, actual case results and failed/Not Run history. JIN independently reviews new code/evidence; LI accepts the selected scope. Any later final combined source needs its appropriate affected regression evidence, not reuse of an older approval.

## Remaining mappings and follow-on boundaries

| Original mapping | Current delivered boundary | What remains and responsible decision |
| --- | --- | --- |
| M26 `ai-assistant` (30), NS35–NS37 | Accepted S2 internal runtime exists; no delivered public Conversation operation/page. This candidate adds no implementation. | LI selects C01–C07 and a bounded task; ZHOU then implements/test-proves internal composition with JIN review. Public HTTP/Firestore, real context and client/UI remain their affected P05/P07/P04/M26 decisions. |
| M26 `ai-limited` (32) | Consent/authority-limited state remains accounted for, separate from runtime errors. | LI/producer owners confirm actual purpose/consent/revocation mapping and M26 presentation before the relevant adapters/UI. Fake authority outcomes cannot release real reads or copy. |
| M27 `ai-safety` (31) | Prototype/evidence-only surface disposition retained. | LI selects whether/where production safety content belongs; no new NS ID or standalone page is assumed. It does not block approval of this internal slice. |

M23–M25, their P08 behavior, #73 final gate and #74 owner report are already accepted. They are not pending items in this candidate. Controlled Qwen host identity/tokenizer/configuration/execution and Recommendation-specific fallback retain their independent gates. No new all-AI or whole-Sprint completion claim is made.

## Delivery and SGT timing

The next concrete artifact is this single C01–C07/LC01–LC16 candidate and its local preparation/readback receipt, produced on 11 October. The exact completion timestamp and local commit are recorded in `D:/3851 AI/formal/evidence/2026-10-11-zhou-ai-lifecycle-proposal-receipt.json`; raw reads/check scripts are separate in `D:/3851 AI/drafts/2026-10-11-zhou-ai-lifecycle-proposal`. Publication is withheld by the user's current instruction.

No trusted product-completion SGT ETA is available before LI confirms this concrete contract/assignment. After that decision, estimate the selected lifecycle changes, fake-store/sink fencing and LC tests, regression fixes, then independent review/acceptance separately; reviewer availability is not an owner-controlled duration. The candidate supplies that bounded estimating basis, not a fabricated duration or due date. Completing the proposed internal slice would still not deliver both M26 routes or M27. As of this checkpoint, complete remaining M26/M27 acceptance on 11 October is not supported; the original target is neither silently changed nor declared achieved.
