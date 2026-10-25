# Context / Backend — source audit and isolated candidate

25 October 2026, Asia/Singapore. This is an audit and **Proposed synthetic
candidate**, not approval of a new data use, API, schema, provider, or deployment.

## Identity, authority and ownership

- Worktree: `/home/miku/.codex/worktrees/bc19/ENMORI`.
- Branch: `souma/ai-companion-context-20261025`; clean starting HEAD
  `b81d93ffd219011dbc0918daca5c82fd83e7ba4a`.
- Read LI's original request in attachment
  `/home/miku/.codex/attachments/864a1a99-27a3-4629-baf8-80baf2346364/已粘贴的文本.txt`
  and the [recorded authorization](../../decisions/2026-10-25-li-ai-companion-round.md).
  Direct exchange is limited to the verified current roster. Integration remains
  the sole owner of shared contracts and composition.
- Actual developer-agent settings were read from this chat's local `turn_context`:
  turn `01a171a5-808b-7f00-aa42-062da1bed2e9`, `gpt-6.1-sol`, effort `max`.
  The common `roster.json` independently records that configuration. These are
  developer settings, not ENMORI's application-model selection.
- Only `backend/src/ai-context/`, `backend/test/ai-context/` and this evidence
  file are changed. No existing reader, `ai-conversation`, `api/`, Firestore
  rules/indexes, manifest, lockfile, deployment or shared UI file is changed.

Controlling sources: [Backend architecture](../../decisions/2026-09-01-backend-architecture.md)
and its [detailed design](../../superpowers/specs/2026-09-01-backend-architecture-design.md),
[Q17](../../decisions/2026-09-01-recommendation-ai-field-allowlists.md),
[Q19](../../decisions/2026-09-01-persona-conversation-lifecycle.md),
[Q14](../../decisions/2026-09-02-retention-logging-audit-policy.md),
[19 October core](../../decisions/2026-10-19-li-core-feature-delivery.md),
[simplified local AI](../../decisions/2026-10-19-li-ai-mvp-simplification.md),
[Persona expression delta](../../planning/2026-10-20-zhou-persona-expression-preview-contract.md),
[participation decision](../../decisions/2026-10-20-li-event-participation-selection.md)
and [EP1/EB2](../../../api/event-participation-contract.md).
The [24 October repair](../../decisions/2026-10-24-li-ai-plan-model-repair.md),
[v26 phone observations](../sprint3/2026-10-25-li-v26-phone-acceptance.md) and
[prior-round handoff](../../handoff/2026-10-23-product-round2.md) retain their
original scopes and failures. Small-plan relevance remains unresolved.

## Existing reads and invalidation facts

The following are observed source behavior, not independent requirement authority.

| Data / boundary | Actual source chain | Authorization, version and invalidation fact | Consequence for this round |
| --- | --- | --- | --- |
| Current AI input | `retained-core-runtime.ts:131-132` → `isolated-conversation-composition.ts:83-88` → `FirebaseAdminRealContextReader` → prepared reader → async conversation application → local transport | `simpleChat` explicitly sets `includeCheckIns:false` and `includePersonaExpression:true`; `open_conversation_v1` adds same-owner/same-conversation history. Fresh original auth/session, consent and effect checks remain. | The absence of automatic Check-ins is deliberate. Merely enabling an old flag would violate the current combination and its prerequisites. |
| Owner Check-in body, Mood, Activity, source time | `GetCheckIn.execute` → `FirestoreCheckInRepository.findOwned` (`firestore-check-in-repository.ts:265-289`) → explicit `parseCheckInProjection` / `checkInResponse` | Each transaction resolves verified UID binding and completed account, then requires `ownerAccountId`. Owner display remains possible without AI consent. `createdAt` is historical server time; Mood/Activity are stored short labels, not current-state sensors or Event/Interest catalog IDs. Read failures remain unavailable. No completed-content cache is introduced by these repositories. | Reuse an approved owner read through an application-facing seam; ownership/display permission is insufficient for AI use. Do not scan unrelated records or infer current Mood. |
| Check-in history | `ListOwnCheckInsForDate` → `FirestoreCheckInHistoryRepository` → Firebase history gateway | Civil date/time zone and owner are bound to the opaque cursor. Page size 20, fixed 15-minute cursor lifetime; current account is re-read. Corrupt/foreign rows or invalid cursor fail, not empty-success. | This is a display/day-query contract, not a ready-made rolling AI-context reader. Do not widen its API or bypass its cursor. |
| Check-in edits/deletion | `EditCheckIn` → `FirestoreCheckInMutations` (`:11-57`) | Current binding/account/owner and expected revision are checked inside the mutation transaction. A body/Mood/Activity/visibility/location change writes revision+1. A legacy absent revision is treated as 1 by this writer; public parsing may still omit it. Delete physically removes the record. Text edits preserve historical weather; moving/removing the point or explicit withdrawal removes its weather snapshot. | Need the current authoritative version at preparation and every effect boundary. Do not fabricate a generation-time version for legacy content or assume identity cannot ever be restored/reused. |
| Old AI Note reader | `ports/real-context-reader.ts` and `firebase-admin-real-context-reader.ts:20-36,177-207,250-297`; `real-context-records.ts:73-79` | Requires complete canonical time inventory, **immutable owner/Note/time**, permanent deletion and no restore/ID reuse. Start view is fixed readTime, current checks read afresh; version is full-precision Firestore updateTime. Its model projection is Note-only. The real Check-in writer now permits edits. | These prerequisites are not established for current mutable records. The old reader cannot be adopted unchanged or certified by setting booleans. A mutable-source reader/receipt contract is still Proposed. |
| Interested / Going | `ParticipationOperations` → `FirestoreParticipationRepository.read/list/save` | Own account is freshly resolved. `none/interested/going` are mutually exclusive; `ignored` is independent. Revision/update time are persisted, `none` tombstones prevent stale changes. Cancel/unignore and own read do not require provider availability. Other-user views reauthorize privacy/relationship/eligibility each request/page. | The candidate reads only the owner's current intent. Interested and Going never establish booking, agreement, attendance, or completion. No other-user participation is added to AI. |
| Event name/time/venue and availability | `BrowseSource` → `ControlledSourceProjection` → `TicketmasterBrowseSource` → `projectOccurrence` | One five-minute process generation; explicit observed pages only, max 1,000 identities. Page-zero refresh admission, clear, expiration and process loss invalidate it; late reads cannot restore superseded pages. `projectOccurrence` admits future SG `onsale` occurrences and omits other statuses. Public/internal projections contain no provider revision or explicit cancellation reason. Some reads return the current in-memory projection rather than a new upstream read. | Own intent survives missing content. A missing/expired event is unavailable, not fabricated title or proof of cancellation. A provider-current Going reminder requires an approved fresh-detail/status seam; the existing five-minute display cache is not proof that an event was just rechecked upstream. |
| Location | [Check-in defaults/place-label contract](../../../api/check-in-defaults-and-place-label-contract.md), Check-in mutation and location validation | Foreground acquisition obeys settings revision/OS permission and invalidates on session/background/disable. Saved coordinates are historical. `locationLabel` is expressly display-only and not AI/weather input. Q17 excludes Approx Location from model payloads. | **Deferred for production.** The pure candidate can demonstrate an explicitly permitted dated label with synthetic data, never coordinates/live/background location. No real reader supplies it. |
| Persona | Fixed-start Persona state/items → `parseReadPersona` → `copyPersonaProjection` | Owner-only, active-at-start immutable projection. The 19/20 October local extension includes normalized expression fields; it grants no data/lookup/tool authority. Edits/active switch affect subsequent requests; permanent deletion invalidates an in-flight result. No historical Persona reconstruction. | Reuse the existing approved copier. Both `available` and explicitly known `changed` observations preserve Q19 snapshot semantics for the same still-existing used Persona; deletion denies. |
| Two history pairs | `FirestoreConversationStore.history/readHistory` (`:344-395`) → async store → `AsyncConversationApplication.prepare/checkpoint` (`:206-280`) | Only same-owner/same-conversation settled available complete pairs, latest two by sequence. Current user and pending/unavailable pairs excluded. Required sources are read; later checkpoints compare pair identity and bytes. Tombstones never become prompt text. | New source use requires versions **and actual data-use categories** for inherited assistant content. Old provenance only carries source IDs, not the newly proposed field-use receipt. Unknown legacy metadata must not be guessed empty. Current source-free local history is unchanged. |
| Consent/revocation | Original identity authority; `FirestoreAccountPreferencesRepository.save:94-118`; `PreparedRealContextReader.revalidate` | Account settings revision and purpose revocation generation are checked; consent withdrawal/reacceptance cannot restore an old admitted request. Visibility alone is not AI consent. | A new purpose/target grant cannot be inferred from a public Check-in, OS GPS permission, old consent boolean, or local-only permission. |

Relevant implementation files above are under `backend/src/` in the frozen
baseline. The audit did not query account content or credentials, contact a
provider, restart a service, or call a real model.

## Proposed inner candidate and user control

Exact types are in [context-contract.ts](../../../backend/src/ai-context/context-contract.ts).
[project-context.ts](../../../backend/src/ai-context/project-context.ts) and
[revalidate-context.ts](../../../backend/src/ai-context/revalidate-context.ts)
have no I/O, persistence, timers, environment discovery, registration or fallback.

The production default remains the current message, existing same-conversation
two pairs and Persona; **new context is off**. An adopted candidate would first
require LI's specific data-use choice and a current explicit user selection or
approved category choice. Test fixtures granting every category are synthetic
inputs, not defaults. There is no automatic long-term memory or profile.

The pure request carries owner, in-process session identity, conversation,
purpose (`reply`/`proactive`), target (`local`/`cloud`), trusted `asOf`, current
message, selected relevant/attached records and per-request exclusions. The
trusted read carries a fresh matching authority snapshot and permitted record
projections. It is not accepted from a public request body. Source selections
cannot mint grants, fetch arbitrary paths, or cross that scope. Exclusion wins
over attachment and covers all projections of the underlying source. If a
selected historical pair inherits that excluded source, preparation returns
`invalid_selection` with no model payload; the owner must prepare a compatible
selection. It never drops provenance while retaining the assistant's text.
Exclusion is temporary and does not mutate or permanently delete a record.

Check-ins retain five newest eligible projections in the inclusive preceding
seven days; two settled history pairs remain bounded. The prototype's three
Event intentions and one location label are **Proposed resource caps**, not
approved product defaults. Explicit attachments outside the window/cap return
`invalid_selection`; missing/denied/uncertain selected content blocks preparation
instead of silently sending a different selection. No automatic source lookup
or semantic relevance classifier is added here.

Model data contains `asOf`, `currentMessage`, dated `facts.checkIns`, current
`facts.eventIntents` with status/update/start/observed times, optional dated
`facts.locationSnapshots`, `userQuotes`, `assistantSuggestions` and an approved
Persona projection. Notes and historical user messages are quotations, not
verified activity facts. Prior assistant text is labelled suggestion, never
promoted into the facts object. Request-local `historyTurn` ordinals preserve
quote/suggestion pairing and sequence when timestamps tie. A current correction
stays separate as the latest message. Runtime still has to honor this structure;
these tests do **not** establish natural-language semantic/model acceptance.

Source/owner IDs, source versions, consent revisions, paths, coordinates,
provider payloads and undeclared fields are not added as model metadata. A
user's own literal text is preserved rather than scanned for identifiers.
No source version is a persistent content hash. Actual mutable-source versions
and immutable identity/no-reuse guarantees remain an adapter/contract gate;
synthetic `r1`/`r2` strings are not evidence that a real reader provides them.

The trusted sidecar keeps `SourceRef {kind,id,version}` and independently
`observedAt`/`validUntil`. An Event intent depends on **both** participation and
Event versions. Event version means the authorized projection being used; the
existing provider does not supply the candidate's version field. A future
adapter must establish change/cancellation/expiry from current trusted data,
not create an AI version or silently extend an old generation's lifetime.

Historical assistant input additionally needs `requiredCategories` and required
source versions from its actual generation-time use, freshly authorized now.
A Check-in source can contain a body and/or location, so source kind alone is
insufficient. With location withdrawn, an old assistant location suggestion is
denied even if `conversation_history` and `check_ins` remain allowed. Unknown
metadata returns unavailable; it cannot become `[]`. Current old provenance
cannot prove this new receipt; no backfill or production history change occurs.

## Proposed App projection and Q19 supersession needed

Minimum owner-scoped outward card proposal:

| Field / behavior | Basis and limit |
| --- | --- |
| Source kind and opaque owner-readable source locator | Check-in ID or canonical stable Event ID, from the trusted authorized reader only. No account UID, Firestore path, Persona ID, token, arbitrary URL or raw `tm_` browse locator. |
| Source version, source occurred/start time, observed time | Version is separate from historical source time and latest observation time. Format to the user's chosen zone in UI; a past Mood/place remains a snapshot. |
| Availability/currentness state and navigability | Available, changed, deleted, no longer allowed, or could-not-verify. Uncertain/deleted/denied states have no usable navigation target or stale text preview. Status copy/DTO still belongs to Integration/Product. |
| Display label | Generic kind/date can be derived without persisting private excerpts/provider titles. Any title/summary comes from a separately authorized fresh display read. |
| Draft selection | Exclude/attach applies to this draft/request only, retains user choice through a recoverable failure, is cleared on scope replacement, and never grants access. Revalidate before Send; failure cannot silently omit a selected record. |

`trustedSourceNavigation` demonstrates exact kind/ID/version membership within
the matching trusted catalog/scope. Fabricated or stale model IDs return no
target. Matching proves only a catalog navigation target; it does not verify
that an AI sentence is entailed. “This request referenced” source cards are
safer than claiming an arbitrary model sentence has a verified citation.
At actual tap, UI/server must freshly reauthorize the source; this pure lookup
cannot authorize a read or close a deletion race.

Q19 currently makes generation provenance Backend-only and excludes it from
Flutter/explanation. A decision must explicitly replace **only** that outward
restriction for this minimized owner-visible card projection. Keep the original
Backend provenance private; do not expose existing internal provenance wholesale,
copy titles/Notes into provenance, add source IDs to model prompts, or widen
ordinary-user visibility. Q17 Check-in field/time/consent limits remain; location
stays deferred. Local grants do not imply cloud grants.

Proposed history behavior after source change:

- Edit/version change: discard a pending result; rebuild from the fresh approved
  selection only after the owning flow chooses to continue. A selected source
  card becomes changed until fresh verification. Do not claim old text used r2
  when it was generated from r1.
- Delete/withdrawal/lost authorization: stop pending processing/delivery; source
  navigation becomes unavailable. For generated history depending on that
  source, extend Q19's whole-assistant unavailability rule to the new source-use
  receipt, then remove content/provenance according to the approved cleanup
  contract. Tombstones retain order without deleted-source IDs or text.
- Failed/unknown read: hold the flow, retain the draft/selection and report that
  verification failed. Do not treat it as source absence or return cached r1.
- Existing source-free history/search/deletion and historical messages are not
  rewritten. New version/category provenance and edit-invalidated-history
  semantics need specific approval; missing old metadata is not fabricated.

## Proposed Proactive checkpoint and retention choices

Run `revalidateContext` using a **new** authority/source observation before
generation, after model completion and immediately before actual delivery.
Authority binds owner/session/topic/purpose/target and revocation generation.
Each expected source must have one fresh observation. `available` and `changed`
mean the same immutable entity is still present and currently authorized;
`changed` must include its known current version. Missing entity/identity or
unknown version is not an edit. Outcomes:

| Outcome | Required consumer behavior |
| --- | --- |
| `valid` | This checkpoint is currently valid. Still close actual write/delivery authority races; it is not a future dispatch permit. |
| `rebuild` | Source bytes/intent/time changed. Discard old generated text; do not automatically send or blindly retry it. |
| `denied` | Source deleted/denied, scope changed, consent generation changed, or any required category withdrawn. Stop the relevant work. |
| `unavailable` | Missing/duplicate/stale/unknown proof or dependency failure. Defer with unknown state preserved. |
| `expired` | Source display lifetime, Event start, or seven-day Check-in window passed. Do not deliver old content. A fresh observation cannot extend the prepared Event's expiry. |

Persona retains Q19's started-request snapshot across edit/active switch, but
permanent deletion denies; malformed/unknown Persona versions are unavailable.
The Proactive owner separately checks category opt-in, Going versus Interested,
trigger intent/topic occurrence, frequency/cooldown/quiet-time/time zone,
deduplication, cancellation and actual delivery. No scheduling/push is supplied
by this candidate. Going production triggering remains gated on provider-current
Event evidence; current display-cache existence cannot establish that.

Q14 currently advances its 90-day anchor on every accepted user or assistant
message. `real-retention-resolver.ts:179-220` reconstructs the persisted sequence
and cutoff, so merely adding an unrecognized proactive row is invalid. Agreed
option labels with Proactive (all **Proposed**):

- **R-ANCHOR (preferred for evaluation):** a real proactive message in the topic
  does not advance the old topic's retention anchor. User replies and their
  ordinary accepted assistants retain existing behavior. Requires a scoped Q14
  amendment plus explicit lifecycle/record/resolver support; no fake user row.
- **R-SPLIT:** use an independently linked follow-up topic with its own bounded
  lifecycle. Keeps the old topic's anchor but adds topic/link/storage semantics.
- **R-EXTEND:** accept that proactive persisted assistants advance the existing
  anchor and extend all old topic content. This privacy consequence must be an
  explicit choice, not accidental reuse of the existing store.

An independent proactive-message store is a further implementation option with
more schema/cleanup cost; none is adopted here. Deleted/expired topics cannot be
revived. Queued/prepared content must not outlive the topic, source, trigger or
consent. Q14's prohibition on separately retained raw prompts/responses remains.

## Validation and remaining gates

Pinned Node `24.19.0`, pnpm `11.19.0`, TypeScript `7.0.2`; existing installed
dependencies reused through a local ignored symlink, without install/update.
Frozen `pnpm-lock.yaml` SHA-256:
`27fcc951d38f289233cf8105e429dc0b3430575933e0f96239f0a3cd04b26c69`.
Paths are recorded in owner-local
`/home/miku/.local/state/enmori-ai-companion-20261025/toolchain.json`.

Exact test entry points:

```text
<pinned-node> <pinned-tsc> --project backend/tsconfig.json
<pinned-node> --test backend/dist/test/ai-context/context.test.js
```

Strict compilation passes; the latest candidate batch passes **44/44** Node
tests/subtests, using only synthetic records. Raw commands/results:
`/home/miku/.local/state/enmori-ai-companion-20261025/context-validation.txt`.
The first strict build failed with TS2339 because exclusion of grouped
non-available union states did not narrow to the version-bearing branch; an
explicit positive-state guard corrected it. That initial failure remains in
this chat's tool output; it is not reported as a first-pass success.

QA pre-review supplied three concrete concerns: Persona `changed` versus Q19
snapshot behavior; same-timestamp history order; and location re-entering through
historical assistant text. The candidate now has paired positive/negative cases
for these, explicit known-change version semantics, sequence/turn preservation,
and mandatory historical category proof. This is a response to independent
review, not a claim that final exact-SHA review has already passed.

At exact first-package SHA `3a32f11c2a9f72bc70c44b4fe4e5b254a95d1f21`, QA
independently reproduced CTX-15: an explicitly excluded Check-in could re-enter
through a selected pair's assistant text/dependencies. A new targeted test first
failed locally (expected `invalid_selection`, actual `prepared`), preserving
that failure in the raw log. The correction maps record selectors to underlying
source kinds, applies exclusions to inherited dependencies and returns no model
payload on conflict. Regression covers Note, location, Event, repeated
attachment/exclusion and a changed source version; removal remains temporary.
Required source inventories are explicitly complete and flattened across
inherited pairs; an unproved partial inventory is not a valid reader receipt.

Other covered counterexamples include owner/session/topic/purpose/target swaps,
unauthorized attachments, denied local-to-cloud reuse, source edit/delete/intent
withdrawal at three checkpoints, unknown/stale/duplicate observations, source
expiry, false past attendance assertions, date ambiguity, canonical trusted
navigation, and caller mutation after projection.

**Not run / not established:** a real mutable-source adapter, Firebase/Emulator
read contract, provider refresh, model semantic evaluation, shared runtime,
cloud request, notification/push, APK, physical phone, cross-network UAT or
deployment. New use/DTO/provenance/retention choices remain pending Integration's
concrete PM packet. The module has no production consumer or default permission.

Subsequent independent QA at source head
`8ce74a82b635e6a7b0ada6b2d17255ecb09714c0` reran strict compilation, all 44
checks and its original CTX-15 script. All passed; the original script now returns
exactly `invalid_selection`. QA closed that candidate source finding, with raw
readbacks under `qa-review/context-8ce74a8/` in the same owner-local round folder.
This does not close the real reader/adapter or product-use gates.

## Proposed first vertical contract — F0, one explicit follow-up

**Status: Proposed, not adopted or wired.** Context/source portions below and
Delivery's [first-flow proposal](proactive.md) at
`b8b853208b88dee4d1dc46dc9497a6e67a87305c` form one review packet. This section
also records the concrete review corrections sent to Delivery: a single
`not_started → dispatching` sender claim, registration/read-state GET readbacks,
and honest installation/idempotency limits. Integration owns final reconciliation
before LI chooses; no API or Firestore file is amended by this text.

LI has since selected C's entry form in Integration decision
`2bb638b47e682217007cf02cd505550d88d627cf`,
`docs/decisions/2026-10-25-li-ai-entry-c.md`. That only changes entry presentation;
it does not approve this F0 contract, new context or notifications. This worktree
retains its fixed original baseline and does not rebase for that document.

### F0 scope and source proof

1. The user selects one already-saved **user** message in a live owned topic,
   chooses a future absolute due time, confirms the displayed IANA time zone and
   explicitly confirms a one-shot follow-up. A model cannot create this intent.
2. F0 uses that source message and current permitted Persona through the existing
   local model boundary. It does not automatically add Check-ins, Events,
   location, cross-topic history or a persistent profile. `processing` is exactly
   `local` in this first contract. Cloud model use remains a separate choice.
3. The reader freshly resolves binding/account, source role/ID/sequence and
   full-precision persisted time, current topic lifecycle/expiry and explicit
   follow-up grant. The source text is read transiently, not copied to an intent
   or outbox. Message identity/sequence/time are existing immutable producer
   facts; no synthetic revision is invented for a message.
4. Generation input is explicitly `inputKind:proactive_followup`, with a dated
   `quotedRequest` and due/trigger metadata, rather than pretending that the
   quoted old message is a new user question. Model text grants no execution,
   notification, routing or scheduling authority.
5. Both before generation and after generation/before publication, reread the
   original source/topic/grants and compare the captured versions. Check again
   immediately before an external send and on content read/click. Each source
   observation as well as the authority envelope is fresh (proposed maximum
   age 5s); the effect transaction still needs a current version fence. A cached
   source cannot be made fresh by wrapping it in a new envelope.
6. The source user message must still be available in that exact owner/topic.
   Topic deletion/expiry, source invalidity, consent/category change or unknown
   proof stops the occurrence; it never recreates a topic. After a model call
   has begun, a changed dependency ends that occurrence without regeneration.

Scheduled-worker authority is a new explicit Port, not the original HTTP-token
reader. Creation uses a real verified caller. A later generation/delivery phase
rereads that confirmed intent, current owner/account eligibility, grant generation,
source/topic and registration lease. `authorizationScope` is a server-issued
opaque **intent-purpose epoch**, atomically captured with the intent and fenced
on applicable changes; merely echoing it grants no access. Do not retain a bearer
token, token digest as a reusable receipt, or the original in-process session
object for tomorrow's task. Queued restart work needs this fresh durable intent
authority; F1's client draft selections still bind their actual current session /
operation and do not survive it as permission.

The future Check-in/Event selector uses the same source-proof principles but
remains off in F0. A history receipt must contain the complete flattened source
inventory and actual use categories, not just source existence. Unknown legacy
proof cannot be converted into a grant. History-source age/total-source limits
and a provider-current Event version are explicit expanded-context adapter gates,
not established by this pure candidate.

### F0 HTTP, identity and concurrency proposal

All operations are Backend REST/JSON with Firebase identity verification first,
completed owner binding, `Cache-Control:no-store`, exact allowlisted object
schemas, server UTC times and safe error envelopes. No body/header/query may
select owner UID/accountId. Revisions are nonnegative safe integers; effective
changes increment once, compare revision before no-op, and never overflow.
Missing optional scalar values are omitted, not ambiguous `null`.

| Operation | Exact proposed first-slice command / result |
| --- | --- |
| `GET /v1/me/proactive-settings` | Return settings and revision; missing settings mean off, no categories/push enrollment and revision 0. No source/device secret. |
| `PUT /v1/me/proactive-settings` | Full body `{expectedRevision,mode,categories,timeZone,quiet,maximumInRolling24h,cooldownMinutes,pushEnabled,preview,pausedUntil?}`. `mode=on/off/paused`; categories are a unique subset of `[explicit_follow_up]`; `maximumInRolling24h=1`, `cooldownMinutes=480`; `preview=generic/hidden`. `quiet` is exactly `{kind:window,startMinute,endMinute}` (integer 0..1439, start and end unequal) or `{kind:disabled}`; proposed default window is 22:00–08:00 in the confirmed zone. `pausedUntil` is allowed only for paused mode; omission means indefinite. Time-zone changes require visible confirmation; until resolved, hold. Return current settings/revision. Eligibility changes invalidate captured work via grant generation. Off cancels unstarted work; on never resurrects it. |
| `POST /v1/me/proactive-intents` | Mandatory canonical UUID `Idempotency-Key`, also the owner-scoped intent locator for this bounded slice. Exact body `{conversationId,sourceMessageId,category:explicit_follow_up,dueAt,timeZone,processing:local,expectedSettingsRevision}`. Reread the source/topic/settings/grants; `now < dueAt < topic cutoff`; set `expiresAt=min(topic/source cutoff,dueAt+2h)` and require a positive usable interval. No generation at create. At most 3 active owner intent references. Same key/normalized command reads back the same receipt; changed command conflicts. |
| `GET /v1/me/proactive-intents/{intentId}` | Current owner-only status `{intentId,revision,state,dueAt,expiresAt,category,conversationId}` while authorized. Deleted-source details are omitted. This is the readback after an unknown create/cancel result. |
| `GET /v1/me/proactive-intents` | Complete bounded active set from the owner's at-most-3 references; no global scan, source text or invented pagination. |
| `DELETE /v1/me/proactive-intents/{intentId}` | Exact JSON body `{expectedRevision}`; **no competing revision header/query**. Cancel queued/reserved/prepared work atomically with active membership. A matching terminal no-op is idempotent. For a dispatch possibly already begun, report current unknown/accepted state and `recallPossible:false`; never claim recall or delete the conversation. |
| `GET /v1/me/proactive-registration` | Metadata-only readback `{installationRef?,revision,enabled,expiresAt?,availability}`. Never echo a registration value or expose a token lookup. |
| `PUT /v1/me/proactive-registration` | Exact body `{expectedRevision,installationRef,registrationKind:fcm_token,registrationValue,enabled:true}`; registrationValue must come from the reviewed SDK's `getToken/onTokenRefresh`, is opaque well-formed UTF-8, max 4096 bytes. F0 accepts only literal `fcm_token` and rejects other declared kinds; it never guesses or converts identifier types from string shape or substitutes FID/APNs values. Opaque-value acceptance is not provider validation. No FCM topic subscription. One active permitted installation in F0. Return metadata only. |
| `DELETE /v1/me/proactive-registration` | Exact JSON body `{expectedRevision,installationRef}`; owner/binding/CAS check, disable and erase the Backend value, advance revision. Unknown result requires GET readback. Never erase Firebase Auth/Core installation state as a shortcut. |
| `GET /v1/me/conversations/{conversationId}/read-state` | Current authorized topic's `{revision,readThroughSequence}`; absent state is revision/sequence 0. No private body or source receipt. |
| `PUT /v1/me/conversations/{conversationId}/read-state` | Exact body `{expectedRevision,readThroughSequence}`. Require current owner/live topic and an existing currently available committed message at that sequence; monotonically advance, never past current authority. UI submits only once the target is actually visible. No change to retention anchor. Stale/unknown write requires GET readback. |
| Existing owner transcript GET | Keep current 20-message paging/cursors. Add a genuine assistant `origin:proactive` plus minimized category/cause/source-card refs only under the approved extension. Old pair replies retain their exact semantics. A push receipt/click is not a read receipt. |

No automatic HTTP retry is introduced. Reuse current safe 400/401/403/404,
`AI_OPERATION_CONFLICT`, `AI_AUTHORITY_CHANGED`, `AI_BUSY`, `AI_UNAVAILABLE` and
`AI_OUTCOME_UNRESOLVED` meanings where applicable. Proposed additional codes for
the new contracts are `PROACTIVE_REVISION_PRECONDITION_FAILED` (412),
`AI_SOURCE_UNAVAILABLE` (404), `AI_CONTEXT_SELECTION_CONFLICT` (409) and
`PROACTIVE_INPUT_INVALID` (422). They expose no source text or vendor detail.
Integration must include these exact additions in the single approval packet;
they do not enter the current public catalogue from this document alone.

Idempotency is bounded by the retained occurrence receipt and the explicitly
authorized test window. A terminal receipt cannot become queued. After cleanup,
the old identical command's due time/topic is expired and remains invalid;
this is **not** evidence of a permanent globally remembered nonce registry.
Any new confirmation uses a fresh key. Unknown original outcomes are never
replayed or reinterpreted as a confirmed no-effect.

### D1's exact SDK/identifier candidate — read-only clarification

The bounded SDK audit at Delivery commit
`4a388d9fdb96596482fb7aa30760d0f1dbe203df` resolves only the earlier
token-versus-FID **proposal ambiguity**. The prior `3ed4b3e` / `38c8166` texts
remain historical; neither they nor this clarification approve a dependency,
registration, native change, environment access or send.

The exact proposed addition is `firebase_messaging: 16.7.0`, keeping current
Flutter `3.47.2`, Dart `^3.13.2`, locked Core `4.14.0`, Auth `6.6.1` and Admin
`14.3.0`. Context independently read the local baseline and the
[16.7.0 versioned pubspec](https://raw.githubusercontent.com/firebase/flutterfire/firebase_messaging-v16.7.0/packages/firebase_messaging/firebase_messaging/pubspec.yaml):
its Core `^4.14.0`, Dart `^3.6.0` and Flutter `>=3.27.0` constraints fit those
versions. The [16.7.1 metadata](https://pub.dev/api/packages/firebase_messaging/versions/16.7.1)
requires Core `^4.15.1`, and [17.0.1 metadata](https://pub.dev/api/packages/firebase_messaging/versions/17.0.1)
requires `^5.1.0`; neither is an unchanged-Core addition. Public JSON was read
directly when the web reader could not retrieve it. No solver or package archive
was run/installed, so this is constraint evidence, not a resolved lock or build.

The [pinned 16.7.0 client source](https://raw.githubusercontent.com/firebase/flutterfire/firebase_messaging-v16.7.0/packages/firebase_messaging/firebase_messaging/lib/src/messaging.dart)
provides `getToken`, `onTokenRefresh` and `deleteToken`. It does not provide FID
`register/onRegistered`. Thus F0's wire/storage kind is solely `fcm_token`; no
FID is put into an Admin `token` field. The existing installed Admin `14.3.0`
declarations contain `TokenMessage {token}` and `Messaging.send`, but explicitly
deprecate token messages in favor of FID. Presence of that
[pinned Admin interface](https://github.com/firebase/firebase-admin-node/blob/v14.3.0/src/messaging/messaging-api.ts)
does not prove current provider/project/device acceptance or a migration window.
FID adoption is a separately reviewed client/Core/Auth change, not a fallback.

**Narrow sender correction S1:** Delivery commit
`b8b853208b88dee4d1dc46dc9497a6e67a87305c` supersedes only this paragraph's
earlier `getMessaging(...).send(...)` sender choice at `ce0a5ed`; retain that
commit as history. Integration, Delivery and QA inspected the pinned internal
[HTTP client](https://github.com/firebase/firebase-admin-node/blob/v14.3.0/src/utils/api-request.ts):
the default can retry four times after the initial request for selected
503/network failures, and the inspected public `send` / AppOptions surface
provides no supported retry-disable control. One SDK call is not one HTTP attempt.

The replacement **unimplemented Port contract** borrows an access token only
through the existing initialized app's public `Credential.getAccessToken()`,
then uses pinned Node 24 native `fetch` once for a POST to exactly
`https://fcm.googleapis.com/v1/projects/{approvedProjectId}/messages:send`.
Project/recipient come from approved trusted server configuration, never a
caller/model URL. After the token await, freshly revalidate source/topic/grants,
registration lease, quiet/zone, expiry/runtime/abort, then CAS the one-use sender
claim; after that claim's await, recheck current runtime/abort/expiry immediately
before sending. A valid OAuth token is not business authorization.

Use `redirect:'error'`, bounded abort, transient Bearer header and generic
notification/opaque data only. REST Android fields are
`priority:'NORMAL',ttl:'0s'`, not Admin's millisecond `ttl:0`. No SDK sender,
retrying auth-request wrapper, RetryAgent/interceptor, loop or redirect/SDK
fallback surrounds this message POST. Do not refresh a token after 401 and
re-POST; 503/reset/timeout/abort or an ambiguous body/ACK is never automatically
replayed. Preserve rejected/unknown outcomes; validated provider acceptance is
still not display/read. The credential's own OAuth traffic is not a second
FCM message attempt and is never logged, persisted or returned as product data.
See Delivery's S1 and the [FCM HTTP v1 contract](https://firebase.google.com/docs/cloud-messaging/send/v1-api).

This is a transport requirement, **not proven wire behavior** of an adapter
that does not exist. Future isolated checks must count actual received message
POSTs under 503/reset/delay/redirect and the pinned native dispatcher, rather
than wrapper calls. Credential failure, or revoked/expired/aborted authority
after token/claim waits, must produce zero message POSTs. If that cannot be
established, hold D1. No credential acquisition, sender implementation, transport
test or real call was performed for this documentation correction.

No token getter, auto-initialization/registration, refresh binding, dry-run or
sender call was performed. Before any future SDK initialization, the approved
implementation must keep messaging/analytics auto-init off until the user's
explicit push/cloud-routing choice; a refresh must recheck the current fixed
owner/installation/revision. All dependency/native/configuration changes and
the single-device external test still require their specific approval and
independent validation. No existing manifest/lock/source file changes here.

### Minimal source card, selection and message-anchor resolver

The first source card is for `conversation_message`; later explicitly selected
Check-in/Event cards are conditional extensions. Propose the outward shape:

```text
{ cardRef, kind:conversation_message|check_in|event,
  sourceOccurredAt, observedAt, version,
  state:available|changed|unavailable|denied|verification_failed,
  canNavigate, selectionKey? }
```

`cardRef` is a server-issued opaque locator scoped to the owned message receipt,
not a model-written source ID or URL. It maps to the authoritative source and
version. `selectionKey`, when a draft picker is separately enabled, is a
request-local owner/session/topic/purpose/target-bound mapping to **RecordKind**.
It is not `SourceRef.kind`: Event's source kind `event` maps to record selection
`event_intent`; a location projection and Check-in can share an underlying
Check-in source. Client code must not cast one enum/ref into another.

Proposed source tap operation:
`POST /v1/me/ai/source-references/resolve`, exact body
`{conversationId,messageId,cardRef}`. Authenticate current owner, require a live
available message and valid versioned receipt, then reread current source
authority. Return a typed authorized target only: a Check-in detail ID, canonical
Event ID or the message anchor below. Do not return a database path or arbitrary
URL. Changed source → `AI_AUTHORITY_CHANGED`; deleted/denied/expired reference →
`AI_SOURCE_UNAVAILABLE`; unknown verification → `AI_UNAVAILABLE`. Preserve draft
and choices on failure, show review, and obtain a new compatible preparation.

This saved-message resolver has no draft-exclusion input and cannot decide a
draft selection conflict. `invalid_selection` / `AI_CONTEXT_SELECTION_CONFLICT`
belongs to the separate prepare/execute selection boundary described under F1,
where the current request's exclusions and inherited dependencies are known.
Temporary exclusion never permanently deletes or hides historical messages.

Proposed notification/message locator:
`GET /v1/me/conversations/{conversationId}/messages/{messageId}/anchor`, no body
or query. Freshly verify owner/topic/retention and exact message availability;
return `{conversationId,messageId,sequence,pageBefore}`. `pageBefore` is exactly
the string `base64url(JSON.stringify({v:1,before:sequence+1}))`, canonical and
unpadded, using the existing parser/encoding. Call the current transcript GET
with **`?before=<pageBefore>`**; its response continuation is `nextCursor`.
It is not a bare sequence, `?cursor=`, or an authorization token. Check overflow
and page invariants. Read that existing transcript page,
find the exact ID/sequence, then scroll/highlight; if it is absent or unavailable,
stop without navigating to an unrelated/latest message. Missing/denied/expired
target returns 404; verification failure returns 503. Duplicate clicks are safe.
If signed out, authenticate first; after account replacement, resolve afresh.

For a reply to a proactive message, a real user's explicit Send may carry an
optional `replyToMessageId` in the reconciled execute contract. Backend resolves
that live owned same-topic proactive message before using it as one labelled
prior assistant suggestion and linking the real user row. It does not invent a
user turn or count the standalone proactive message as a complete two-turn
history pair. This optional input/read-model extension needs the same approval;
legacy execute requests and unknown-result recovery retain their behavior.

### Proposed durable records and atomic effects

These are candidates in the existing Firestore datastore, never client-direct
Firestore access. `owner` is the server-resolved existing account ID.

| Path | Exact proposed minimum persisted fields / lifecycle |
| --- | --- |
| `accounts/{owner}/proactive_state/current` | `revision,grantGeneration` plus settings above, `activeIntentIds` (max3), optional `inFlightOccurrenceId,lastAttemptedAt`, bounded `rollingAttemptTimes`. No source body. Advance grant generation for eligible-scope changes; compare/prune the old budget atomically. |
| `accounts/{owner}/proactive_occurrences/{intentId}` | One intent/effect/outbox record: `revision,state,conversationId,sourceMessageId,category,dueAt,expiresAt,timeZone,processing,settingsRevision,grantGeneration,authorizationScope,topicLifecycleVersion,requiredSources,requiredCategories,createdAt`, optional `messageId,messageSequence,publishedAt,attemptedAt,providerAcceptedAt,registrationRevision`; `dispatchState=not_started/dispatching/accepted/unknown/skipped`. `authorizationScope` is the trusted non-token intent-purpose epoch described above, never credentials. On `state:published`, `messageId,messageSequence,publishedAt` are all required; `publishedAt` is server commit time. Source/version/category proof is server-owned. No raw prompt/output, title, body, token or cached notification payload. Terminal records minimize to non-content effect identity/state/times after required invalidation, expire with the containing topic, and cleanup within 24h. No permanent nonce guarantee is implied. |
| `accounts/{owner}/proactive_registration/current` | `revision,installationRef,registrationKind:fcm_token,registrationValue,enabled,registeredAt,expiresAt`; no old registration values or FID union. F0 expires no later than the named 30-minute test end +15min and erases/disables on acknowledged completion/withdrawal/sign-out. No promise about immediate removal from Google backup. |
| `accounts/{owner}/conversations/{topic}/read_state/current` | `revision,readThroughSequence,updatedAt`; delete/expire with topic. No message text; reads/marks never advance Q14's anchor. Unread means currently authorized available proactive messages after the watermark. Use a dot rather than fabricate a count from a partial page. |
| Existing `messages/{messageId}` | Genuine `role:assistant,origin:proactive`, server sequence/time, canonical accepted text, occurrence/category identity, existing presentation usage metadata and immutable `appendBefore` equal to the **old** topic cutoff. Explicit server-owned retention effect is non-advancing under R-ANCHOR. No `replyToUserMessageId`, fake user or orphan pair receipt. |
| Existing `message_sources/{messageId}` | A versioned `source_use_v2` receipt for new messages only: scope purpose/processing target, complete flattened `{kind,id,version}` dependencies, `requiredCategories` and server-issued per-card opaque references. F0 message version is backed by immutable source ID/sequence/full-precision persisted time. No source body, title, coordinates, source-content hash or reconstructed Persona. Old receipts are not backfilled or silently interpreted as this schema. |
| Optional `accounts/{owner}/proactive_transport_diagnostics/{permitId}` | Only with separate T1 authorization: `revision,installationRef,canonicalMessageId,permittedDeviceState:background/ordinary_closed,expiresAt,attemptLimit:1,state:not_started/dispatching/accepted/unknown/skipped`, optional `attemptedAt,providerAcceptedAt`. At most two operator-created permits, no public create/send endpoint. Current non-frequency guards still apply; no model call/new canonical message, raw payload or registration value. Minimize/delete within 24h of test end. |

The durable source receipt is a **business-source** allowlist, not a dump of
`PreparedContext.dependencies`. Used Persona identity/version is an ephemeral
in-flight deletion guard only; after acceptance, keep exactly Q19's existing
`presentationMode` / `presentationProjectionVersion` usage metadata. Never
persist a Persona ID/name/revision/style snapshot in the new receipt or resolve
a deleted Persona to read historical messages. Historical business-use categories
do not turn a past Persona into a live source dependency. This retains Q19's
special Persona lifecycle rather than silently widening its metadata allowlist.

The server-only `appendProactive` Port receives the trusted original topic,
occurrence, current source/category/consent proof and candidate text. In one
transaction it rechecks source/grant/topic/owner-budget versions and original
topic cutoff, then creates message + source receipt and changes the same
occurrence's effect/outbox exactly once. Message sequence advances; old
`lastPersistedMessageAt`/90-day anchor does **not**. The existing normal real-user
message/reply path still advances its anchor as approved. This is R-ANCHOR's
specific Q14 exception; it requires explicit approval and corresponding
store/history/serializer/retention-resolver changes. Pure helpers do not provide
this atomic guarantee.

Commit the canonical message, `state:published,publishedAt` and
`dispatchState:not_started` outbox together.
Charge its single contact/frequency reservation once at that canonical publish.
The owner-state `lastAttemptedAt` / `rollingAttemptTimes` in this proposal are
contact-budget timestamps; occurrence `attemptedAt` is the later physical sender
claim. Provider submission/ACK must not charge a second contact. A future adapter
must map these named fields explicitly rather than treating a wire/storage
shape as the pure policy's existing types. Immediately before an
external call, reauthorize current source/grants/topic/installation/quiet time,
then atomically compare-and-change **not_started → dispatching**, recording
`attemptedAt`/installation revision. Only that winner may invoke the sender.
Do not place a model or provider call inside a retried transaction callback.
Successful provider acceptance changes status to accepted, not delivered/read.
A timeout or crash after this claim is unknown and never automatically resent;
a crash before the claim is provably unattempted and can only proceed after a
new complete authorization check within the existing expiry. This distinction
closes the otherwise ambiguous “claim dispatching again” recovery seam.

Deletion/withdrawal fences contend with the same current source/grant/topic
versions. They stop uncommitted work; after commit they also make dependent
canonical content unavailable when the source itself is deleted or its retained
use is no longer authorized under the approved source-use lifecycle. Turning
proactive contact off stops future generation/push; it is not a command to
delete already accepted history. Ordinary owner history reads use their own
read authority, not a requirement that proactive contact remain on. Off or
intent cancellation cannot recall a generic external notification already handed
to the provider. Source receipt IDs disappear after invalidated content is
tombstoned. Whole-topic deletion remains the owner-confirmed operation; no test
cleanup silently deletes individual accepted messages or existing user data.

The first validation uses a trusted allowlist of **one existing owner and one
fixed installation**; other owners/installations cannot register or dispatch.
An owner-local registration row alone does not establish general cross-account
installation uniqueness. General transfer/reverse binding needs an explicit
contract before expansion. Offline/unknown unbinding may not yet be observed by
the server; a short lease, generic notice and authenticated click reduce that
window, but do not establish instantaneous revocation or platform recall.
App account replacement clears private content and never opens another owner's
target from an old notice.

### First external verification and resource envelope — Proposed

The precise prospective authorization is one LI-designated existing test account,
one LI/SHI-operated device, synthetic content, one named 30-minute window and at
most one FCM message POST attempt per observed app state (foreground, background via Home,
ordinary close). No credentials, real-source cloud payload, force-stop bypass,
new participant or 20-person pilot is included.

`attemptLimit:1` / the at-most-three total limit counts actual FCM message POST
attempts, not SDK calls, OAuth exchanges or device displays. A consumed
`attemptedAt` claim can precede a crash with zero actual requests; unknown still
must not replay. Canonical contact budget is charged once at `publishedAt`, not
again for the message POST. No provider request promises exactly-once display.

With the proposed 1-per-24h cap, Delivery's T1 is **one normal complete E2E** plus
at most two separately approved transport-only diagnostics referencing that
same canonical message. Those diagnostics must have distinct trusted one-shot
permits, no new model call/message, no normal-cap mutation and clearly separate
evidence. They do not prove three full proactive-policy E2Es. T2 instead runs
normal cases on separate eligible days/windows; it is not automatically granted
by T1. Force-stop is a separately reported platform limitation, not ordinary close.

Delivery proposes a ceiling of 512 document reads, 64 writes, 16 deletes, 64 KiB new
logical data plus actual index overhead, 1 MiB incremental database traffic and at
most three sub-512-byte generic notification packets. These are estimates, not
meter observations. They assume bounded known references and a small verified
topic inventory; preflight must count the actual metadata/source read plan and
stop if it cannot fit. A larger topic, additional source preparation/model call,
or unbounded full-inventory read cannot inherit these numbers. No global due
scan, new composite index/database, managed scheduler or hidden background
listener is approved by the estimate.

The real-account/group source launcher rejects Emulator endpoints and selects
remote Firebase; local Qwen does not make its Firestore storage local. Integration
must match the actual running launcher/region, existing quota and credentials
without exposing them, and replace price assumptions before any spend. Delivery's
conditional USD 0.01 incremental **non-model** test allowance is a proposed cap,
not a bill estimate, available quota, prepaid balance or permission to upgrade.
No cloud model budget is included. Stop on unknown identity/cost/capability or
the resource ceiling; do not install dependencies, send a notification or deploy
to make the proposal appear complete.

## Separately selectable F1 — manually chosen private context and cards

**F1 is a separate choice from F0 and C.** Approval of explicit follow-ups does
not enable these sources. F1 proposes a current-user, one-request **local reply**
purpose only; no proactive reuse, cloud transfer, recommendation ranking,
training/embedding, stored profile or automatic later reuse. With no current
selection, new Check-in/participation data remains off. Location is deferred,
including saved coordinates and the existing display-only `locationLabel`.

| Independently approvable part | Data and limits | Retained boundary |
| --- | --- | --- |
| F1a: hand-select own Check-ins | Current Note as a quotation; normalized stored Mood/Activity labels and authoritative `occurredAt`; at most 5 selected eligible sources in the inclusive last 7 days, newest first with ID tie-break. | No other owner's record, Weather addition, coordinate, place label, current-Mood inference or Event/Interest mapping. Explicit attachment cannot override the time/limit/permission gate. |
| F1b: hand-select own current Interested/Going | Status and server update time for at most 3 selected own canonical Event IDs; when separately valid, the currently authorized source title/start/end/venue label and provider availability. Each intent and Event has its own version/observed time. | `none` removes intent context; provider failure never removes an owned fact or fabricates content. Interested/Going are intentions, never booked/attended/completed. Source time and latest observation are separate. No other user's participation or provider-document/archive expansion. |
| F1 cards and selection control | Owner-visible minimized source cards and typed resolver, with per-request attach/exclude/review and correct detail navigation. | No model-written IDs/URLs, raw Backend provenance, Persona ID, account UID, source excerpt archive or cross-topic search. Selection is temporary and never a permanent record deletion. |

The fields above are the requested **data-use scope**, not evidence that a new
real reader exists. F1a can use a trusted owner adapter's Firestore source
creation/update metadata plus the actual business revision: creation identifies
the entity, update identifies its content state, while business `createdAt`
remains the historical occurred time. A changed storage identity is denied;
an edit is rebuilt. No legacy version is fabricated or repaired on read. These
metadata are version/provenance only, never model input or content hashes.

F1b's stable participation revision is already defined by EP1. Current code
does not expose a stable provider revision for the Event projection. A targeted
official-document check on 25 October confirmed the Discovery detail/status
surface but did **not** establish a usable `lastUpdated` or ETag contract for
this adapter. That is a bounded research observation, not a claim that no
provider mechanism can exist. See the [official Discovery API response fields](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/).
The Feed's file timestamp or a different API's modification field cannot be
substituted. No new feed/download/provider API is selected.

Consequently F1b's provider-derived fields stay unavailable until the actual
approved reader can demonstrate fresh status and a truthful source-version /
same-entity contract, including cancellation/time changes and history reads.
Do not pass a selected Event with invented version, silently omit it, persist
an unapproved title snapshot/hash, or infer cancellation from a missing row.
F1a and existing flows continue independently. Approving F1b's purpose/field
scope does not waive this technical/license/acceptance gate.

### Proposed F1 delta to the existing operation contract

This is a concrete backward-compatible proposal, not an implemented API:

1. Existing `POST /v1/me/ai/operations` keeps its current fields. A separately
   enabled F1 request may add exactly
   `contextSelection:{processing:local,sources:[...]}`. Each unique source is
   either `{kind:check_in,checkInId}` or `{kind:event_intent,eventId}`; no owner,
   paths, source bodies, arbitrary maps or model-chosen database selectors.
   Those typed locators originate in existing authorized owner pickers. This is
   the precisely limited new user-selected-source exception requested for Q17,
   not permission for arbitrary client-selected database context.
2. Backend authenticates and reauthorizes every selected record, validates time /
   counts / current same-owner source facts, and captures source identity,
   content version, consent generation, session/topic/purpose/target in the
   existing in-process prepared-operation lifetime. New data-use permission is
   **the exact selected source set for this request**, not a category-wide grant
   to all owned records. It returns the existing operation fields plus
   `contextSelection:{selectionRevision,expiresAt,sourceCards}`; cards carry the
   trusted request-local selectionKeys. No new durable selected-context cache.
3. The final execute adds exactly
   `contextSelection:{selectionRevision,includedKeys,excludedKeys}` alongside
   the existing text. Keys must belong to this prepared operation and scope;
   exclusion wins and maps to all projections/inherited dependencies of the
   underlying source. Any unrecognised/expired/cross-scope key fails. If the
   prepare requested F1 context, omission of this execute selection is a visible
   conflict, not a silent context-free send. Older prepares without F1 retain
   their old execute contract.
4. Recheck every selected source before generation and before persistence /
   delivery. Changed source → `AI_AUTHORITY_CHANGED` and review a newly prepared
   version; missing/denied → `AI_SOURCE_UNAVAILABLE`; unknown → `AI_UNAVAILABLE`.
   An included history pair whose flattened source inventory conflicts with the
   selection/exclusion → `AI_CONTEXT_SELECTION_CONFLICT`, without a model payload.
   Draft choices remain available to review; do not strip provenance while
   forwarding the inherited assistant text. A new source attachment requires a
   new owner action/preparation, not an untrusted key inserted at execute.
5. Required historical categories **and exact source identities** must be in
   the current permitted selection closure. Choosing Check-in A cannot allow
   Check-in B through an old assistant. A one-request use does not authorize
   automatic new-request reuse merely because a past message remains readable.
   Current source-free history/Persona behavior is retained; generated text is
   still a suggestion, not a new authoritative business fact.

The pure `ContextAuthority.allowedCategories` check is only part of this
boundary. The real F1 reader must establish per-source selection authority and
complete, time/size-bounded history dependency closure **before** supplying its
trusted `ContextRead`. The synthetic category checks do not constitute that
real per-record proof. This missing production adapter/selection integration is
explicit work remaining after a scoped choice, not an already-passed test.

Source cards for accepted F1 messages use `source_use_v2` and the saved-message
resolver described above. At actual navigation, recheck ordinary owner read
authority and current source version. A current request's temporary exclusion
does not alter old stored messages or their card resolver. Permanent source
deletion or withdrawal of its retained use applies Q19's whole-assistant
unavailability/tombstone rule; keep no deleted-source ID after cleanup. Source
version/category data must not outlive the retained message/topic. UI source
view permission and permission to reuse its content for a new AI request are
separate purposes.

### Explicit supersession scope and decision summary

- **F0 choice:** the new `explicit_follow_up` purpose, genuine proactive origin /
  server-only append, four minimal records, source receipt/resolvers/read-state,
  R-ANCHOR exception and bounded delivery mechanism. Old topic contents, normal
  user/reply retention, history/search/deletion and no-tools model boundary stay.
- **F1a / F1b choice:** only the listed current owner's selected fields for one
  local reply. Locally replaces the 19 October automatic-Note-off combination
  **only when this request explicitly selects an approved source**. Does not
  turn on background/private-source ingestion or change recommendations.
- **F1 card choice:** locally replaces Q19's no-outward-provenance rule only for
  the minimized owner projection/resolver; Backend raw provenance stays private
  and no IDs enter model metadata. Adds version/category receipt and edit /
  source-loss handling only for new source-bearing messages. Old records are
  preserved; legacy proof is neither invented nor backfilled.
- **Still deferred:** Location, cloud data/model/budget, Going or Check-in-triggered
  proactive scenarios, general cross-account installation transfer, additional
  notification previews, all-source defaults, persistent inferred memory and
  general Release/Done. Each remains separately gated even if F0/F1 is selected.

For LI's single decision packet, these can be accepted separately: **F0 only**,
**F1a only / with F0**, and **F1b purpose boundary** with its explicit provider
technical gate. The notification test choice is separately **in-app only**,
**T1 one E2E + two transport diagnostics**, or **T2 separate normal windows**.
No response to C's entry choice is interpreted as any of these approvals.

## Approved F0 persistence slice — 25 October implementation

Implements LI's [first-flow decision](../../decisions/2026-10-25-li-ai-companion-first-flow.md)
from common baseline `ce6782c`, with the shared Ports `42b0b2a` / `ff00e7c`.
This slice supplies `FirestoreFirstFlowStore` and the same-transaction
`FirestoreConversationStore.firstFlowTransaction` bridge. Integration injects
one shared `withRetainedMessageTimes` gateway, a fixed owner, and (only after a
named window is approved) the fixed installation and absolute registration
lease end. Missing installation/window denies registration and dispatch.

Canonical publication atomically appends a genuine standalone assistant,
`source_use_v2`, parent sequence, occurrence/outbox and one frequency charge.
It creates no fake user or accepted-pair pointer. The original source is a
settled real user message; current Auth, binding, account purpose epoch,
settings grant, live topic, source version and current Persona existence are
checked again at each stage. Revoke/regrant cannot revive an old occurrence.
Persona edits and active switches retain the started snapshot; deletion denies.
The HTTP read models omit authorization scopes, raw source refs and registration
values. Source-card versions contain metadata only, without raw source IDs.

R-ANCHOR applies to transcript reads, cleanup and maintenance inventory.
Standalone proactive rows (including tombstones) preserve the prior cutoff;
a later real user/reply may advance it under the unchanged ordinary rule.
Owner source resolution and message anchors reread current authority and use
the existing message-page bound. Read-watermark CAS never appends a message.

Production timestamp conversion uses Firestore `serverTimestamp` for both
`publishedAt` and the approved scalar `lastAttemptedAt` in the SAME transaction.
Firestore cannot place that transform inside an array: raw state stores an
empty `rollingAttemptTimes` plus the scalar; the infrastructure wrapper projects
that scalar to the bounded inner array. Its nanosecond value is rounded UP for
the frequency lower bound, so the next 24-hour window cannot start early from
millisecond truncation. Public occurrence time remains a millisecond projection.
Later settings/outcome writes preserve both original commit timestamps.
`publish` performs a new authenticated readback after a definite commit ACK;
missing/unresolved timestamp evidence returns unknown, never an admission-time
receipt. Old records receive no fabricated timestamp or provenance backfill.

A lost transaction ACK is read back; no generation or send happens inside a
transaction or as automatic recovery. Interrupted unpublished work fails;
`dispatching` becomes unknown and cannot reclaim a sender capability. Published
`not_started` work still needs the fresh post-credential claim. Off cancels
unstarted work; preview-only settings changes preserve its eligibility grant.
Ordinary accepted history does not depend on proactive mode remaining on.

Validation: pinned Node 24.19.0 / TypeScript 7.0.2 strict build, and **461/461**
local Node tests (all `ai-conversation` cases plus the F0 store cases). The new
cases include Auth-await zero transactions, exact source and purpose changes,
staged-write rollback, commit-with-lost-ACK readback, one-use unknown dispatch,
read CAS, lease expiry, five-second sequential-read freshness, U1/A2/P3/U4/A5,
and server-timestamp adapter contracts. These are fake-gateway/source tests;
the adapter fixture simulates transforms and does NOT prove actual Firestore
commit metadata. Emulator proof, real services/accounts, model calls, device
registration, provider sends, deployment and device acceptance are not supplied
by this slice. F1a selection/executor wiring follows separately.
