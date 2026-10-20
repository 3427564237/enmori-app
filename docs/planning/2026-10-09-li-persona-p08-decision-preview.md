# LI Persona P08 scope selection preview

Date: 9 October 2026, Asia/Singapore. **Status: Proposed; awaiting LI's explicit choice. This is not an implementation or acceptance decision.**

The user supplied ZHOU's progress update. [Draft checklist #67](https://github.com/3427564237/enmori-app/pull/67) is verified at `15ab5099078a3f411c285a5b0cd6af4d532abc89`, base `f46a903cb5b339365ac2024004b32b7b96b99e7c`, with one English document added and no product delta. LI and JIN are requested reviewers; no formal review is currently present. The checklist is a status/decision request, not new product authority.

The exact controlling implementation candidate remains [P08 at #60 head 55fa4a7](https://github.com/3427564237/enmori-app/blob/55fa4a7ab77b32b08d300d391ebee4293ad6f963/docs/planning/2026-10-07-zhou-persona-first-contract-delta.md). The accepted Backend is #65 `885dbcc87fe8574265014eb4305c49fc0950daa3`, under [LI's P01–P03 selection](https://github.com/3427564237/enmori-app/blob/b5f3dbef6d5a04d35c30369efe2b9a4a66075a22/docs/decisions/2026-10-08-li-persona-backend-first-approval.md) and [component acceptance](../decisions/2026-10-09-li-persona-backend-component-acceptance.md). Its acceptance is unchanged.

## Reviewable choices

| Choice | Exact scope selected | Acceptance and delivery consequence |
| --- | --- | --- |
| **A — recommended: full isolated Persona management** | Select unchanged applicable P08 for M23–M25 / NS31–NS34: overview, management, Create/Edit form, the candidate's controls/defaults/copy, client transport adaptation, session command/revision handling and isolated Home/router handoff. Resolve Q04-DEV-17–19 and only the expressly used SP-01/03/04/05/10/12 behaviors by reference to this exact candidate | Deliver one usable isolated flow with PC11–PC13 and client PC14, including actual two-owner Android/Backend/persistence evidence. No additional AI/Conversation decision is needed for Persona-only work. Missing Android evidence prevents UI acceptance; it does not undo Backend acceptance |
| B — client adaptation only | Select only the candidate's operation-specific status/body/error adaptation and Persona-create transport completion/deadline/context checks. No pages, Home/router entries or general Persona session-management UI | Deliver a bounded transport increment. Require exact statuses, bodyless DELETE only, typed errors and the candidate's real-client delayed-token/header/body, no-late-dispatch, deadline, context-ended and one-terminal-completion controls, plus existing-client regressions. Full PC11–PC13, collection/session/page state and route acceptance remain Not Run; no product route completion follows |
| C — amend or hold | Identify the specific candidate rows/copy/ownership to change, or keep P08 withheld | Only affected client work waits; Backend acceptance, source history and unchanged independent work remain valid. No automatic cancellation or deadline change |

All candidate details are selected by immutable reference, not replaced by this summary. A material amendment requires a precise delta and applicable review, not a silent reinterpretation. Neither option A nor B approves new libraries, Backend API/data changes, real-user/demo enablement or a new architecture.

## Exact A package

- Surfaces: `/personas`, `/personas/manage`, `/personas/new`, `/personas/{personaId}/edit`, mapped to M23–M25 and NS31–NS34. Use the existing application's widgets. This selects functional controls/states/copy only; global Q04, detailed visual comparisons and unrelated shared styles remain pending.
- Form: Name, Tone, Response length, Format only; create defaults blank name and neutral/balanced/plain. New creation is inactive; duplicate names are allowed. Local selection/Back/cancel performs no activation; explicit confirmation activates. Confirm permanent deletion, including Active, without selecting a replacement. Exact confirmations/error/recovery copy is the pinned candidate's table.
- Recovery: retain an uncertain create's exact command in the current session; 412 closes retries without proving original failure. A matching valid late 200/201 may settle it. Independent rereads confirm current state; highest observed owner stateRevision prevents known regression. Session/owner/command/attempt and page lifetime remain distinct; same-UID relogin rejects prior-session results. No automatic retry, cross-restart recovery or persistent queue is introduced.
- Client: preserve one 15-second non-AI foreground budget; no dispatch after late token acquisition or ended context. Accept operation-specific statuses and only the approved DELETE's bodyless 204. Persona-create late completion is separate from caller timeout, with one terminal completion per attempt. Existing callers retain their current one-result behavior.
- Isolation: Backend stays guarded synthetic Emulator-only. Register new Home entry/routes only in approved isolated test composition; normal builds omit them. Client flags are not Backend authorization. Fixture initialization/cleanup remains controlled and uses synthetic identities.
- Evidence: PC11/PC12 and client PC14 unit/repository/controller/widget/router/client regressions, plus PC13 actual Android create → independent read → edit → activate → delete Active → reread and two-owner isolation. Use exact head, approved pins, actual environment and explicit Pass/Fail/Not Run. An HTTP fake or page route alone is not Android persistence evidence.

## Ownership and review after selection

ZHOU owns the approved client adaptation, Persona Repository/session state/pages and relevant tests. LI owns shared Home/router assembly and enablement using the feature handoff. Keep these responsibilities within one focused implementation/evidence package rather than requiring separate file reviews.

JIN reviews ZHOU's new implementation and #67's source/acceptance consistency. DU independently reviews LI-authored Home/router changes through the existing LI→DU reviewer path; no author self-approves. JIN owns any later cross-feature combined gate and LI reviews that gate independently. Earlier Backend or proposal reviews do not approve absent client code, but unchanged P01–P03 do not need repeated review.

After a choice, persist the actual decision under `docs/decisions/`, citing this preview, #67, the exact #60 candidate and retained Q19/Q17/Q14/architecture/Q04 history. Publish one bounded implementation Issue assigned to ZHOU with LI shared integration and the reviewer/test boundaries above, and publish the scoped handoff. JIN's requested #67 consistency review is still required before the selected unchanged client implementation is released to work; a review finding holds only affected behavior. No claim of JIN approval is made in advance.

Choosing A or B also approves that bounded decision/task/publication package, with no merge or Project/Issue completion transition. It does not request new product implementation by this LI session before the assigned task and applicable review gate exist.

## Independent gates and retained target

P04–P07, M26 ai-assistant/ai-limited, M27 ai-safety, public AI/Conversation/storage/deletion/retention, authorized context producers and live-model/host scope remain pending. Preserve all six original ZHOU mappings and NS31–NS37; this proposal selects the next increment, not a cancellation or silent deferral of the remainder. Those affected behaviors need their own exact contract proposals and competent choices.

#64 `899fa9b` still has one R2 alias correction pending; R1/R3 are cleared. The existing three-component combined tree/gate remains Not Run until DU's next reviewed head and LI's concrete candidate. That is not a global blocker for independently approved Persona-only client work against accepted #65. Event rights/access remain separate.

No fixed completion time is invented. ZHOU must give an actual SGT ETA after the selected scope, shared integration and Android conditions are known. 11 October, 42 routes and 38 state groups remain the original target; overall on-time completion and full modules/Sprint/UAT/Release acceptance are not established.

## Why LI's choice is needed

[The existing approval](https://github.com/3427564237/enmori-app/blob/b5f3dbef6d5a04d35c30369efe2b9a4a66075a22/docs/decisions/2026-10-08-li-persona-backend-first-approval.md) expressly says **“Applicable P08 — Withheld”**. #63 likewise states **“No client adaptation or UI/Android acceptance is authorized”** for its Backend task. Repository AGENTS.md requires a confirmed PM decision to be persisted before reuse. The progress message and preparation checklist supply no new LI selection. This is a new scope choice; it is not a request to reconfirm accepted Backend work.
