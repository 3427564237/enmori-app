# Consolidated decisions and evidence gaps — 14 October 2026

Prepared for human LI's request to decide needed matters together. Human LI
subsequently selected **D1-A** and **synthetic Event interaction for now**.
[The durable exact decision](../decisions/2026-10-14-li-controlled-qwen-and-synthetic-event-selection.md)
controls; alternatives below retain the choice trail. Already approved
persistence work proceeds now.

## One proposed scope extension requiring an explicit choice

**D1 — real Qwen in the next isolated test, after the persistence vertical works.**

| Choice | Exact reviewable scope and consequence |
| --- | --- |
| **A — permit bounded local real-model integration (selected)** | Extend the existing synthetic Auth/Firestore/Note-only slice to connect its completed real reader/store/control/HTTP chain to the approved Backend Qwen/Ollama Adapter boundary on a controlled host. Use only synthetic accounts/Notes and a privately configured local/controlled endpoint; no public model endpoint, real accounts, ordinary app enablement or cloud. Qwen3.5-9B remains the sole Release-acceptance model; Qwen3.5-4B is permitted only as an explicitly manually selected development run, separately labelled, never automatic failover or9B evidence. Reuse the existing approved/locked stack and already provisioned model/tokenizer; no new dependency, model download/install, host exposure or deployment selected. Before execution bind actual host/endpoint isolation, resolved model/manifest digest and matching tokenizer, Q17 projection, Q31 8192/4096/512 ceilings and60/5/45 budget, structured/semantic output checks, single generation/queue limits and cleanup. If any prerequisite is absent, return the exact missing fact; do not guess a tokenizer or skip semantic checks. Existing fake-Qwen persistence delivery remains independently due. |
| **B — retain fake Qwen for this target** | Finish the actual controlled Auth→Backend→Firestore→client and complete cleanup with fake Qwen. Keep E02 real host/model/tokenizer integration unselected for a later exact packet. This does not allow synthetic content to be presented as a real-model response. |

Authority reason: [AGENTS.md](../../AGENTS.md) requires “Do not make a major
architecture, backend, data-model, dependency, or infrastructure decision without
explicit approval.” The existing first isolated release expressly selects fake
Qwen; its approval cannot silently enable a live model. Q31 defines model rules
but does not establish that the actual host/tokenizer/adapter is ready. This
question is a concrete scope extension, not a new vote on N02/F03/R-A/C-A.
The actual human choice is now persisted in the linked decision before execution.

Correction preserved: the original question/preview said “existing Backend
Qwen/Ollama Adapter”. Source review found the approved Port/architecture but no
concrete adapter in #99. “Approved ... boundary” above corrects readiness wording,
not the selected model/environment restrictions. JIN owns the missing adapter
implementation within that boundary and locked stack; unsupported host/model/
tokenizer or a needed new dependency is a reported prerequisite, not authority
to install or substitute it. Human LI was informed of this correction.

## Already approved — no new answer needed

| Area | Existing authority / current action |
| --- | --- |
| AI six HTTP operations, identity, budgets, mobile recovery | [conditional-A](../decisions/2026-10-12-li-isolated-note-conversation-conditional-a.md), incorporated fixed #81 N01/N04–N07/F02; implement exact selected operations/OpenAPI, no extra receipt or recovery queue |
| Atomic effects, terminal/Auth ordering, late expiry, physical fields/index declarations, fixed context/consent/provenance, full cleanup | [F01 choices](../decisions/2026-10-13-li-delegated-f01-b-c-d-selection.md) + [Remaining-A](../decisions/2026-10-13-li-remaining-isolated-ai-contract-a.md); no repeat vote or cloud index deployment |
| Social Home/cards/bottom navigation/Profile and offline-first app | [confirmed implementation release](../decisions/2026-10-14-li-social-ui-increment-release.md); build usable approved functions in coherent increments, no per-page approval |
| Larger JIN packages, concentrated reviews, new target | [14October direction](../decisions/2026-10-14-li-ai-acceleration-and-target.md); human chose15October23:59 SGT |

## Needed evidence, not something a PM vote can prove

| Gap | Owner and concrete required input | Work that proceeds now |
| --- | --- | --- |
| Canonical Note time/immutability and no-restore/nonreuse | DU complete controlled inventory/writer/lifecycle proof or exact counterexample, as pinned #96 handoff; no new registry inferred | Reader policy/client, storage/fences and unrelated UI; only dependent real Note integration waits |
| #99 first default Flutter failure | JIN diagnosis with observed initial-load/create state and targeted reproduction/fix; SHI new-delta review | Existing accepted-source composition and approved AI packages |
| Real model host/identity/tokenizer and semantic acceptance | JIN/ZHOU supply actual non-sensitive binding and meaningful checks after D1 if selected; no credentials or prompt/Note content in reports | Fake-Qwen persistence chain |
| Real Event acquisition/display/storage/link use rights and access | LI/authorized custodian supplies non-sensitive applicable-use permission reference and private provisioning confirmation. Existing bounded search≤3 plus one Detail already selected; SHI executes, ZHOU reviews | Synthetic labelled Event UI and existing Detail/read behavior |
| Real Event mapping/storage/freshness | SHI exact proposal from an actually authorized sample, then LI choice; a sample-dependent field/taxonomy decision cannot truthfully be made from missing data | Existing synthetic Event paths; no scraping/onePA fallback or guessed endAt |

No secret should be pasted into chat/GitHub. A statement “approve provider use”
does not create third-party permission; these inputs cannot be solved by blanket
approval. If rights/access are absent, retain the exact gap and complete the
independent labelled synthetic interface.

## Other known product choices kept together, outside this AI delivery release

The following still need **concrete contracts**, not another general instruction
to “complete Figma”. Their absence is already recorded; do not delay approved
AI/Calendar/forms while preparing them.

| Group | Unsettled matters and recommended current disposition |
| --- | --- |
| Five prototype-only routes | `verify`, `forgot-password`, `going-people`, `checkin-edit`, `ai-safety`: security/resend/reset, directory disclosure, source mutation/provenance and safety workflow respectively are absent. Preserve inventory/target and prototype-only status for this increment. No password-code system, Going directory, editable historical Note or unapproved crisis/health workflow is inferred. A visual link/prototype is not functional completion. |
| Extra Account/profile fields and public projection | DOB/age/region/school/bio purpose/storage/visibility and full target projection need exact authority mapping. This increment uses approved existing fields only; Q18 minimum lookup result does not authorize a full Profile. No new collection or sensitive-field collection. |
| Friend Special Care/Recommendation/Activity | Existing requirement direction remains; exact consumer wire/lifecycle/projection and producer availability must be mapped. JIN reports one combined delta; do not infer Activity permissions from friend membership or broaden approved search. |
| Event own participation, Interested people and external return | SHI/JIN prepare one exact state/concurrency/visibility/purpose/API/schema contract delta, distinguishing Interested versus Going and a Yes/No return confirmation from actual registration proof. New endpoints/storage/exposure need LI approval; current assignment only releases existing approved behavior. |

These are not seven new questionnaires. They are the complete currently known
local decision categories from the retained coverage/source reports. Owners
must bring exact old/new terms together when proposing those extensions; this
document does not approve unspecified future schemas. A newly discovered
higher-authority conflict or materially new requirement is reported locally.
Real provider, all42-route completion and UAT/Release cannot be promised by the
15October target without the missing authority and evidence.
