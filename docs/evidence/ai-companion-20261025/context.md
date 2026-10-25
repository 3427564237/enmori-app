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
over attachment; excluded content and dependencies are absent.

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

Strict compilation passes; the latest candidate batch passes **42/42** Node
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
