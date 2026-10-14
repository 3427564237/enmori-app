# Figma42 coverage — social offline increment, 14 October 2026

This is a complete **42/42 inventory mapping**, not a functional-completion or
Sprint numerator. Retain the original38 material-state groups and Q04-D's
37 in-scope/five prototype-only disposition; in-scope is not automatically
implemented/Ready. Status below describes this new explicit offline harness.
Existing production/component evidence remains independently attributed.

The user approved implementation of the card/navigation/Profile direction and
wants fuller Figma feature coverage. This first usable increment exercises
existing controllers with process-local synthetic repositories. No normal
Bootstrap, cloud, model, new dependency/API/schema/index or permanent store is
enabled. Do not count sample fixtures as real integration. Owner tests/build,
DU review, JIN new-source gate and LI acceptance remain separate.

| # | Figma identifier | Current new-harness coverage | Exact boundary / remaining work |
|---:|---|---|---|
| 1 | `login` | Existing page; outside this harness | Existing SignInPage retained. Offline entry is a clearly synthetic Continue button, not real authentication. |
| 2 | `register` | Existing page; outside this harness | Existing RegistrationPage retained; synthetic account is pre-onboarded and creates no real user. |
| 3 | `verify` | Prototype-only local gap | Retain Q04-D: missing security/privacy/lifecycle/surface authority; inventory only. |
| 4 | `reg-complete` | Existing outcome; outside harness | No new account-creation proof. |
| 5 | `forgot-password` | Prototype-only local gap | Retain Q04-D: missing security/privacy/lifecycle/surface authority; inventory only. |
| 6 | `profile-setup` | Existing bounded Profile; partial | Only approved Username/DisplayName/visibility fields; DOB/region/school/bio absent until applicable contract. |
| 7 | `interest-setup` | Offline interest editor | Existing catalogue/select/save/revision flow available under Edit interests; full onboarding not newly wired. |
| 8 | `data-consent` | Existing onboarding; outside harness | Settings can exercise sample preference; no new real initial-consent proof. |
| 9 | `less-personalised` | Existing semantics; outside harness | Not a newly delivered onboarding terminal. |
| 10 | `home` | Offline social Home | Activity cards, own moments, Friends and AI entries work on sample fixtures. |
| 11 | `home-limited` | Partial offline sample | Rejected sample consent remains visible in Settings; curated sample Home is not real personalised/limited-mode verification. |
| 12 | `people-list` | Undelivered recommendation consumer | My Friends samples are not algorithmic recommendations. |
| 13 | `public-profile` | Undelivered full projection | Exact lookup has approved minimum target data; no full Profile/visibility authority inferred. |
| 14 | `friend-request-sent` | Offline outcome | Same exact lookup flow; send sam_sample produces outgoing pending state. |
| 15 | `friend-requests` | Offline interaction | Existing inbox accepts/declines Riley sample; list updates. |
| 16 | `friend-accepted` | Offline outcome | Existing inbox state; no separate invented route. |
| 17 | `friend-declined` | Offline outcome | Existing inbox state; no friendship created. |
| 18 | `friends-page` | Partial offline interaction | Social list plus existing My Friends DisplayName search; Special Care remains separate undelivered consumer. |
| 19 | `events-list` | Partial offline interaction | Existing controller list and social cards show synthetic Events; real approved provider source/ranking remain outside. |
| 20 | `event-detail` | Partial offline interaction | Read/copy example.invalid link; Interested/Going and real registration return are not delivered by the current Repository interface. |
| 21 | `interested-people` | Undelivered participation consumer | Permission-filtered fields/counts and actual producer path remain scoped requirements. |
| 22 | `going-people` | Prototype-only local gap | Retain Q04-D: missing security/privacy/lifecycle/surface authority; inventory only. |
| 23 | `event-status-saved` | Undelivered participation outcome | No fake ordinary mutation/success. |
| 24 | `checkin` | Offline interaction | Existing 1-500-character Note create, idempotency and visibility from sample Settings. |
| 25 | `checkin-success` | Offline outcome | Create and explicit read confirmation remain distinct; current-session saved record can reopen. |
| 26 | `checkin-timeline` | Offline History interaction | Own-date read, page20 cursor, Reload and saved-item return; injected Asia/Singapore fixture zone, no native-device proof. |
| 27 | `checkin-calendar` | Partial consumer | Existing History date-picker can select a day; dedicated annotated Calendar remains a separate consumer. |
| 28 | `checkin-edit` | Prototype-only local gap | Retain Q04-D: missing security/privacy/lifecycle/surface authority; inventory only. |
| 29 | `ai-customize` | Offline Persona interaction | Existing overview/selection/activation/session controller and synthetic revision guards. |
| 30 | `ai-assistant` | Offline scripted interaction | Accepted wire client/R-A states use existing synthetic transport; no real model/storage/Note reader. |
| 31 | `ai-safety` | Prototype-only local gap | Retain Q04-D: missing security/privacy/lifecycle/surface authority; inventory only. |
| 32 | `ai-limited` | Not newly verified | Existing AI states/contract remain; sample Settings does not prove real-purpose authorization or cleanup. |
| 33 | `own-profile` | Offline social Profile | Name/interests/own records and actions reflect memory changes. |
| 34 | `privacy-settings` | Offline interaction | Existing Settings edits sample Check-in visibility; Profile visibility is in Edit profile. |
| 35 | `consent-settings` | Offline interaction | Existing Settings saves sample optional-data-use preference; scripted AI reads no Note context and does not certify F03 producers/revocation. |
| 36 | `profile-edit` | Offline interaction | Existing editor saves DisplayName/visibility with revision guard; Username stays immutable. |
| 37 | `first-time-privacy` | Existing onboarding; outside harness | Accept/Public vs Reject/Private initial path is retained, not rerun as offline account creation. |
| 38 | `reg-check` | Undelivered external-return consumer | Synthetic links do not open real registration or constitute external-return evidence. |
| 39 | `friends-activity` | Undelivered Activity consumer | Social friend cards are a list, not permission-filtered Friends Activity. |
| 40 | `find-people` | Offline exact lookup | Existing Find person uses sample canonical Username; try sam_sample. |
| 41 | `persona-management` | Offline Persona interaction | Existing create/edit/activate/delete pages, max5 and stale/session guards. No templates/duplication. |
| 42 | `edit-persona` | Offline Persona interaction | Only approved name/tone/length/format fields; no expanded prototype fields. |

## Small follow-up batches, without global waiting

1. Shared/account owner LI: continue visual polish of inherited forms and
   dedicated own-Calendar consumer on the existing History interface; retain
   dirty/in-flight exit guards. Auth/onboarding UI remains an independent batch.
2. JIN Friends consumers: full approved public Profile projections, Special Care,
   Recommendation and Activity remain actual deliverables; do not wait for AI
   store/cleanup or this unchanged offline entry's review before independent work.
3. SHI Event consumers: participation/detail/return and authorised source remain
   precise gaps; stable read/detail UI can proceed independently of provider
   readiness. No assumed count/identity exposure or fake real registration.
4. ZHOU: continue selected real reader/store/cleanup only as its actual producer
   facts hold; Persona/R-A/UI stay independently usable. No repeated contract vote.

These are the retained roles/next gaps, not new deadlines or task-board changes.
Package each coherent functional/visual delta once for its existing reviewer.
The 5 prototype-only rows and other field/producer gaps do not stop ready work.
