# AI and social internal delivery — 14–15 October 2026

Authority: [S-PM-1014-LI-AI-ACCELERATION](../decisions/2026-10-14-li-ai-acceleration-and-target.md).
Target **15October23:59 SGT**. Milestones below are PM-requested delivery targets,
not owner-confirmed estimates or a promise that all42 routes/Release will finish.

## Current source and actual remaining work

| Source | Verified current state | What it does not complete |
| --- | --- | --- |
| #99 `e84b23cd82eeda039f2bef9fa455909e9f39cc87` | SHI5513450226; LI [bounded disposition](../decisions/2026-10-14-li-pr99-bounded-disposition.md), exact #97+#95+#96 composition and successful groups | First default Flutter504/1 is open; actual real AI Application/reader/store/control/HTTP/cleanup are not joined; no real model |
| #98 `1cc52800e7d51320d6b97c76b5b6e2ee3f9dcba0` | Delivered social offline APK; owner517/517; DU review requested, no formal review at this checkpoint | Memory-only data/scripted AI; no physical installation of this binary; full Calendar and other inventory gaps remain |
| #95 `72c0279…`, #96 `67056c7…` | Account producer and R-A/prepared reader/helper components accepted | They are reusable inputs, not proof of complete AI persistence or cleanup |

Do not reopen F01/N02/F03/R-A/C-A, repeat accepted SDK observations or wait for
old Draft merges. No overall completion percentage is supported. See
[#98's full42-route gap inventory](https://github.com/3427564237/enmori-app/blob/1cc52800e7d51320d6b97c76b5b6e2ee3f9dcba0/docs/evidence/sprint3/2026-10-14-li-social-offline-coverage.md).

## Larger delivery packages and single-writer boundaries

### JIN — persistence, control, cleanup, transport and combination (#84)

Deliver two coherent persistence packets and the conditional model extension:

1. **AI storage/control vertical:** real asynchronous message/effects/op-fence/
   runtime-epoch adapters; first-user and assistant atomic effects, same-U claim/
   accepted-pair protection, fresh pre-transaction Auth and in-transaction owner/
   consent/source/used-Persona checks; durable close, current-epoch restart
   settlement and safe unknown outcomes. Implement selected N01 six HTTP
   operations and exact OpenAPI schema/error/identity mapping, guarded isolated
   composition and fake-Qwen end-to-end Auth→Backend→Firestore path. No receipt,
   persistent generation queue, fake content success or ordinary bootstrap.
2. **Complete cleanup and integration:** explicit whole deletion/expiry,
   canonical messages/provenance two sweeps, page25 full-reference keysets,
   tombstones/all-source-and-stamp removal, parent-last deletion, checkpoint/
   ABA guards, restart/failed-page continuation and original expiry+24h clocks.
   Implement against selected C-A, including startup/hourly operational targets;
   a short test does not prove a90-day/24-hour production SLA. Combine coherent
   reviewed/eligible inputs and run the applicable changed-source gate once.
3. **Approved bounded real-model extension:** after the persistence vertical
   works, implement the missing concrete adapter within the approved
   Qwen/Ollama boundary and locked stack; inventory actual already provisioned
   host/model digest/tokenizer and complete Q31 enforcement. Run only when the
   [human-selected D1-A prerequisites](../decisions/2026-10-14-li-controlled-qwen-and-synthetic-event-selection.md)
   actually hold. No new install/dependency/exposure;4B is manually selected dev
   evidence only. Publish missing prerequisites immediately and keep fake-Qwen
   delivery independent. Approval is not a claim the adapter exists.

JIN is sole writer of shared Firebase gateway extensions, new storage/control/
cleanup Infrastructure, selected HTTP transport, normative API, Backend Bootstrap
and test launcher/composition. New interfaces must implement the already selected
contract; they may not invent fields, endpoints or retention. Expose a minimal
async store/control interface commit first so ZHOU can build concurrently.

Also own the focused #99 Persona test diagnosis/fix described in the bounded
disposition. Preserve its original failure and all recovery/identity assertions.
This is not a reason to delay the two AI packets. Existing Friend commitments
remain visible: public Profile/Special Care/Recommendation/Activity are unfinished
where their producers/contracts are missing. Do independent approved consumer
work after the first AI vertical is published; do not overload the AI critical
path with unapproved Friend contract design or repeat accepted search work.

Review: **SHI** new JIN product/transport/cleanup/composition code; **LI** JIN gate
evidence and bounded acceptance. JIN author tests are not independent gate proof
of JIN's own new product code; SHI supplies that review before scoped acceptance.

### ZHOU — asynchronous Conversation, reader and mobile (#83)

Own the real **asynchronous Application orchestration**, joining the accepted
60/5/45 runtime, original session/request, fixed context read, storage/control
effects and guarded delivery sink. Keep strict synchronous fake Application/
`effect(commit)` Ports unchanged; asynchronous Firestore cannot satisfy those
synchronous promises by pretending a pending write has committed. New inner
types stay vendor-free and preserve the existing architecture dependency rule.

Own `RealContextReadPort` implementation in separate read Infrastructure files:
one exact acceptance-time view for Account/complete Persona membership/Notes;
seven-day inclusive selection, timeDESC/IDASC, page25 until five legal items;
current authority reads; nonempty generation stamp and unavailable/denied/empty
distinction. Do not infer future transaction authority from `readCurrent()`.
JIN must recheck applicable authority in its actual content transaction.

Finish mobile Send/Retry/Cancel/Check result/Leave/ordinary history/delete
integration against the fixed selected six-operation wire contract; polish AI/
Persona within the approved social direction. Preserve same-session all-pending,
late response, lifecycle/expiry/deletion and dirty/in-flight route safeguards.
Deliver source/tests plus a meaningful synthetic fake-Qwen/controlled persistence
journey once storage is available. Do not wait for complete cleanup to implement
reader policy/client work; do not return a fake successful real Note read.

ZHOU is sole writer of new real asynchronous inner Application orchestration,
reader-specific Port/Application/read Infrastructure and AI/Persona Flutter.
JIN owns shared gateway/Transport/Bootstrap/API; publish interface diffs rather
than editing those files on two branches. Read adapters may use the existing
locked SDK only inside Infrastructure. Interface publication is not a separate
mandatory review gate.

Review for these **new** ZHOU packages: **LI**. This supersedes JIN's reviewer
queue only for this accelerated delta; old JIN approvals stay intact.

### DU — unblock actual Note authority and deliver Calendar (#82)

First publish one focused source-bound handoff answering **both** existing
guarantees in [the exact #96 handoff](https://github.com/3427564237/enmori-app/blob/67056c778a03595c386a69ec7ea33046fdd4205d/docs/planning/2026-10-13-du-note-time-identity-handoff-requirements.md):
complete controlled writer/inventory canonical millisecond UTC and immutable
owner/Note/time; and controlled permanent-deletion/no-restore/no-ID-reuse across
the actual retained-provenance lifecycle. Include the actual scope, every
reachable writer/maintenance/fixture path, negative probes and missing facts.
If the guarantee cannot be made, publish the counterexample/minimum difference
immediately. This is evidence work, not a new product choice. Do not add a
permanent source registry, generation field or data migration by inference.

Then deliver own Calendar/date→Footprint→saved return through existing approved
History contracts and the social surface; preserve page20, time-zone/Note
validation and unavailable states. Review LI #98 once now, in parallel with
source inventory; report actionable new-code findings instead of redoing old
History approvals. LI reviews new DU code. Missing facts localize the dependent
reader/authority/cleanup path, not all AI or Calendar work.

### SHI — JIN independent review and Event usable increment (#44)

No repeat #99 or #97 review is requested. Review JIN's first new immutable AI
packet as it arrives, concentrating on transactions, privacy/authority,
selected wire semantics, cleanup and isolation. Code review can start before
owner's long device gate ends; formal acceptance still uses complete evidence.

Continue approved Event card/list/detail/empty/error/return UI work using the
selected social direction and honestly labelled synthetic source. For own
participation, permission-filtered Interested people and external return,
publish one exact existing-rule-to-API/schema/UI proposal if the necessary
contract is still absent; do not treat this assignment as approval of a new
endpoint or participant disclosure. Report one combined decision delta, not a
request per field. ZHOU reviews new SHI Event code independently.

Actual provider API run stays on its already selected bounded permission/access
path. Human LI now confirms no current rights/access basis and selects synthetic
Event interaction for this target. Do not wait for credentials or request another
LI vote on the same sample. No scraping, hidden fallback or new importer follows.

### LI — shared social/account, decisions, reviews and phone delivery (#85)

Complete independent #99 disposition, publish this plan and exact owner actions;
review new ZHOU/DU source and JIN evidence without repeating unchanged suites.
Maintain #98's exact review source while DU reviews it. Prepare the next shared
social/forms/Auth-onboarding composition in a separate delta; keep existing
controllers, approved fields, session and exit guards. DU supplies Calendar,
ZHOU AI, JIN Friends and SHI Event module deltas instead of competing edits to
shared Home/router. LI alone writes shared Home/router/offline shell and joins
eligible modules, then builds the next installable internal APK.

## Requested milestones and how to avoid review queues

| SGT target | Concrete checkpoint |
| --- | --- |
| 14Oct18:00 | Owners acknowledge exact package, publish base/write boundaries and thin interfaces; DU returns both guarantee scopes or precise counterexample. These are requested checkpoints, not facts already delivered. |
| 14Oct21:00 | First immutable usable AI vertical/client draft and focused source/test evidence; implementation continues on independent second packets during review. |
| 15Oct12:00 | Remaining approved-source implementation delivered; unresolved exact contract/evidence rows reported with owner/impact instead of a blanket waiting status. |
| 15Oct16:00 | Identify one integrated candidate with included/excluded inputs. Fix source; run applicable gate, independent reviews in parallel. Late fixes produce a new identified source with appropriate rechecks. |
| 15Oct21:00 | Next installable APK and integrated critical-journey results, plus any failed/not-run rows. Reserve remaining time for focused corrections and bounded acceptance. |
| **15Oct23:59** | Human target: usable reviewed internal increment and honest closeout of remaining gaps. Do not relabel partial delivery as all42/whole Sprint/UAT/Release. |

Each owner posts one short reply on the existing task: package + immutable source
or first-draft ETA + exact blocker + independent next action. A missed milestone
is reported as missed; no invented reviewer SLA or deadline extension. Reviewers
receive one concentrated packet. Author continues unrelated approved coding
while review runs; neither peer waits for the other's full approval to publish
their own source. LI resolves scheduling collisions; no self-review substitution.

## Decisions, evidence and completion boundary

[The consolidated packet](2026-10-14-li-consolidated-next-decisions.md) and
[human selection](../decisions/2026-10-14-li-controlled-qwen-and-synthetic-event-selection.md)
separate the approved bounded real-model test from actual producer/runtime
prerequisites and unapproved prototype extensions. AI persistence work does not
wait for the real-model prerequisites.

Completion requires a usable authorized flow, coherent source, meaningful owner
validation and the assigned different review/LI disposition, plus applicable
changed-source combination/device evidence. Source/tests/docs counts or a green
subset alone are not all-feature completion. The first Flutter failure, provider
rights/access, real model identity/tokenizer, API24/25, hardware Back, human
accessibility, UAT/Release and all unresolved route gaps remain visible until
actually evidenced. Keep all PRs Draft/Open and main/task/Project/runtime states.
