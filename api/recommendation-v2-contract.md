# Current authorized recommendation inputs (26 October 2026)

Implementation contract under the delegated 25 October recommendation-completion
decision and 26 October all-interest assignment. This is not a new PM decision.
Earlier v1 compositions remain supported. No new route, collection, index,
credential, dependency, provider or persistent recommendation history is added.

## Event

The retained composition selects event_recommendation_v2. Before personal reads,
the controlled provider projection obtains every available page atomically,
with the existing SG source, 20 raw occurrences/page, maximum 50 pages/1000 raw
occurrences and a 10-second aggregate deadline measured from entry, including
any wait for a shared source read. A cancelled/timed-out waiter does not cancel
the shared owner's request; its own traversal cannot publish after expiry.
Capacity, inconsistent paging,
conflicting duplicate identities, later-page failure and retired source
generation are unavailable, not partial success or a successful empty batch.
The same complete projection supplies current social participation identities.
An explicit new first page or replacement later page retires prior rankings.
The existing five-minute cache, disable/stop gates and exact future-time filter
remain. Sequential pages are an observed traversal; the upstream API does not
provide a cross-page snapshot token. Moving provider data is not claimed atomic.

Current authenticated owner, optional-processing consent, active selected tag
IDs/catalogue, current friend relationships/field privacy and own Event ignore
state are read in one Firestore transaction. Provider I/O is outside it.
The source generation is checked inside and after the transaction. Missing,
malformed or failed required sources are unavailable; revoked consent is empty.
No source/private factor values persist between requests.

Score = 4 per distinct matching active interest + 2 per distinct authorized
friend with Interested OR Going (maximum five friends contributing points) +
1 for an exact normalized match of the owner's existing region against a
provider venue city/country. Interested and Going by the same friend count once.
Under the [15 November ordering amendment](../docs/decisions/2026-11-15-li-event-interest-first-ordering.md), candidates with at least one current active selected-interest match precede all candidates with none. Within each group, score remains descending.
Ties: start instant ascending, then stable Event identity ascending. Eligibility
requires at least one positive approved signal. Home is the first two entries of
the same complete order; See all/next groups do not reshuffle or repeat them.

Ticketmaster interest matching uses explicit provider classifications, never
event titles or descriptions. Under the [17 November interest-discovery amendment](../docs/decisions/2026-11-17-li-interest-discovery-uiux.md),
onePA alone also uses the approved finite title phrases, normalization and word
boundaries in that decision. No description scan, fuzzy inference or new phrase
is implied. Music retains its configured catalogue ID; Ticketmaster uses its
exact segment ID, while onePA may supply its explicit Music concept.
Other current catalogue display names bind to the exact concept names in the
coverage matrix. Deactivation/renaming/removal stops matching on the next read;
no historical name alias is guessed. Region comparison uses NFC, trimmed and
collapsed whitespace, case-folded strings; no precise GPS, inferred distance,
age, mood, Check-in notes, AI output or school guess is used for Events.

GET /v1/recommendations/events?view=home|all keeps existing auth/error/no-store
semantics. V2 adds formulaVersion event_recommendation_v2, item reasonCode
relevance_match and 1–3 distinct reasons {code,count,points}:

| code | Meaning | points |
|---|---|---|
| shared_interests | Count of returned matchedInterests | 4 * count |
| friends_participating | Distinct currently permitted friends | 2 * min(count,5) |
| same_region | Existing region matches source city/country; count=1 | 1 |

V2 may have zero matchedInterests when another genuine signal qualifies.
The Dart adapter rejects duplicate events/reasons, inconsistent weights/counts,
unknown reasons and missing V2 reasons. It still accepts existing V1 responses.
Public payloads do not expose friend IDs, source records, raw profile fields or
internal total scores. UI text renders only supplied reasons.

The optional source availability and coverage projections belong only to the v3 response;
v1/v2 representations omit both, including when reranked from a v3 snapshot.
The [17 November supplemental-query amendment](../docs/decisions/2026-11-17-li-supplemental-query-degradation.md) permits completed onePA default/supplemental groups after every task settles within the unchanged source budget. It does not relax complete traversal of the admitted candidate set, required-default/global-timeout failure, generation fences, ranking or privacy.

## Friend

Existing candidate eligibility/discoverability, reservation ownership,
self/friend/pending/block/ignore exclusions and permission checks remain.
The retained composition opts into friend_recommendation_v2 internally:
4 per shared active interest + 2 per common authorized Interested/Going Event +
1 for public matching region + 1 for public matching school/organization
(type and normalized name). Missing signals are neutral. Age has no existing
approved readable field and contributes nothing; no new field is introduced.
Only candidates with a positive approved signal qualify.
Ties: shared-interest count descending, common-event count descending,
then opaque account identity ascending. Full ranking precedes Home Top 2.
Prepared provider generations must remain current through transaction completion.

The existing Friend DTO's truthful reason string gains generic region/affiliation
phrases; no new private fields are exposed. A profile-only row (empty shared
interests and zero common Events) is valid only with `Same shared region`,
`Same shared school or organization`, or their exact ` · `-joined combination.
Other existing DTO validation remains strict. See all shows sequential groups of
two with Previous/Next and explicit exhaustion, retaining the Backend order.
Rendered callbacks are fenced against a replacement state/session, disposal and
an already-changed group offset; repeated activation cannot skip or overrun groups.
Ignore/Undo,
restoration and unknown-write behavior remain on their existing operations.

## Consumers and integration

Interest save settlement (including an unknown/failure response) invalidates
existing content reads through afterContentMutation. Event read completion is
bound to the exact ContentAccess instance/session and foreground state.
Existing Check-in create/update/delete and account/privacy mutation invalidation
paths are retained. No automatic retry, model call or worker activation is added.
LI owns final API/composition/Home integration; the changed OpenAPI schema,
retained-core bootstrap and Event reason-card patch are the minimal proposed
integration patch, not a direct write to LI's branch.
