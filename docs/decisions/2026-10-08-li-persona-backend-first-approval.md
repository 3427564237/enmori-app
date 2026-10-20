# LI approval — Persona Backend-only first delivery

- **Source ID:** S-PM-1008-LI-PERSONA-BACKEND-FIRST
- **Status:** Confirmed PM decision; implementation authorized only within the exact scope and task boundary below. Product acceptance remains pending.
- **Date and authority:** 8 October 2026, Asia/Singapore; LI HOURUI, ENMORI PM.
- **Confirmation:** LI replied `a` to the [reviewable A/B/C packet](../planning/2026-10-08-li-persona-pm-decision-preview.md) and the stated publication package in this chat. This records the actual choice, not an inferred PM selection.
- **Selected delivery:** A — Backend-only first; approve P01–P03 and the Backend activation/isolation conditions unchanged at the exact candidate below. Withhold applicable P08 and Flutter/shared-client/Home/router implementation.
- **Exact candidate:** [PR #60](https://github.com/3427564237/enmori-app/pull/60), `55fa4a7ab77b32b08d300d391ebee4293ad6f963`; [controlling contract text](https://github.com/3427564237/enmori-app/blob/55fa4a7ab77b32b08d300d391ebee4293ad6f963/docs/planning/2026-10-07-zhou-persona-first-contract-delta.md).
- **Independent technical review:** [JIN Approve, review 5444262472](https://github.com/3427564237/enmori-app/pull/60#pullrequestreview-5444262472), same exact candidate head; documentation/source review only. It does not approve future implementation or supply runtime evidence.
- **Publication baseline:** remote main `f46a903cb5b339365ac2024004b32b7b96b99e7c`; refreshed #60 Open/Draft at the reviewed head before recording this decision.

## Exact selection and applicability

Approve all Backend-specific choices of P01–P03 and the candidate's Backend activation/isolation conditions by immutable reference. The complete candidate controls exact paths, schemas, field allowlists, limits, transaction/read ordering, statuses/errors, replay rules and verification requirements; the summaries below do not replace it. No approved deviation from that Backend candidate is introduced.

| Gate | Confirmed disposition | Approved tradeoff and boundary |
| --- | --- | --- |
| P01 | Approve six authenticated owner operations, the four editable structured fields, exact DTOs/error/status mapping, current verified UID-to-Account authority, 4096-byte mutation-body limit, 1–50 Unicode scalar name rule and canonical create key. Approve the complete at-most-five set read as a Persona-only exception to the architecture's collection pagination default. Management itself introduces no new optional-AI consent gate. | No foreign-owner/Admin bypass, generalized pagination exception or AI-use consent authority. The candidate's bodyless DELETE 204 and strict activation ID validation are approved HTTP requirements; they do not authorize adapting the Flutter client. |
| P02 | Approve the exact live and owner-state records at `accounts/{accountId}/personas/{personaId}` and `accounts/{accountId}/persona_state/current`, coherent transactional reads, monotonic owner revisions on effective changes, target preconditions, revision-before-no-op ordering and validated absent-target repeat-delete 204 exception. | Accept owner-level conflicts for at most five live items. Missing/malformed/orphan state fails closed. No request-time initialization/repair, Account-field addition, index, migration, TTL or retained deleted content. No overflow wrap/reset. |
| P03 | Approve the full SHA-256 derived Persona ID from the exact account/expected-owner-revision/canonical-key tuple, atomic creation plus owner-state advance, and state-conditioned replay of only an unchanged latest creation. Replay precedes capacity; normalized-input conflict is 409; a later effective owner mutation closes replay with 412. | No receipt, stored fingerprint, cleanup service or time-window promise. Accept lost recovery after a subsequent mutation. Valid no-ops preserve replay; old commands cannot recreate deleted content. A structurally valid out-of-band rollback is outside the detection guarantee. |
| Applicable P08 | **Withheld.** M23–M25 forms/copy/states, NS31–NS34, session/page/command handling, create late-completion observation, shared-client adaptations, Home and router remain proposed. | Backend completion supplies no Flutter/UI/Android acceptance. This decision does not approve a separate client adaptation task or detailed/global Q04 visual acceptance. |

The candidate's client recovery and late-result sections remain future client requirements subject to P08 or a separately explicit client task. They are not implementation scope for this Backend-only task. P04–P07, M26 Conversation/consent states, M27 safety, producer integration, recommendation changes and live Qwen remain separately gated.

## Isolation and provisioning boundary

Use only the existing isolated Auth/Firestore Emulator runner/configuration, with explicitly initialized synthetic completed Accounts, trusted bindings and initial Persona owner states. Before Firebase service initialization or listening, validate the actual child-process environment and pass that same validated environment to adapters and composition. Missing, partial or invalid requested isolation fails closed before use; runtime Emulator failure does not fall back to cloud or another store.

Register all six operations only in the approved isolated composition. Ordinary and controlled-demo compositions omit them; demonstrate direct unregistered-route outcomes without Persona handler/adapter calls. A Flutter flag is not Backend authorization. Requests never provision, reset or repair state. Settle outstanding transports and end the old session before fixture cleanup; a later run uses fresh Account partitions instead of resetting an addressable owner state.

Real-account provisioning, account lifecycle/migration, demonstration/production enablement, cloud access, new dependencies, model installation or model execution are not authorized. Retain the existing pinned stack and repository Ports architecture; use no second service or isolation mechanism.

## Authority and precise supersession

- [Q19](2026-09-01-persona-conversation-lifecycle.md) remains controlling: owner-private, at most five live, inactive creation, duplicate names, explicit sole activation, zero Active, permanent deletion with no replacement, Trash or Restore. Later AI request-start snapshots and deletion revalidation still require their separately approved integration/evidence.
- [Q17](2026-09-01-recommendation-ai-field-allowlists.md), as completed by Q19, and [Q14](2026-09-02-retention-logging-audit-policy.md) remain unchanged. No model call, unauthorized projection, secondary content copy or content-bearing log follows from this decision.
- [Backend architecture](2026-09-01-backend-architecture.md) remains controlling. The only selected exception is P01's bounded Persona whole-set read; no broader architecture or collection-pagination change is approved.
- Preserve [the original accepted proposal](../planning/2026-10-05-s3-persona-ai-contract-proposal.md) and [#49 preparation acceptance](2026-10-05-zhou-preparation-acceptance-approval.md). Their preparation-only acceptance is unchanged. This new decision resolves only P01–P03 and the selected Backend isolation scope for the pinned #60 candidate; earlier Pending observations for those choices are historical. P08 and P04–P07 remain unapproved.
- Preserve the new #60 proposal, exact-head JIN review and the [A/B/C preview](../planning/2026-10-08-li-persona-pm-decision-preview.md). The preview's Proposed/awaiting-selection wording describes its pre-confirmation snapshot; this confirmed record controls the selected scope. JIN did not review this subsequent PM record or any absent product code.

This is a PM physical-contract and bounded delivery decision within PM scope, not a Sponsor/Supervisor decision or evidence of implementation. It removes no higher-authority obligation. Material departures require a precise new decision delta and applicable independent review; unchanged approved choices need no repeated PM approval.

## Bounded implementation task and evidence

A separately published bounded implementation Issue must cite this decision at its publication commit and the immutable candidate before coding. **Owner:** ZHOU YAOYIN (`YaoyinZhou3922`). **Independent implementation reviewer:** JIN ZIHAN (`chuxi12483468`). LI retains scoped acceptance. Use the existing Backend development workflow and approved source hierarchy.

Implementation includes only normative OpenAPI, Domain/Application/Ports, transport/error mapping, transactional persistence/replay, isolated Backend composition and fixtures. Flutter/shared client/Home/router are outside this task.

Required evidence is **PC01–PC10 and PC14's Backend portion** at the submitted implementation head:

- Domain/Application fakes and Port contract checks;
- Fastify injection and normative OpenAPI/error/route agreement;
- direct ordinary/controlled-demo composition exclusion and invalid-isolation/guard checks;
- actual isolated Auth/Firestore Emulator authority, integrity, transactions, races, interruption, capacity, replay/no-op/delete, overflow/corruption and fixture-boundary evidence;
- measured eight/nine logical-get ceiling per transaction attempt, with retries documented separately rather than inferred as billing/runtime proof;
- applicable Backend regression and privacy checks, with source head, pinned toolchain, actual environment, commands and Pass/Fail/Blocked/Not Run.

Missing or failed required Backend checks block Backend acceptance. **PC11–PC13 and client PC14 remain Not Run / outside this delivery**, not passed. Do not require them to close evidenced Backend scope or imply that their future UI obligations disappeared. Submit one focused new-code/evidence PR and obtain JIN's independent review of its exact head before scoped acceptance/merge under the applicable gates.

## Publication authority and retained status

LI's A confirmation also authorizes this prepared PM action package: persist and commit/push the PM documentation on a separate `souma/` branch; publish a documentation PR; publish the scoped approval comment on #60; and create the bounded implementation Issue assigned to ZHOU with JIN review, citing this durable decision. The new Issue is an implementation task, not acceptance of delivered code. Publishing the decision is not contingent on merging the unchanged candidate.

Keep #60 Draft/Open; no merge is included. Keep #49 Closed/preparation Done and #44 Open/Backlog. No Project status change, Issue completion transition, product coding/runtime execution, provider permission, real-account enablement, full Persona/Friend/Event acceptance, Sprint/UAT/Release acceptance is included in this PM execution package. New product checks remain Not Run until actually executed.

## Delivery target and feasibility

A prioritizes the next Backend increment. It does not amend the 11 October 2026 boundary, cancel M23–M25, or silently reduce the six ZHOU routes / 42-route / 38-state overall target. Full six-route feasibility remains **not established**. ZHOU must report actual Backend expected delivery, verified progress/evidence and unfinished mappings/feasibility. LI will make a separate explicit scope/priority resolution if the original target cannot be met. No hours, Points, completion date or full-module completion is invented here.
