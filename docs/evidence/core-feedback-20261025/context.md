# Context / Backend — core feedback, 25 October 2026

Baseline: `087281e11ec5a681fd012b9d64431b225ed6f8ea`.
Branch: `souma/core-feedback-context-20261025`; the previous
`souma/ai-companion-context-20261025` branch remains at `149ba2671f159377d6a0856744dd8028af9f0474`.
Actual worker: `gpt-6.1-sol`, reasoning `max`, checked against this chat's current
`turn_context`. This is source evidence; it does not independently reproduce the
reported v28 phone symptoms.

## Authority and scope

The [new LI decision](../../decisions/2026-10-25-li-core-experience-repair.md)
replaces the mandatory manual-only Check-in entry direction in
[first-flow](../../decisions/2026-10-25-li-ai-companion-first-flow.md) with automatic
use of today's own Check-ins. It retains purpose/permission, deletion/version,
unknown-operation, retention and draft protections. The exact day/limit/exclusion
contract must be recorded before treating a proposed interface as approved.

Recommendation facts below use [Q03](../../decisions/2026-09-01-deterministic-v1-recommendation-formulas.md),
[Q17](../../decisions/2026-09-01-recommendation-ai-field-allowlists.md),
[InterestTag/EventCategory clarification](../../decisions/2026-09-02-interest-tag-event-category-contract.md),
and the retained [real Event selection](../../decisions/2026-10-15-li-real-event-contract-selection.md).
The new request to audit additional factors does not define their weights or
silently supersede those purpose-specific restrictions.

## Automatic current-day source audit

- `check-ins/application/check-in-history.ts::parseCivilDay` already validates a
  canonical IANA zone using the existing Temporal dependency. Its interval is
  `[local midnight, next local midnight)` converted to UTC, including DST changes.
  `FirebaseAdminCheckInHistoryGateway` queries owner plus that range, ordered by
  `createdAt DESC, documentId DESC`. The ordinary history API returns 20 rows with
  one extra sentinel and an opaque owner/date/zone-bound cursor.
- Current `SelectReplyContext` accepts only `{processing:"local", sources:[...]}`,
  at most five unique Check-in IDs. `sources:[]` is already valid. The mutable F1
  adapter freshly verifies binding, current purpose consent, own source, actual
  service/business versions and the preceding seven days. It projects only Note,
  Mood, Activity and original occurred time to the existing selected reply path.
- That interface contains no server-enforced today selector, IANA zone or day
  range. Client history filtering alone must not be called a complete server
  current-day contract. Automatic source lookup must not re-enable the old
  immutable Note reader or turn a failed lookup into zero Check-ins.
- Existing prepare/execute can preserve exact included/excluded keys, history
  exclusions, version changes and the original unknown operation. A new topic
  with zero Check-ins can use the same selected path. A continuing topic can
  still have a genuine conflict where old history depends on an unselected
  source; automatic today selection does not authorize that old source.

Integration recorded the compatible union in
[`api/ai-today-context-contract.md`](../../../api/ai-today-context-contract.md),
commit `72fc616ca81d6d7703fc139600ce959d7a84dc9e`. Context read that complete
contract before completing the implementation. The same Root instruction
explicitly delegated the one shared transaction-gateway extension and its
Admin/fake implementations; bootstrap and HTTP/API remain with their owners.

The implemented automatic prepare form is
`{processing:"local",today:{timeZone:"Asia/Singapore"}}`. The existing explicit
`sources` form, including `sources:[]` for off, is unchanged. The source reader
captures server time, performs a bounded owner/day metadata query and exact
versioned source reads in one transaction, retains the latest five and uses the
sixth only for `hasMore`. It validates the returned ownership, range, complete
order and capacity instead of trusting a malformed projection or ranking an
arbitrary prefix. It does not fetch a sixth source body or backfill exclusions.

Only automatic prepared cards add the current owner's `checkInId` for matching
topic-local exclusions to fresh keys; manual cards retain their original shape.
Public day metadata is `date/timeZone/limit:5/hasMore`. The internal request-only
grant binds that day; both the Application execute gate and accepted source read
reject a day rollover before acceptance. A rollover during preparation is also
an explicit selection conflict. The date/zone/IDs never enter the model or a
new persisted memory/category permission. Exact source edits, deletion, purpose
changes, history dependencies and original operation identities remain on the
existing selected-reply path.

The pre-effects midnight gate is a source-level fact, not a client-visible effect
stage. This packet adds no public effect-stage field. A generic
`AI_CONTEXT_SELECTION_CONFLICT` can also occur after the original user message
was saved. After any HTTP execute dispatch, the client must keep the original
operation and read it back to establish `noEffect`, or retain `userSaved` and
Retry the original user message. It cannot infer safe resend from a 409 or a
midnight explanation. Only a failed preparation with no execute dispatch can
directly start fresh preparation. This corrects the author's earlier incomplete
peer instruction about canceling a prepared midnight ticket before another Send;
App's conservative original-operation recovery remains controlling.

The actual simple-chat `withRetainedMessageTimes` wrapper explicitly forwards
the new optional gateway capability. This is necessary because that wrapper
lists its methods rather than automatically forwarding new ones. The existing
`firestore.indexes.json` owner ASC / createdAt DESC / document ID DESC index
matches the query; no collection, index, dependency or infrastructure change was
introduced.

## Recommendation formulas and actual source supply

| Factor | Event v1 | Friend v1 | Current approved boundary |
| --- | --- | --- | --- |
| Interests | One point per distinct matching active InterestTag | Two points per shared distinct active InterestTag | Existing implemented factors |
| Interested / Going | No contribution | One point per distinct common Event in both users' authorized Interested/Going unions | Candidate participation visibility and current source checks apply |
| Location | No contribution | No contribution | Q17 does not approve this scoring input |
| Age / school / organization | No contribution | No contribution | No v1 factor/weight or purpose-authorized scoring DTO |
| Friends' participation in Event ranking | No contribution | Not an Event ranking factor | Would require an explicit new purpose/formula contract |

Event ranking is `score DESC, startAt ASC, opaque Event ID ASC`, after future,
active/published and nonzero-match filtering. Friend ranking is `score DESC,
sharedInterestCount DESC, commonEventCount DESC, candidate ID ASC`, after
eligibility, discoverability, consent, field privacy, self/friend/block/pending
and requester-ignore filtering. Q03 requires ranking before Home Top 2; random
client order would not satisfy it.

The retained real runtime uses `createControlledEventRecommendations` with the
same guarded `BrowseSource` as browse. It does **not** use the synthetic
`FirestoreEventRecommendationRepository.listEvents` catalogue for this path.
Ticketmaster's first batch is Singapore, page 0, size 20, ordered by date. Only
`musicSegment === true` maps to the explicitly bound Music InterestTag. Other
interest categories are not inferred from titles or labels.

`ControlledSourceProjection.firstBatch` retains a complete process projection
for less than five minutes. Recommendations rank its first-page candidates;
explicitly browsed later pages are available for source lookup but do not enlarge
that recommendation pool. `RecommendEvents` accepts only `home/all` and always
slices Home to the same first two eligible results. Refresh has no rotation or
seen-set parameter. This explains the stable first group at source level; it is
not proof of the reported physical-device sequence. A new batch needs a concrete
server contract for choosing the next group from the same approved ranking and
for bounded access to later real pages.

The Friend producer is registered at `/v1/recommendations/friends` in the retained
remote social composition. Its common-Event supply is `socialEventSource`, which
uses current authorized participation plus the process projection's future-event
lookup. It does not read a friend's unrestricted Event history. Cold, expired or
pending projection health fails as unavailable when a permitted participation
factor is needed; it must not masquerade as zero matches. A participation whose
Event is outside the observed current projection contributes no common Event in
this composition. Formula implementation alone therefore does not establish
complete real-service candidate coverage.

## Missing discovery entry: source-level cause

`FriendDiscoveryPanel` is only mounted by `FriendModulePage` in the baseline.
No Home widget mounts it. Friends defaults to My Friends (`_view = 0`); discovery
is its third view, and the panel uses the title “People to know”. The endpoint
and repository exist, so an absent Home entry is not evidence of an absent
Backend recommendation API. Integration owns the Home fix; App owns the Friends
entry. Empty, unavailable and ignored results remain distinct states.

## Validation and remaining evidence

The initial today packet's strict TypeScript compilation passed using the existing pinned Node 24.19.0 /
TypeScript 7.0.2 toolchain. The focused suite passed **78/78, zero failures**:

```text
backend/test/ai-conversation/today-selected-reply.test.ts
backend/test/ai-conversation/today-check-in-gateway.test.ts
backend/test/ai-conversation/selected-reply.test.ts
backend/test/ai-conversation/application-conversation-operations.test.ts
backend/test/ai-conversation/retained-message-times.test.ts
```

The new cases cover own-day/server-time boundaries, other owners, future rows,
DST, descending ID ties, the cap sentinel, empty-day ordinary chat, unavailable
query versus empty success, invalid projection/selector, exclusion without
backfill, midnight conflicts before effects, source versions/deletion/consent,
model minimization, owner-only automatic card metadata, and the actual Admin
query shape through the retained-message wrapper. The Admin query test uses a
fake SDK transaction; it is not Firestore runtime evidence. Existing selected
history and original-operation regressions are included in the focused suite.

No Flutter/Gradle/APK, provider/model request, emulator, service write or phone
operation ran in this packet. No historical failure set was swept. Root must
integrate its HTTP/API companion changes and App's matching UI before claiming
the new automatic path is available. Real-service and physical-phone evidence
remain separate. Source findings and the agreed shapes have been sent to
Integration, App, Product, Runtime and Delivery within their ownership boundaries.

## Bounded Friend source readiness follow-up

Integration authorized this follow-up after reviewing the concrete cold/expired
projection cause. `FriendEventProjection` now offers optional
`prepare(asOf):Promise<void>` for the same existing public Event source, outside
any Firestore transaction. `read` receives the complete ranking transaction's
one captured `asOf`, shared by requester and candidate Event projections.

When preparation is supplied, the producer first checks current owner and purpose
in a read transaction, waits for preparation outside it, then starts the complete
recommendation transaction and rereads owner, consent, candidates and all privacy,
relationship and ignore rules. A failed preparation stays unavailable; it cannot
replace unknown common Events with zero or change scores/order. Consent withdrawal
during the wait stops before candidate construction. Compositions without the
optional preparation retain their old path. This public source preparation uses
no personal Event associations. Concurrent refresh/disable or genuine provider
failure may still fail closed; the change does not invent a stale fallback.

Integration owns connecting preparation to the same guarded
`eventBrowseControl.source.firstBatch(asOf,signal)` and using the supplied `asOf`
in `socialEventSource` ready/peek. Context did not edit projection, bootstrap,
provider, cache duration, formulas or authorization semantics.

Four focused regressions were added to `friend-recommendation-source.test.ts`:
waiting outside transactions for cold/expired/pending supply; no warm/candidate
reads for missing owner or withdrawn purpose; provider failure without an
interest-only fallback; and permission revocation during the wait. They have
**not been executed in this follow-up**, in accordance with LI's request to
finish promptly and concentrate tests at Integration's final head. The earlier
78/78 count belongs to the initial today packet, not these new regressions.

The additional Emulator script was stopped before any file or service was
created. The existing compiled `selected-reply-first-flow.integration.test.js`
can be reused in the scheduled isolated environment with
`ENMORI_F1A_EMULATOR_PROOF=true node --test` (the file is under
`backend/dist/emulator-test/`). Its existing five author cases prove the lower
selected-source/store boundary, not the new today HTTP form. Final composed
today coverage should reuse the existing `createIsolatedConversationComposition`
plus `buildApp` harness with `simpleChat:true`, `selectedReplies:true`, synthetic
transport and the trusted `utcMilliseconds` test seam: empty-day chat; latest
five/hasMore and identity exclusion without backfill; explicit off; edit/delete
and civil-day conflicts; and original-operation readback after any dispatched
execute. No new service window or independent tool framework was requested.
