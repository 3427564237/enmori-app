# Sprint 3 Friend contract proposal and JIN review packet

Owner: JIN ZIHAN. Assigned independent reviewer: SHI ZHENGQI. Issue: [#46](https://github.com/3427564237/enmori-app/issues/46), under [#44](https://github.com/3427564237/enmori-app/issues/44). Prepared 2026-10-02 against main `432f5285966a6c2705473be21a2652ca2869520a`.

**Proposed; independent review Pending.** This packet supplies the audit, minimum Friend contract proposal, first producer dependencies and owner verification plan required by #46. Its Ready designation covers preparation only. New public Friend APIs, persistence, disclosure and product integration remain Not Ready until their affected contracts receive approval. Nothing here selects a physical endpoint, schema, index, threshold or new product rule.

## Sources and scope

- [Q18 identity and request lifecycle](../decisions/2026-09-02-add-friend-identity-matching-contract.md) controls exact lookup, privacy, ownership, expiry and transitions; it expressly defers physical contracts.
- [Q03 formulas](../decisions/2026-09-01-deterministic-v1-recommendation-formulas.md), [Q17 allowlists](../decisions/2026-09-01-recommendation-ai-field-allowlists.md), [Q14 retention](../decisions/2026-09-02-retention-logging-audit-policy.md), [Q16 empty results](../decisions/2026-09-02-recommendation-empty-result-contract.md) and [Q12 valid Interest inputs](../decisions/2026-09-02-interest-tag-event-category-contract.md) remain controlling.
- [Coverage and five-owner assignments at PR #42's pinned commit](https://github.com/3427564237/enmori-app/blob/479619e8d124f3342458506fc145dc4bfbe3f483/docs/decisions/2026-09-24-sprint3-figma-coverage-ownership.md) retain 42 routes/states and 38 material state groups. No route is removed by this packet.
- [LI's subsequent practical delivery guidance](https://github.com/3427564237/enmori-app/blob/acc6763b8b2cc53dc67b38a4a7c7a3fa7ff4ebf5/docs/decisions/2026-09-30-sprint3-practical-delivery.md) calls for small approved increments and one focused review packet. It does not approve Friend physical contracts or waive independent review.
- Retain the existing [Flutter architecture](../decisions/2026-09-01-flutter-client-architecture.md) and [Backend architecture](../decisions/2026-09-01-backend-architecture.md): Flutter/Riverpod/go_router, trusted TypeScript/Fastify Backend, Firebase Auth and Backend-only Firestore access. No new framework, shared data model or broad refactor is proposed.

The five owner/reviewer pairs remain LI/DU, JIN/SHI, SHI/ZHOU, DU/LI and ZHOU/JIN. JIN also owns the later combined gate; LI independently reviews JIN-authored gate evidence. This packet changes no GitHub task or project status.

## Baseline audit and retained coverage

| Existing evidence at the code baseline | What it establishes | Gap for Sprint 3 |
|---|---|---|
| [Username canonicalizer](../../backend/src/onboarding/domain/username.ts) and [onboarding repository](../../backend/src/onboarding/infrastructure/firestore-onboarding-repository.ts) | Existing Username validation and onboarding reservation/binding implementation | No public exact-target lookup or Friend authorization. Existing binding/reservation is not permission to publish identifiers or add Account lifecycle semantics |
| [Account projection](../../backend/src/onboarding/application/onboarding-model.ts) | Own Username, initial consent/visibility and onboarding time | No approved third-party DisplayName/image projection or Profile discoverability reader. Own Check-in visibility is not a generic Profile Privacy contract |
| [Internal Friend ranking](../../backend/src/friend-recommendations/domain/friend-ranking.ts) and [owner tests](../../backend/test/friend-recommendations/friend-ranking.test.ts) | Pure computation on already-authorized inputs; deduplication, fixed factors, total ordering and Home Top 2 | No candidate source, eligibility checks, live producer reads, transport, storage or Flutter integration. Type names do not prove authorization |
| [Normative API](../../api/openapi.json) and [registered route inventory](../../backend/src/transport/route-inventory.ts) | Onboarding, Note-only Check-in create/read, Interests and Event recommendations | No Friend lookup/send/recipient list/accept/decline, My Friends, Friend recommendations or Friends Activity endpoint |
| [Historical S2 ranking evidence](../evidence/sprint2/2026-09-16-s2-04-jin-friend-ranking.md) | Earlier bounded component results | Historical results are not a rerun, independent Sprint 3 review or proof of public flows |

The nine JIN routes remain in scope as follows; all listed public flows remain unimplemented at this baseline. Grouping states here does not cancel them or approve their UI treatment.

| Route or state | First relevant boundary |
|---|---|
| `find-people` | Exact Username lookup and send, after the contracts below are approved |
| `friend-request-sent`, `friend-requests`, `friend-accepted`, `friend-declined` | One protected request lifecycle; recipient read/action contract and result presentation Pending |
| `people-list`, `public-profile` | Recommendations and separately authorized target Profile presentation; recommendation-to-Profile/request disclosure Pending |
| `friends-page` | Accepted-friend list and established-friend DisplayName search; physical read contract Pending |
| `friends-activity` | Purpose-authorized SHI/DU Activity inputs and current-source checks; physical contract Pending |

JIN's Home content remains part of Friend Recommendation and Friends Activity. The existing ranking component retains `2 × sharedInterestCount + commonEventCount`, positive-factor eligibility, score/shared-interest/common-event/opaque-ID ordering and Top 2 after complete ordering. It does not implement the missing public surfaces.

## Minimum exact Username and request proposal

The proposed first implementation slice, **only after approval**, is exact lookup, send, current-recipient read, accept/decline and a fresh relationship read. It need not wait for recommendations, full Profile, Event or Activity modules. It does require the specific LI identity/eligibility projection and physical authorization/mutation decisions below.

These are semantic interface proposals for review. Names describe operations and minimum data rather than normative OpenAPI or storage fields. Final paths/methods, DTO names, serialization, HTTP/error mapping, field limits and bounded list behavior are Pending LI confirmation.

| Proposed operation | Minimum input and ownership | Minimum outcome and retained boundary |
|---|---|---|
| Exact Username lookup | Verified requester from Backend Auth; one submitted Username, never a caller-supplied owner | Q18 minimum Username/DisplayName and requester-relative relationship state, or generic unavailable. Image only with independently approved visibility; no request ID, timestamp or AccountId in lookup |
| Send request | Verified sender; exact target Username resolved again inside the protected boundary | Current outgoing/incoming pending or other Q18 semantic outcome; eligible new send creates one pending request. No reverse request or automatic acceptance |
| Read recipient's current requests | Verified current recipient; no arbitrary Account selector | Propose a bounded list with only the permitted sender presentation and an action reference bound to that particular pending request. Disclosure, ordering, paging, reference representation and expiry rendering remain Pending; no terminal history |
| Accept or decline | Verified recipient plus a reference to the particular current request being acted on | Atomically consume that pending request; accept creates one friendship, decline none. Repeats or inaccessible/stale references return stable request-unavailable semantics without extra effects |

The proposed action reference must not be the internal AccountId, a Firestore path or a reusable pair-only identity. Its approved representation must distinguish a newly sent request from an older expired/declined request between the same pair, so a delayed action cannot accept the replacement. Whether it is a scoped opaque reference or another approved version-bound mechanism is undecided. It is never added to exact lookup; issuance through the proposed recipient read needs its own disclosure approval.

All operations use Backend identity and capability checks before third-party evaluation. No client-selected requester, recipient authority, server time, relationship state or eligibility flag is trusted. Physical requester binding already used by onboarding does not settle lifecycle/block authorization for these new operations.

### Rules that the eventual contract must preserve

1. Apply Q18's ordered canonicalization: trim ASCII SPACE only, lowercase ASCII A–Z, then validate 3–30 ASCII characters, alphanumeric ends, no consecutive underscores and the fixed reserved names/prefix. No fuzzy, prefix, DisplayName, email, AccountId or Unicode-normalized lookup. Preserve immutable globally reserved Username behavior; no migration or reuse is introduced.
2. Evaluate target lifecycle, either-direction block and separately approved non-exposure rules before relationship state. No new non-exposure policy is inferred. Eligible self, existing friendship and incoming/outgoing pending states remain distinct only where Q18 permits exposure.
3. Lookup is read-only. Its minimum identity presentation grants no Profile-view, recommendation or mutation authorization. A mutation always repeats authoritative checks inside its protected boundary.
4. Maintain at most one current friendship and at most one current pending request per unordered Account pair. Same-direction retries have no duplicate effect; opposite-direction sends cannot create cross-requests. Only the current recipient can accept/decline.
5. Set request creation time at the authoritative creation commit and expiry at creation plus 30 × 24 hours. At `now >= expiresAt`, lookup and mutation treat the request as expired even if physical cleanup is delayed. Expiry creates no friendship and permits a later eligible send.
6. Serialize or equivalently protect send, accept, decline, expiry, block and permanent deletion for the affected pair. The first valid commit wins. Block/permanent deletion consumes pending; unblock never revives it. Temporary ineligibility stops mutations without inventing a terminal transition. A valid acceptance followed by a later block remains subject to the separate block contract.
7. Decline creates no block or cooldown. Accepted/declined/invalidated/expired requests have no user-visible history. Do not inherit Account Action Request retention or the existing onboarding idempotency window: any Friend tombstone, retry record or cleanup design needs its own approved purpose and retention.

No sender cancel, unfriend, block-management UI, notifications, contacts, bulk search, request history or automatic acceptance is added. Existing architecture can host the eventual operations; this packet selects no collections, pair-key encoding, index, scheduler or deployment.

### Protected errors and retries

Preserve Q18's semantic categories: `unauthenticated`, `forbidden`, `validation_failed`, `add_friend_target_unavailable`, `friend_request_unavailable` and the applicable stable dependency/unavailable failure. Exact HTTP/envelope mapping remains Pending; the existing uppercase error conventions are not silently extended here.

Nonexistent, ineligible, blocked, protected and enumeration/rate-limited targets must not reveal existence through response classification or metadata. Request-unavailable must not distinguish unknown, expired, terminal, wrong-recipient or invalidated requests. A dependency/commit failure is a failure, not successful empty recommendations or a fabricated successful action. Requester authentication/authorization errors are evaluated before target privacy outcomes.

Duplicate-effect protection is mandatory; transport replay design is undecided. Repeated accept/decline must not turn a stale request into a new action or report a second transition. Both lookup and send need Backend abuse protection, but no rate value, keying/retention policy, cooldown, automatic client retry or global timeout change is selected. Operational evidence/logs must preserve Q14's allowlist and exclude submitted Usernames, target identities, bodies and protected reasons.

## First producer reads and consumer integration

Every read below is internal, request-local and purpose-specific. Authorization must precede candidate construction. Missing authority, a missing adapter or a dependency error cannot be represented as an authorized empty set. Proposed deny/unavailable result types and freshness/consistency guarantees still require approval.

| Producer and first purpose | Minimum needed data | Current dependency and disclosure boundary |
|---|---|---|
| LI, exact lookup/request | Authoritative current Account binding, lifecycle eligibility and canonical Username/DisplayName presentation; separately approved image permission only if used | Binding and Username exist; third-party DisplayName, lifecycle/protected-state source and visibility projection are Pending. PR #50's own Profile does not provide these |
| LI plus JIN, Friend recommendation | Candidate eligible/discoverable decision, purpose-authorized valid active Interest IDs, internal candidate identity; JIN supplies self/friend/pending exclusion | Existing own Interests endpoint is not an arbitrary other-user reader. Candidate enumeration/bounds and Profile Privacy checks are Pending. Safe display name/avatar only after independent presentation authorization |
| SHI, Friend recommendation | Each subject's authorized deduplicated union of Interested/Going Event IDs for this requester and fixed purpose | PR #51 proposes this union; participation lifecycle, visibility and physical reader remain Pending. Current ranker accepts separate arrays but computes their union; do not invent a per-Event state or change its contract to connect an unapproved reader |
| SHI and DU, Friends Activity | After accepted-friend, Profile Privacy, consent, deletion and current-source checks: opaque friend/source identity, approved Activity type and authoritative occurred time | Q03 already approves `check_in_created`, `event_interested`, `event_going`. Concrete source-state mapping/read contracts remain Pending. DU's Note-only own read is not permission to read friends' Notes or history |

For Friends Activity, JIN's own relationship/Special Care projection is also required before live ranking. Special Care is a private ordering weight after visibility checks, never permission to disclose more. Its physical read/mutation contract is Pending. Q03's seven-day window, future exclusion, fixed relevance/recency weights and tuple tie-break remain unchanged; exact Activity types are not a new decision.

The SHI reference is the [Event consumer proposal at `742a14e`](https://github.com/3427564237/enmori-app/blob/742a14e81e41916cd469058e41ee4359952abfc1/docs/planning/2026-10-01-s3-event-detail-contract-proposal.md). No Detail title/URL, complete participation record, Note, Mood, Weather, location, demographics or Persona data is needed by Friend ranking. Do not add a generic shared Profile/Event/Activity object.

Safe recommendation explanations may use shared-Tag labels and common-Event count, never full interests, Event IDs/history or specific Interested/Going state. Recommendation-to-Profile/request entry and public card/action identity remain Pending; Q18 lookup is not a shortcut to grant that disclosure. No producer projection is passed into Qwen by this packet.

## Owner verification and early combined checks

All cases below are **planned, Not Run** for this slice. They are not new test implementations or successful gates.

| Check | Required observable result after the affected approval |
|---|---|
| Canonicalization and lookup | ASCII-space/case cases match exactly; invalid length/characters/reserved inputs fail safely; no partial matches. Existing identity bindings/reservations remain valid |
| Lookup privacy | Auth fails before target evaluation; self/friend/pending/can-send follow Q18 precedence. Protected and enumeration outcomes share permitted public shape; no IDs/timestamps/full Profile or logging leaks |
| Send ownership and uniqueness | Synthetic two-party same-direction and opposite-direction concurrent sends yield at most one current pending pair and no friendship; prior lookup cannot bypass a later block or loss of eligibility |
| Recipient authorization and reference | Sender/third party cannot accept or decline; valid recipient can act once; unknown/stale/terminal reference is generic unavailable. An old request reference cannot act on a replacement request |
| Expiry and terminal races | Check just before, exactly at and after 30-day expiry; delayed cleanup never extends validity. Exercise accept versus decline/block/permanent deletion/expiry and verify persisted winner/no duplicates; temporary ineligibility does not invent a terminal state |
| Retry and persistence failure | Lost responses, duplicate sends/actions and failed protected commits cannot create extra effects or false success. Retained replay material, if approved, follows its own purpose/lifetime |
| Producer and ranking boundary | Filter unauthorized/deleted/withdrawn sources before scoring; missing authority fails closed. Deduplicate Interest/Event IDs and candidates; retain formula, tie-breaks and order-before-Top-2; no unauthorized fields are read or returned |
| Friends Activity | Only Q03 types, valid current sources and accepted friends enter the seven-day window; test future/24/72/168-hour boundaries and Special Care after privacy filtering |
| Flutter and Home | Loading/success/protected error/empty render approved copy; account change or navigation discards stale reads; request action reflects persisted outcome. Home and See All compute independently; return/refresh does not restore stale results |

Friend empty copy remains “No friend recommendations right now” / “Try searching for people or check again later.” Activity empty copy remains “No recent activity from friends” / “Check again later for updates from your friends.” Home retains its modules. The existing #43 navigation result is historical evidence until the selected integration head is exercised; it does not establish Friend navigation.

Use the following sequence as soon as each small contract is approved, without waiting for entire producer modules:

1. Pin the approved source, implementation/base/head, first API/storage contract and LI identity/eligibility inputs. Agree the smallest lookup/request behavior and reviewer SHI. Without these, the affected implementation remains Not Ready.
2. JIN runs owner Domain/Application tests with synthetic authorized inputs, then Transport/OpenAPI and isolated Firestore Emulator tests for the approved boundary. Fakes establish only their tested component boundary.
3. Run the first two-account Android → authenticated Backend → persisted send → recipient read/action → fresh relationship read. Capture failure and privacy cases alongside the successful transition; no real-contact lookup or production personal data is needed.
4. When one approved producer read becomes available, integrate that consumer only and record its contract version and result. Add Friend/Home recommendation and Activity checks only as their own authority and adapters become available. Event/AI incompleteness does not block independent exact-lookup work.
5. SHI independently reviews JIN's actual diff and evidence. For the later combined gate, JIN records the exact contributing commits, environment, cases and Pass/Fail/Blocked/Not Run results; LI independently reviews JIN-authored gate evidence. Failures or unavailable dependencies stay visible; neither mocks nor old test totals close them.

Record evidence in the existing Sprint 3 evidence area when execution exists: safe fixture labels, commands, runtime/platform, pinned commits, assertion/results, sanitized Android captures and remaining gaps. Include no credentials, production identities or raw provider content. Merge and LI scope acceptance remain distinct from local success.

## Pending decisions and external blockers

| Item | Required resolution and affected work | Current state |
|---|---|---|
| Friend physical contract | LI confirmation of operation paths/DTOs/HTTP errors, recipient-list disclosure/bounds and per-request action reference | Pending; new public APIs Not Ready |
| Pair persistence and races | Approved pair identity, transaction/version boundary shared with lifecycle/block changes, expiry enforcement/cleanup and any retry retention | Pending; request storage/mutations Not Ready |
| Exact target projection | LI's authoritative DisplayName, lifecycle/block eligibility and any permitted image projection, including physical sources | Pending; cannot fabricate DisplayName from Username or treat onboarding as lifecycle eligibility |
| Operational protection | Confirm lookup/send protection configuration and bounded uniform-response evidence | Pending; no numeric defaults chosen |
| Recommendation discovery and actions | LI/JIN candidate read bounds, Profile Privacy, minimized presentation, Profile/request entry and public identity disclosure | Pending; no live candidate reader or recommendation-to-Profile/request integration |
| Event and Activity reads | LI/SHI/DU/JIN confirm only the first purpose-authorized projections and current-state checks above | Pending; missing inputs cannot be silently set to zero |
| SHI independent review | Review this #46 packet and record actual findings/disposition against its commit | Pending; #46 cannot yet be reported complete |
| JIN review of ZHOU #49 | ZHOU supplies the Persona/AI operation preparation artifact with a fixed diff/source reference | No reviewable #49 artifact found in issue comments or current open PRs on 2026-10-02; review Not Run |
| Later combined gate | Approved implemented slices, owner execution evidence, usable authorized environment and LI review of JIN's gate evidence | Not Run; preparation alone cannot pass it |

Cross-Sprint decisions are retained rather than answered here. The five prototype-only behaviors are `verify`, `forgot-password`, `going-people`, `checkin-edit`, `ai-safety`; none gains approval or a Ready claim. Event provider evidence and exact category-to-Interest rows remain with SHI/LI: PR #51 records public-page observations, no authenticated Singapore API sample, pending permitted-use/storage/link authority and one unapproved website `Concerts` → `interest_music` candidate. It is not an observed API taxonomy row or approved mapping. These Event source decisions do not authorize Friend participation disclosure and do not block independent approved Friend preparation.

## Preparation verification and disposition

GitHub was inspected on 2026-10-02: #44 and #46 remain open; #45/#47/#48/#49 define bounded preparation; PR #42 is open/unmerged, and #43/#50/#51 are draft dependencies. Main is the code baseline above. PR #50 was inspected at `acc6763b8b2cc53dc67b38a4a7c7a3fa7ff4ebf5`; PR #51 at `742a14e81e41916cd469058e41ee4359952abfc1`. A later change needs a fresh source/diff check.

| #46 acceptance item | Packet evidence | Disposition |
|---|---|---|
| Compare Q18 and existing ranking/public gaps | Baseline audit and nine-route coverage | Prepared for review |
| Minimum lifecycle contract proposal | Operations, invariants, errors, retries and unresolved physical choices | Prepared for review |
| First authorized producer inputs | LI/SHI/DU dependency table | Prepared; unprovided authority stays Pending |
| Owner cases and first combined-gate entry | Verification matrix and sequence | Prepared; execution Not Run |
| SHI independent preparation review | Assigned review of this packet | Pending |

This change contains documentation only. Local validation: all 16 relative links resolve; staged `git diff --check` passes; the diff contains this one Markdown file. Product/unit/Emulator/Android/provider/Qwen execution for this new slice is Not Run; no historical run is promoted to current evidence. #46 remains incomplete pending SHI review; Friend implementation awaits the specific decisions above. No issue checklist, status, iteration, assignee, reviewer assignment, merge or acceptance is changed by this packet.
