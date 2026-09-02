# Add Friend identity and matching design

- **Status:** Approved PM design; Q18-A through Q18-D approved; Q-18 Resolved
- **Date:** 2026-09-02
- **Authority:** S-PM-0902-Q18
- **Implementation status:** Not implemented or verified

## Approved Q18-A vocabulary

| Term | Meaning | Direct Add Friend lookup key |
|---|---|---:|
| `AccountId` | Immutable opaque canonical Account identity under Backend authority | No |
| `Username` | Current user-facing unique identifier for an ordinary user Account | Yes; sole accepted identifier |
| `DisplayName` | Non-authoritative presentation text | No |

The physical representation and infrastructure binding of `AccountId`, endpoint/DTO shape, schema/index/cleanup mechanism, UI treatment, operational threshold values, implementation, and evidence are not approved.

```text
Direct Add Friend lookup input
└── Username
    ├── never AccountId
    ├── never DisplayName
    ├── never broad directory discovery
    └── never Friend Recommendation input/result reuse
```

Username searchability authorizes only the minimum identity exposure required by Add Friend. Profile visibility and other privacy rules remain independently authoritative.

## Preserved capability separation

| Capability | Approved purpose | Q18-A effect |
|---|---|---|
| Add Friend | Direct lookup outside the established-friend set | Canonical lookup vocabulary is Username only |
| Search My Friends | Name-based search within the current user's established friendship set | Unchanged |
| Friend Recommendation | Passive, eligibility-filtered recommendation | Unchanged; no lookup or ranking authority added |

## Approved Q18-B canonicalization and matching

```text
raw assignment or lookup input
→ trim leading/trailing U+0020 only
→ ASCII lowercase A–Z
→ validate 3–30 characters
   ├── a–z, 0–9, underscore only
   ├── first and last are alphanumeric
   └── no consecutive underscores
→ exact canonical equality only
```

Tabs, line breaks, Unicode whitespace, all other Unicode characters, and all other mapping/transliteration are rejected. Prefix, substring, fuzzy, phonetic, locale-sensitive, and DisplayName-assisted matching are prohibited.

```gherkin
Given the current canonical Username is "alex_7"
When Add Friend lookup receives "  ALEX_7  "
Then only the two leading and two trailing U+0020 characters are trimmed
And ASCII uppercase letters are lowercased
And exact canonical lookup may return that Account
```

```gherkin
Given the current canonical Username is "alex_7"
When Add Friend lookup receives "alex"
Then no prefix result is returned
```

```gherkin
Given Add Friend lookup receives a tab before a syntactically valid Username
When the input is canonicalized
Then the tab is not trimmed
And validation rejects the input
```

Uniqueness is atomic and global across every Account or retained Username reservation permitted to possess a Username. The canonical stored value is the only Username presentation form. Week 9 Usernames are immutable; rename, aliases, historical lookup, and reuse are excluded. Account deletion does not release a reservation.

The fixed reserved set is `admin`, `administrator`, `support`, `system`, `moderator`, `root`, `enmori`, plus the `enmori_` prefix. It is only MVP namespace protection, not a general anti-impersonation system.

Legacy invalid or conflicting values require a separately reviewed migration/remediation contract and cannot be silently normalized.

## Approved Q18-C lookup and privacy behavior

Requester authentication and authorization occur before target evaluation. Authentication or authorization failure is not represented as a target-level unavailable outcome.

```text
authenticated + authorized requester
→ canonical exact Username lookup
→ self?
   └── yes: minimum own presentation + self
→ third-party lifecycle eligible?
   └── no: generic requester-visible unavailable
→ either-direction blocking?
   └── yes: generic requester-visible unavailable
→ separately approved protected non-exposure rule?
   └── yes: generic requester-visible unavailable
→ relationship state
   ├── existing Friendship: already_friends
   ├── outgoing pending: outgoing_request_pending
   ├── incoming pending: incoming_request_pending
   └── none: can_send_request
```

Q18-C creates no additional protected eligibility rule. Any such rule must be approved separately.

The minimum successful presentation is current Username and DisplayName plus a current profile-image presentation only when independently visible to the requester. It contains no internal Account/Friendship/Friend Request identity, timestamp, contact detail, visibility setting, social graph, recommendation input, private Profile data, or protected reason.

No-match, lifecycle ineligibility, blocking, separately approved protected non-exposure, and enumeration/rate protection are requester-visible as semantically indistinguishable target-unavailable outcomes. They cannot intentionally differ through classification, fields, error codes, counts, or metadata. Authentication and authorization failures remain distinct requester-level failures.

Lookup is read-only and creates no request, relationship, Profile-view authority, Recommendation record, or search-history product entity. Q14-D continues to govern permitted operational telemetry.

```gherkin
Given an authenticated and authorized requester searches an exact canonical Username
And the target has blocked the requester
When the Backend evaluates the target
Then the requester receives the generic unavailable outcome
And no Friendship or pending-request state is exposed even if one exists
```

```gherkin
Given a requester is not authenticated or is not authorized for ordinary-user Add Friend lookup
When lookup is requested
Then requester access fails before target evaluation
And the failure is not converted into a target-level unavailable outcome
```

## Approved Q18-D Friend Request behavior

```text
one unordered Account pair
├── at most one current Pending request in either direction
└── at most one current Friendship
```

Send revalidates authority and eligibility inside the protected commit. Duplicate outgoing send has no duplicate effect; an incoming Pending request is not reversed or auto-accepted. Opposite-direction concurrent sends cannot create cross-requests. Requester-level send abuse/rate protection is Backend-enforced, does not disclose target existence/eligibility, and creates no social relationship or cooldown.

```text
Pending
├── accept before expiry ──→ consume Pending + create one Friendship
├── decline              ──→ consume Pending; no Friendship
├── effective block      ──→ consume Pending as Invalidated
├── permanent deletion   ──→ consume Pending as Invalidated
└── server time >= expiresAt ─→ consume Pending as Expired

expiresAt = authoritative createdAt + 30 × 24 hours
```

Expiry permits a later otherwise-valid request. Temporary Account ineligibility prevents mutation while applicable but does not itself terminalize a request without a separate approved rule.

Accepted, Declined, Invalidated, and Expired are terminal domain outcomes, not required physical records. Any tombstone, audit, or retained terminal record needs a separately approved purpose and retention contract. There is no user-visible request-history product.

For the same pair, block, permanent deletion, expiry, accept, decline, and invalidation use a race-safe protected boundary. The first valid commit controls: a previously committed protected/terminal state prevents stale acceptance; a validly committed acceptance creates Friendship and later block/Account lifecycle rules govern subsequent effects.

```gherkin
Given a Pending request has reached createdAt plus 30 times 24 hours
When its recipient attempts acceptance
Then the request is Expired before acceptance
And no Friendship is created
```

```gherkin
Given a block and acceptance race for the same Account pair
When the block commits first
Then the stale acceptance cannot create Friendship
```

```gherkin
Given opposite-direction sends race for the same Account pair
When one Pending request commits first
Then the other send creates no reverse request
And only one current Pending request exists
```

Stable semantic categories distinguish requester authentication/authorization and malformed input while preserving generic target/request unavailability. Exact HTTP status and envelope remain deferred to the API Contract.

MVP excludes alternative lookup keys/search modes, bulk requests, auto-accept/cross-request merge, sender cancel, unfriend/block management, notification delivery, request history, Username rename/alias/history/reuse, client-authoritative identity/state, and a general anti-impersonation claim.

## Closure and downstream gates

Q18-A through Q18-D resolve Q-18 at the requirement-contract level; no Q18-E is required. Payload shape, endpoint, physical schema, UI treatment, operational thresholds, implementation, migration, and Release evidence remain later readiness gates.
