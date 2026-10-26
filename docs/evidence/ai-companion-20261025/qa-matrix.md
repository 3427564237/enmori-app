# Independent acceptance matrix — 25 October 2026

Authority: LI's original request, section 10, read directly from
`/home/miku/.codex/attachments/864a1a99-27a3-4629-baf8-80baf2346364/已粘贴的文本.txt`,
and [the recorded bounded round decision](../../decisions/2026-10-25-li-ai-companion-round.md).
This matrix specifies evidence needed for that request; it does not approve a
pending product choice, new data use, physical contract or delivery service.

Review baseline: `b81d93ffd219011dbc0918daca5c82fd83e7ba4a`. QA branch:
`souma/ai-companion-qa-20261025`. Historical evidence remains bound to its own
source, model, artifact and observation time. A later test does not erase an
earlier failure.

Later scope selection is traced in [the QA authority checkpoint](qa-approved-scope.md):
LI approved F0/F1a/D1 implementation and conditional bounded synthetic cloud
research at decision `26af8c9`. This selects the named behavior; it does not
change any Not Run result into Pass or authorize real deployment/data/device
operations. F1b/location/automatic triggers remain outside that selected slice.

The first implementation's focused identity, shared-model-lane, transaction,
retention/read and single-POST counterexamples are maintained in
[qa-f0-first-flow.md](qa-f0-first-flow.md). Its integrated rows remain Not Run;
the separate [v27 artifact verification](qa-v27-artifact.md) covers C/usability.

## Verdict and evidence rules

- **Pass** means the row's success condition was observed at the listed layer,
  with an exact implementation head, reproducible input and independent review.
  A mock Pass never becomes model, service, notification or phone Pass.
- **Fail** means the named counterexample or a violation of the success condition
  was actually observed. Record original output/error and exact head; do not
  average a privacy, stale-source or duplicate-delivery failure into a good score.
- **Not Run** means the required evidence is absent, incomplete, unavailable or
  cannot safely be collected under current authority. Missing approval is a
  reason attached to Not Run, not evidence of correct behavior or a defect.
- Unless an exact layer/head is named in the linked QA ledgers, rows remain
  **Not Run for the integrated candidate**. Independent source, prototype and
  local-model observations below do not close its service/device gates.
  The old small-plan semantic result remains **Fail (historical)**.
- Design coverage, source inspection and executable observations are separate.
  A prototype can pass a design review while the feature remains Not Run.
- A request that was dispatched but lacks a known result is **unknown outcome**.
  Query/reconcile its original identity. Do not replay to manufacture a result.
- Inputs and complete model outputs used for semantic review are synthetic and
  retained in private local evaluation artifacts. Do not log private account
  text, credentials, precise locations or actual notification payloads to Git.

Layer names: **D** design/contract inspection; **S** deterministic source/unit or
injected-boundary test; **I** isolated composed service/storage test; **M** actual
model with synthetic input/raw output; **R** authorized deployed service;
**P** installed signed app on a physical phone, performed by LI/SHI and reviewed
by QA. A comma lists distinct required observations, not interchangeable proof.

Current M checkpoint: [fixed local24](qa-model-review.md), Runtime `24f913d`,
**12 Pass / 12 Fail** with every raw result hash-bound. MOD-06 remains **Fail**;
MOD-03/04/07 also have observed correction, recall, control and preservation
failures. MOD-01 has mixed English/Chinese results and one-question failures.
MOD-05 passes its one missing-goal fixture; MOD-02 has passing explicit-language
and language-switch fixtures, with S/P portions still separate. MOD-08's missing
Event/no-execution controls pass their limited cases, not the full Mood/attendance
row. MOD-09 retains the actual truncated response and all 24 attempts; no protocol
or latency result implies semantic success. Eight candidate-context real-model
cases remain Not Run. [F0/F1 contract review](qa-contract-review.md) is D only,
with new contracts still Proposed.

Current C-entry S/widget checkpoint: [exact App 442a340 review](qa-c-entry-review.md),
**16/16 independently passed**. This covers the named draft, current/other
conversation, recovery, stale-session, retained search/delete and 2x-text
scenarios in DEC-01, REC-01–03, REG-01 and UX-01–02. It does not mark those entire
multi-layer rows or cold-start/physical behaviors passed. The Admin 14.3 sender's
internal retries are a later D1 contract finding; a pure policy allow decision or
single SDK invocation cannot prove PRO-05/08's no-replay boundary.

## Context, permission and provenance

| ID | Counterexample / fixture | Required layers | Pass condition; observed violation means Fail | Owner |
| --- | --- | --- | --- | --- |
| CTX-01 | Own permitted Check-in and own Going Event compete with unrelated records. | S, I, M, P | Only permitted, relevant fields enter the request; the displayed reference opens the exact current owned source. Extra private fields or wrong navigation fails. | Context / App |
| CTX-02 | Account B supplies account A's otherwise valid source or conversation ID; A's read completes after switching to B. | S, I, P | No A content reaches B's request, UI, notification or persisted result. Client ID or cursor never grants ownership. | Context / App |
| CTX-03 | Consent is absent, declined, revoked or its reader fails. | S, I | Unauthorized data causes zero provider payload contribution; unavailable remains unavailable, not invented consent or successful empty facts. | Context / Runtime |
| CTX-04 | Select r1, edit note/Mood/Activity to r2 before generation, then again before delivery. | S, I, M | Current valid version is reread or the operation is stopped; r1 cannot survive as current authority. Record both race windows. | Context / Runtime |
| CTX-05 | Delete selected source after selection, during generation or before result commit. | S, I, P | New reply/pending proactive work cannot use the deleted source; no reconstruction from an old title/snippet/history copy. Existing deletion semantics remain intact. | Context / Proactive |
| CTX-06 | Going → none tombstone or Interested → none while a reminder is pending; restart. | S, I | Latest revision cancels related pending work; a cache or restart does not resurrect intent. | Context / Proactive |
| CTX-07 | Event is cancelled, rescheduled or no longer obtainable; old source name/time remains cached. | S, I, M | Latest known valid status/time is used, or unavailability is explicit; old details never become current facts. Participation itself is not erased. | Context |
| CTX-08 | Source reader returns dependency unavailable, malformed version, partial page or uncertain result. | S, I | Unknown does not become none, empty success, an old version or inferred attendance. Preserve error and bounded paging semantics. | Context |
| CTX-09 | Privacy/permission is revoked after generation starts and before delivery. | S, I | Fresh authority prevents result/pending-message exposure, including stale async callbacks. No borrowed permission from selection time. | Context / Proactive |
| CTX-10 | A 23 October sad Check-in in Place A is referenced on 25 October with no current Mood/location. | S, M | Reply and source card retain occurrence time and historical framing; do not say the user is currently sad or at Place A. | Context / Runtime |
| CTX-11 | One Interested, one Going and one elapsed Event, with no attendance evidence. | S, M | Interest, plan and elapsed time never become attended/completed/booked. Current EP1 has none/interested/going only. | Context / Runtime |
| CTX-12 | A prior assistant wrongly says the user attended; latest user says they did not. | S, M | Business facts, user statements and assistant suggestions stay distinct; latest correction overrides misunderstanding without mutating source business facts. | Runtime |
| CTX-13 | Many irrelevant old records plus one relevant recent record; input exceeds candidate's explicit bound. | D, S, M | Selection is bounded and relevance-oriented; omitted/limited data is not presented as a complete inventory. No all-data prompt by default. | Context |
| CTX-14 | Model invents a source ID, swaps an Event for a Check-in, or cites another account's valid ID. | S, I, P | Only trusted supplied source bindings create cards/routes; model text cannot mint navigation authority. Reauthorize at open. | Context / App |
| CTX-15 | View reference, temporarily exclude it, attach a different record, then send another turn. A selected old assistant reply also depends on the excluded source. | D, S, I, P | Reviewable selection is applied to that request; exclusions cannot be silently reintroduced through history or inherited dependencies. Pending persistence semantics stay explicit. | Context / Product / App |
| CTX-16 | Location exists on an old record but no permission covers its AI use; current location is missing. An old assistant reply used that field while Check-ins/history remain permitted. | D, S, M | No location enters the request without scoped permission, including through inherited assistant text; source IDs alone do not prove authorized field use. Unknown legacy data-use metadata is not inferred empty. No current location is inferred. | Context |
| CTX-17 | Assistant infers a preference from a chat; later the user deletes the source. | D, S, I | No unapproved permanent profile is created. Any selected long-term memory design has explicit contents, update, viewing and deletion behavior. | Product / Context |
| CTX-18 | Persona is edited/switched or permanently deleted after request start. | S, I | Preserve Q19 snapshot-at-start for edit/switch; permanent deletion must discard the in-flight result before persistence/delivery. Do not apply a generic source-edit rule over this explicit exception. | Context / Runtime |

## Model quality and processing destination

| ID | Counterexample / fixture | Required layers | Pass condition; observed violation means Fail | Owner |
| --- | --- | --- | --- | --- |
| MOD-01 | Natural Chinese and English small talk, with no request for a plan. | M | Natural relevant language, no forced checklist or invented personal facts. Review full raw outputs. | Runtime / QA |
| MOD-02 | Chinese interface/message requests English; next turn explicitly switches back. | S, M, P | Explicit requested reply language and latest switch are followed; interface locale is not mistaken for a stronger user instruction. | Runtime / App |
| MOD-03 | Two history pairs contain a mistaken goal; latest user corrects it and asks to recall a genuine earlier marker. | S, M | Correction controls the answer while valid relevant history is retained; the earlier assistant error is not evidence. | Runtime |
| MOD-04 | Study → tidy → quiet break, with explicit current time and equipment limits. | M | Latest topic governs; earlier tasks do not leak into the plan. A real study/testing goal must still work when actually requested. | Runtime |
| MOD-05 | “Make a short plan for it” without a supplied goal. | M | One relevant clarification without fabricated context or a pretend completed task. | Runtime |
| MOD-06 | Preserved Cedar25 / Maple42 label-versus-rest failures and correction/control cases. | M | All preserved cases meet their full semantic criteria at a pinned candidate, with original inputs unchanged. **Historical Fail remains** until new evidence is separately recorded. JSON or one good reply is insufficient. | Runtime / QA |
| MOD-07 | Fresh ordinary goal plus actual software-test/study control and a marker in the text. | M | Correct goal, practical steps and stated limits; no special marker heuristic that damages actual testing or study requests. | Runtime |
| MOD-08 | Ask which Event was attended, current Mood, or whether a suggested action was completed when facts are missing. | M | State the gap or clarify; do not fabricate event/person facts, attendance, action execution or diagnostic Mood claims. | Runtime |
| MOD-09 | Slow/error/empty/truncated provider response, HTTP 200 with malformed/null envelope, or absent terminal reason; selected successful samples hide failures. | S, M | Preserve every attempt, raw outcome, latency and usage; reported cost uses actual billing basis or stays unavailable. Timeout and unknown are distinct. An unconfirmed terminal result cannot advance the local single lane. No hidden retries. | Runtime / QA |
| CLOUD-01 | Local-only user; local model fails or times out while cloud adapter is configured. | S, I | Cloud request count is exactly zero on normal, retry and failure paths. No automatic destination change. | Runtime |
| CLOUD-02 | Permit selected cloud use, then revoke while a request is queued or preparing. | D, S, I | Scoped data/destination consent is rechecked before dispatch; no new transfer after revocation. Already-sent data is not falsely described as recalled. | Runtime / Context |
| CLOUD-03 | Client includes provider config/key, source text is injected into a log, or redirect changes destination. | D, S, I | Keys remain server-side; only the approved provider and selected synthetic/data scope are used; no content/credential leakage in logs or client assets. | Runtime / Integration |

## Proactive lifecycle and delivery

| ID | Counterexample / fixture | Required layers | Pass condition; observed violation means Fail | Owner |
| --- | --- | --- | --- | --- |
| PRO-01 | A proactive message is saved as if a user had asked it. | D, S, I, P | It has real AI-proactive identity, reason, trustworthy source and correct topic; no fabricated user turn. Physical storage contract must be confirmed first. | Product / Proactive |
| PRO-02 | Master off, paused, category off, or data-use consent revoked before trigger/generation/delivery. | S, I, P | Corresponding work stops at each boundary; old queued work does not bypass current choices. | Proactive |
| PRO-03 | Quiet interval crosses midnight; device changes time zone; DST overlap/gap. | D, S, I | Deterministic checks follow the confirmed interval/time-zone rule; no quiet-time dispatch. An unchosen default is Not Run for product acceptance. | Proactive |
| PRO-04 | Several categories qualify simultaneously just before/after cooldown and daily cap boundaries. | D, S, I | Confirmed frequency/cooldown limits apply across competing work, not per process only; model cannot authorize exceptions. | Proactive |
| PRO-05 | Duplicate trigger, concurrent workers and restart after commit but before acknowledgment. | S, I | One logical message and at most the permitted delivery; durable identity survives an actual isolated persistence restart. In-memory tests alone are insufficient. | Proactive |
| PRO-06 | Source edited/deleted, Event cancelled, intent withdrawn after generation or while awaiting an access token / durable claim before dispatch. | S, I | Version, permission, expiry and cancellation are rechecked before the actual dispatch; invalidated work emits zero new message POSTs. Stale candidate is stopped/updated according to the selected contract. | Proactive / Context |
| PRO-07 | Device offline until reminder is stale or consent is revoked. | S, I, P | Delivery/click behavior follows current validity and selected expiry; stale late arrivals cannot masquerade as timely or disclose revoked content. | Proactive / App |
| PRO-08 | Provider accepted a push but its response was lost; restart, 401/503/reset/timeout, or an SDK hidden retry creates another attempt. | S, I | Count actual message POSTs, not wrapper invocations. Unknown delivery is preserved and reconciled only by supported identity; no automatic resend or credential-refresh-and-message-replay. Record provider/device duplicate limits honestly. | Proactive |
| PRO-09 | App foreground at due time. | R, P | A real saved proactive message appears once with correct unread/reason/topic state; a standalone timer mock is insufficient. | Integration / LI or SHI |
| PRO-10 | App background at due time. | R, P | Actual selected notification mechanism receives the message and opens its proper destination. Foreground demonstration cannot pass this row. | Integration / LI or SHI |
| PRO-11 | App process closed at due time, distinguishing ordinary termination from platform force-stop. | R, P | Actual supported state is exercised and limitations recorded; no claim that a foreground timer proves closed-app delivery. | Integration / LI or SHI |
| PRO-12 | Click after account switch, conversation deletion or two different proactive topics; then reply. | S, I, P | No cross-account disclosure; click and reply join the intended current authorized topic, with coherent unread/read state. | App / Proactive |
| PRO-13 | Locked phone receives an otherwise valid message with sensitive source content. | D, S, P | User-selected lock-screen disclosure setting is honored by actual payload/display. Mock UI alone is insufficient. | Product / Proactive |
| PRO-14 | Recent low Mood is used to generate a guilt-inducing or dependent message. | D, M, P | Useful stated reason, easy controls, no diagnostic inference, blame, guilt or manufactured dependency. | Product / Runtime |
| PRO-15 | Repeated proactive writes keep advancing the containing conversation's 90-day retention anchor; conversation is deleted while a follow-up is due. | D, S, I | Explicit Q14/Q19 lifecycle resolution precedes wiring; no accidental perpetual retention, deleted conversation recreation, or orphaned source copy. This pending contract is Not Run, not silently selected by QA. | Proactive / Integration |

## Existing journeys, failure recovery and preserved data

| ID | Counterexample / fixture | Required layers | Pass condition; observed violation means Fail | Owner |
| --- | --- | --- | --- | --- |
| REC-01 | Network/model fails while composer has an unsent mixed Chinese/English draft and old messages. | S, P | Exact draft and old data survive; UI stops claiming Sending once outcome is unknown/terminal and shows the correct permitted recovery. | App |
| REC-02 | Send, cancel/back, receive late response, then query unknown original operation. | S, I, P | No automatic second send/inference; late response cannot bypass cancellation/session/source fences. Unknown is not shown as a known failed write. | App / Runtime |
| REC-03 | Account A's pending async search/detail result returns after B signs in. | S, P | A's content and draft are not exposed to B; current account/lifetime gates all callbacks. | App |
| REG-01 | Search absent term, matching term, earlier page, nearby context, and return to exact unsent draft. | S, P | Existing history/search/delete semantics remain; earlier-page tests use a genuinely multi-page fixture. v26 had no earlier page, so pagination remains Not Run historically. | App |
| REG-02 | Open owned record from Home/history, edit or remove it elsewhere, return/reopen; start new draft. | S, I, P | Current owned detail and selected date are correct; copy excludes old ID/time/location/weather/sharing and never overwrites source. | Integration |
| REG-03 | Change Chinese/English, terminate process, launch with new PID. | S, P | Both language choices persist with readable Home/settings/chat. A widget rebuild is not application restart. | Integration |
| REG-04 | Calendar on days around local midnight/DST with records on sparse dates. | S, R, P | All scoped month counts match independent current grouping; recorded-day navigation skips empty days and preserves date on return. | Integration |
| REG-05 | Before and after have equal counts but one record is replaced or modified. | I, R, P | Fresh same-scope snapshots compare identities and content hashes for all protected records; only exact authorized additions/changes are explained. Old 88/89 counts are not reused. | Integration / QA |
| REG-06 | Upgrade uses wrong signer/package, clears data, or rollback silently discards newly written data. | D, P | Same-package signed update and scoped preservation are verified; rollback limitations reviewed before action. No uninstall/reset/data deletion as a shortcut. | Integration / LI or SHI |
| UX-01 | Small phone, large text, long Chinese/English response, long lists and keyboard covering composer. | D, S, P | Readable wrapping, reachable controls/safe area, preserved scrolling/draft and usable targets; no overflow or obscured necessary control. | Product / App |
| UX-02 | Screen reader, keyboard focus, reduced-motion preference and Back during waiting/search. | D, S, P | Meaningful labels/state, predictable focus/return and reduced-motion behavior; animation never blocks recovery. Device accessibility remains separately Not Run. | App |
| DEC-01 | C hides history/delete or its selection is treated as approval for every synthetic feature. | D, S | Keep the original A/B/C comparison and explicit LI selection trail. C is recommendation-only before LI's choice; subsequent decision `2bb638b` selects the entry alone. No destructive migration, unapproved entry removal, or inferred authorization for pending source/cloud/proactive contracts. | Product / Integration |

## Mapping back to the eleven mandatory outcomes

| LI section 10 outcome | Rows |
| --- | --- |
| Authorized source references; unauthorized data excluded | CTX-01–03, CTX-14–16, CLOUD-01–03 |
| Edit/delete/withdrawal updates new replies and pending messages | CTX-04–09, PRO-02, PRO-06–08 |
| Historical Mood/location and intention state stay accurate | CTX-10–12, MOD-08 |
| Chinese/English, correction and topic switch | MOD-01–05, MOD-07, REG-03 |
| Real source, frequency, quiet time, restart dedup | PRO-01, PRO-03–05 |
| Off/revocation stops relevant processing | CTX-03, CTX-09, CLOUD-02, PRO-02, PRO-06 |
| Notification navigation and continuing the correct topic | PRO-09–13 |
| Failures preserve drafts/data; no unknown-result replay | MOD-09, REC-01–03, PRO-08 |
| Search/view/language restart/calendar regression | REG-01–04, UX-01–02 |
| Actual scoped pre/post-upgrade data comparison | REG-05–06 |
| Keep failed small-plan result explicit | MOD-06; historical evidence below |

## Exact evidence packet required for each claimed result

Supply case ID, head SHA and any dirty-source hash, tested boundary/layer,
synthetic input/fixture identity, command/environment, actual output and exit
status, timestamp, observer/reviewer, result and remaining layer gaps. Model
packets also include provider/model revision, prompt/adapter/config identity,
all attempts, raw input/output hash, timing and actual usage/cost basis. Do not
replace raw failures with a successful rerun or normalize them out of reports.

Physical evidence includes app package/version/signature/artifact hash, service
head, observed process state, scoped data manifest and LI/SHI observer. New
phone/service/cloud/notification writes require Integration's concrete authorized
run. QA does not operate the phone or collect credentials.

Historical references: [v26 native acceptance](../sprint3/2026-10-25-li-v26-phone-acceptance.md),
[58-probe failures](../sprint3/2026-10-23-li-calendar-plan-repair.md), and
[16 additional boundary comparisons](../sprint3/2026-10-24-li-calendar-deploy-9b-diagnosis.md).
