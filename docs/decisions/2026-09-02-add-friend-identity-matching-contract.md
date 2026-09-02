# Add Friend identity and matching contract — 2026-09-02

- **Status:** Approved; Q18-A through Q18-D approved; Q-18 Resolved
- **Decision owner:** LI HOURUI, ENMORI PM
- **Source ID:** S-PM-0902-Q18
- **Approved scope:** Canonical identity vocabulary; Username validation, canonicalization, uniqueness, exact matching, immutability, reservation, and migration; authenticated lookup result/privacy/enumeration protection; Friend Request mutation, lifetime, concurrency, errors, and MVP exclusions
- **Not approved by this decision:** Endpoint/DTO shape, physical schema/index/cleanup mechanism, UI treatment, notification delivery, implementation, operational threshold values, or Release evidence
- **Builds on:** S-BR45 and S-KD5 as recorded in [`../SOURCE_MAP.md`](../SOURCE_MAP.md)

## Q18-A — Canonical Friend Identity Vocabulary

Every Account has one immutable opaque canonical `AccountId` under Backend authority. `AccountId` is the internal authoritative Account identity. It is not user-selected, exposed as a public handle, or searchable through Add Friend.

Q18-A does not determine the physical representation, storage field, generation mechanism or binding of `AccountId` to Firebase Authentication or other infrastructure identifiers; those remain schema/implementation decisions.

Every ordinary user Account has one current user-facing unique `Username`, governed by the separately approved username validation and lifecycle contract. `Username` is the sole identifier accepted for direct Add Friend lookup.

Username searchability authorizes only the minimum identity exposure required by the approved Add Friend flow. It does not make the target Profile public, bypass Profile visibility, authorize broad people-directory discovery, or expose internal `AccountId`.

Historical Add Friend requirements referring to user-entered `account ID`, `user account`, `unique username`, `username`, `user ID`, `user name`, or equivalent identifiers are prospectively superseded by the canonical `Username` contract.

Where earlier wording could have meant `DisplayName` or an internal Account identifier, Q18-A intentionally resolves that ambiguity: neither is a direct Add Friend lookup key. This is a prospective requirement clarification and correction and does not reinterpret historical internal opaque identifiers as public identifiers.

`DisplayName` is presentation text, not an identity or uniqueness authority. It is not a direct Add Friend lookup key. This does not alter the approved name-based `Search My Friends` capability within the current user's established friendship set.

Friend Recommendation, My Friends search and Add Friend search remain separate capabilities. Q18-A defines only their canonical identity vocabulary and does not authorize recommendation ranking, broad people discovery, fuzzy Add Friend search or additional search keys.

## Q18-B — Username validation, uniqueness, exact matching, and lifecycle

A canonical Username contains 3–30 ASCII characters using only lowercase letters `a–z`, digits `0–9`, and underscore `_`. It must begin and end with a letter or digit and must not contain consecutive underscores.

The canonicalization pipeline is frozen in this order:

1. trim only leading and trailing ASCII SPACE (`U+0020`);
2. convert ASCII uppercase `A–Z` to lowercase `a–z`;
3. validate the resulting value against the approved Username syntax and length.

Tabs, line breaks, Unicode whitespace, Unicode letters, punctuation, diacritics, emoji, compatibility characters, and all other Unicode characters are rejected rather than trimmed, mapped, transliterated, or locale-converted. The 3–30-character limit applies after canonicalization.

The resulting canonical Username is both the stored user-facing value and the uniqueness authority. There is no separate case-preserving Username display form.

Direct Add Friend lookup applies the same frozen canonicalization and validation pipeline to the search input. A lookup succeeds only on exact equality with one current canonical Username. Prefix, substring, fuzzy, phonetic, locale-sensitive, and `DisplayName`-assisted matching are prohibited.

Username uniqueness is global across every Account or retained Username reservation permitted to possess a Username. It is enforced atomically by the Backend; two concurrent operations cannot commit the same canonical Username.

The fixed MVP reserved-name set is:

- `admin`
- `administrator`
- `support`
- `system`
- `moderator`
- `root`
- `enmori`
- every Username beginning with `enmori_`

These values cannot be assigned to an ordinary user Account. This fixed set is an MVP namespace-protection rule and does not constitute or claim a general anti-impersonation system.

For the Week 9 Release, Username is selected during Account onboarding and is immutable afterward. Username rename, aliases, and historical-name lookup are Not in Release.

A Username is never automatically reassigned or reused. Disablement, suspension, or another non-deleting Account state does not release it. Permanent Account deletion does not itself release the retained Username reservation. Reuse remains prohibited until a separately approved Account-deletion and anti-impersonation contract explicitly authorizes it.

Existing legacy Account data that cannot satisfy this contract must not be silently normalized into a potentially conflicting Username. Migration or remediation requires a separately reviewed migration contract before affected production data are accepted.

Concrete onboarding or lookup DTOs, physical uniqueness indexes/reservations, Firebase bindings, endpoint paths, and error-envelope fields remain API/schema/implementation decisions.

## Q18-C — Add Friend lookup result and privacy boundary

Access to the ordinary-user Add Friend lookup capability requires an authenticated requester authorized to use that capability. Requester authentication and authorization failures are handled before target evaluation and remain outside the target-level privacy outcome.

A valid direct Add Friend lookup returns either one exact target presentation or one generic requester-visible unavailable outcome. It never returns a candidate list, partial matches, suggestions, result counts, nearby Usernames, or alternative spellings.

For a third-party target, evaluation follows this fixed precedence:

1. authoritative Account lifecycle eligibility for ordinary-user Add Friend participation;
2. either-direction blocking;
3. any separately approved protected non-exposure rule;
4. existing Friendship or Friend Request state;
5. otherwise eligible `can_send_request` state.

Lifecycle ineligibility, either-direction blocking, and a separately approved protected non-exposure rule override Friendship and Friend Request state. Only a target that passes the first three gates may expose `already_friends`, a pending-request state, or `can_send_request`.

“Other protected eligibility rule” means only a rule separately approved by the applicable authority. Q18-C does not create, infer, or authorize a new hidden eligibility policy.

An exact self-match may return the requester's own minimum presentation with the non-actionable semantic state `self` after requester authentication and authorization. This reveals no third-party information.

The generic requester-visible unavailable outcome applies when:

- no canonical Username exists;
- the target is unavailable or ineligible for Add Friend under the authoritative Account lifecycle;
- either direction of blocking prevents the interaction; or
- a separately approved protected non-exposure rule prevents exposure.

Target-level unavailable cases and enumeration/rate-protection outcomes must not intentionally distinguish Username existence or protected eligibility through response classification, fields, error codes, result counts, or other requester-visible metadata. Exact DTO and HTTP representation remain API decisions only if they preserve this semantic non-distinguishability.

A successful target presentation contains only:

- the current canonical `Username`;
- the current `DisplayName`; and
- the current profile-image presentation only when that image is independently permitted for this requester under the approved Profile visibility contract.

Internal `AccountId`, email address, authentication identifiers, Profile visibility setting, interests, Events, Check-ins, location, Activity, friendship graph, recommendation factors, and other Profile fields are never returned by Add Friend lookup.

Returning `Username` and `DisplayName` is the minimum identity confirmation specifically authorized by the Add Friend flow. It does not grant access to the target Profile or authorize reuse of those fields for recommendations, directory browsing, or another purpose.

If an eligible requester and eligible target are already friends, or have a pending request in either direction, the minimum target presentation may be returned because the requester is already a party to that relationship. The response exposes only the requester-relative semantic state:

- `already_friends`;
- `outgoing_request_pending`; or
- `incoming_request_pending`.

It must not expose internal Friendship or Friend Request IDs, timestamps, the other user's private data, or protected moderation/blocking reasons. For an otherwise eligible target with no existing or pending relationship, the semantic state is `can_send_request`.

These state names define domain semantics, not final DTO field or enum names. Endpoint shape and UI presentation remain later contracts.

Add Friend lookup has Backend-enforced enumeration and rate protection. Protection may reject or temporarily limit lookup without revealing whether a submitted Username exists. Exact thresholds and deployment controls remain operational configuration, but Release evidence must demonstrate bounded lookup and uniform protected outcomes.

Lookup is read-only. It never creates a Friend Request, Friendship, Recommendation record, search-history product entity, or Profile-view authorization. Privacy-minimized operational telemetry remains governed by Q14-D.

## Q18-D — Friend Request mutation, lifetime, concurrency, errors, and MVP exclusions

Friend Request send, accept, and decline require an authenticated requester authorized for the relevant ordinary-user capability. Backend revalidates authoritative Account eligibility, either-direction blocking, existing Friendship, and current Pending Friend Request state inside the protected mutation boundary. A prior lookup result grants no mutation authority.

For each unordered pair of Accounts, the system permits at most one current Friendship and at most one current Pending Friend Request in either direction. Pair uniqueness and all state transitions are concurrency-safe.

### Send

A successful send creates exactly one directed Pending Friend Request from sender to recipient. It does not create Friendship.

Send behavior is:

- `self`: no request is created;
- `already_friends`: no request is created;
- current outgoing Pending request: duplicate-effect protection returns the current outgoing-pending semantic outcome without creating another request;
- current incoming Pending request: no reverse request is created and no automatic acceptance occurs; the requester must use the separately authorized accept action;
- target-level unavailable under Q18-C: no request is created and the generic requester-visible unavailable semantics are preserved;
- otherwise eligible: exactly one Pending request is created.

Concurrent opposite-direction sends cannot create two cross-requests. One protected mutation may create the Pending request; the other observes an incoming or outgoing Pending state and creates no second request.

The Backend applies requester-level Friend Request send abuse and rate protection. Exact thresholds remain operational configuration. Protection must not disclose target Username existence or eligibility and does not itself create a social cooldown, block, Friendship, or other relationship state.

### Pending lifetime

Backend captures the authoritative Pending Friend Request `createdAt` when creation commits and derives:

```text
expiresAt = createdAt + 30 × 24 hours
```

The request is current Pending only while server-authoritative time is strictly earlier than `expiresAt`. At or after `expiresAt`, an otherwise unterminated request is Expired before it can be used by lookup, accept, or decline.

Expiry consumes and removes the current Pending state, cannot create Friendship, and permits a later otherwise-valid request. Delayed physical cleanup does not extend the authoritative lifetime or make an expired request actionable.

### Accept, decline, invalidation, and expiry

Only the current recipient of a current Pending Friend Request may accept or decline it.

Acceptance atomically consumes the current Pending state and creates exactly one undirected Friendship for the Account pair. Friendship exists only after this successful atomic transition. Acceptance never creates duplicate Friendship records or a second relationship.

Decline consumes the current Pending state and creates no Friendship. Decline does not block the sender and does not itself create a permanent prohibition or cooldown on a later request; any additional anti-abuse or cooldown rule requires separate approval.

An effective either-direction block invalidates and consumes any current Pending Friend Request for that Account pair in the same protected consistency boundary. The invalidated request cannot later be accepted and does not automatically return after unblock. Q18-D does not otherwise define block creation, removal, or UI.

Permanent deletion of either Account invalidates and consumes a current Pending Friend Request. Temporary Account ineligibility prevents request mutation while it applies but does not silently accept, decline, invalidate, or recreate a request unless a separately approved Account lifecycle rule says otherwise.

Accepted, Declined, Invalidated, and Expired are terminal domain outcomes. Each consumes or removes the current Pending state; `Accepted` and `Declined` need not remain as persisted Friend Request records. Q18-D authorizes no user-visible Friend Request history. Any physical terminal tombstone, audit event, or retained terminal record requires a separately approved purpose and retention contract. Processing a terminal transition alone does not authorize indefinite or independent retention.

Repeating a successful accept or decline operation must not produce another transition, duplicate Friendship, or additional lifecycle side effect. Concrete response behavior for an already-terminal or otherwise unavailable request uses the stable unavailable semantics below.

### Race semantics

Block, permanent Account deletion, Pending expiry, accept, decline, and invalidation for the same Account pair use serialization, version preconditions, or an equivalent race-safe protected boundary.

A protected state or terminal transition that commits first prevents a stale accept from creating Friendship. This includes a block, permanent deletion, expiry, decline, or invalidation that wins the race. An acceptance that validly commits first creates Friendship; any later block or Account-lifecycle effect is governed by the applicable later block/Account-lifecycle contract and does not retroactively make the prior acceptance uncommitted.

### Stable semantic errors

- unauthenticated requester → `unauthenticated`;
- authenticated requester lacking the relevant capability → `forbidden`;
- syntactically invalid Username or malformed mutation input → `validation_failed`;
- target unavailable under Q18-C, including protected enumeration or rate handling → `add_friend_target_unavailable`;
- Friend Request not available to the requester for the requested accept/decline transition → `friend_request_unavailable`;
- dependency or transient protected-commit failure → the applicable stable application dependency/unavailable category under Ops-1.

`add_friend_target_unavailable` preserves Q18-C non-distinguishability. `friend_request_unavailable` does not disclose whether a request never existed, expired, is terminal, belongs to another requester, was invalidated by blocking/deletion, or is unavailable for another protected reason. Exact HTTP status, endpoint, DTO, and error-envelope representation remain API Contract decisions.

### MVP exclusions

- no lookup by AccountId, DisplayName, email address, phone number, contacts, QR code, or external social identity;
- no prefix, fuzzy, phonetic, directory, nearby-user, or multi-result search;
- no bulk Friend Request operation;
- no automatic request acceptance, cross-request merging, or Friendship creation from lookup;
- no sender-side cancel or withdraw operation;
- no unfriend, block-management, notification-delivery, or Friend Request history product under Q-18;
- no Username rename, alias, historical lookup, or reuse;
- no client-authoritative eligibility, relationship state, or Account identity;
- no general anti-impersonation claim from the fixed reserved Username set; and
- no social cooldown or block relationship created merely by technical abuse/rate protection.

### Release evidence

Release evidence covers canonicalization, exact lookup, privacy non-distinguishability, self/existing/pending cases, requester-level lookup/send protection, 30-day expiry boundary, simultaneous same-direction and opposite-direction sends, accept/decline authorization, block/deletion/expiry-versus-accept races, duplicate-effect protection, and absence of duplicate Friendship or current Pending pairs.

## Authority and closure boundary

This is a prospective PM requirement clarification, not a Sponsor/Supervisor decision and not evidence that the behavior was previously implemented or approved under these exact terms.

Q18-A through Q18-D resolve Q-18 at the requirement-contract level. No Q18-E is required.

Resolution is not API/schema/UI approval, implementation, operational-threshold selection, migration approval, or Release evidence. Those downstream gates remain active. This PM decision must not be represented as a Sponsor/Supervisor decision.
