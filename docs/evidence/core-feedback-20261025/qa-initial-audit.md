# Core feedback — independent QA baseline audit

Date: 2026-10-25. Owner: QA / Evaluation. Baseline:
`087281e11ec5a681fd012b9d64431b225ed6f8ea` on
`souma/core-feedback-qa-20261025`. The prior QA branch remains at
`4b8a99fac7662c7bd877af5fdfb876c5a751a14b`.

Authority: [LI core experience repair](../../decisions/2026-10-25-li-core-experience-repair.md),
repository AGENTS and Skill routing. The manual-only AI entry direction is
superseded within that decision's stated scope. Existing permission, deletion,
revision, unknown-operation, retention, and draft protections remain applicable.

This packet records independent source inspection and a subsequently authorised
three-case Flutter reproduction (1 Pass / 2 Fail), detailed below. No Gradle, APK,
emulator, model, provider, real service, ADB, or phone operation was run by QA in
this round. LI's reported v28 installation and disabled Send are user evidence;
the prior v28 static audit is not phone acceptance.

## Findings and limits

| ID | Independent baseline evidence | Classification / next check |
| --- | --- | --- |
| QA-AI-01 | Both UI modes rebuild on text changes. Send also requires `_selectionReady`; selecting and then removing the last Check-in leaves `active=true`. Returning without confirmation retires the review but leaves this active state. AI can therefore be ready while the UI button remains disabled. | Independently reproduced in the social UI for cancel-last and cancel-empty-review; not the proven sequence on LI's phone. Do not bypass unknown-operation recovery to enable it. |
| QA-AI-02 | The selection controller offers an explicit owned-record entry and a manual recent-record picker. The picker enumerates eight UTC calendar dates for its rolling seven-day eligibility window. There is no automatic current-day read on ordinary chat entry. | Confirmed baseline capability gap against the new direction. The old picker implementation does not define the new meaning of “today”. |
| QA-HOME-01 | Home is a lazy ListView. Its event section starts a read on mount and abandons its operation on dispose; scrolling it out and back can replace a populated section with a short loading/error state. | Source hypothesis for the height/scroll jump. Root reports a separate red regression; QA has not run it or verified a repaired head. |
| QA-EVENT-01 | Refresh sends the same `view=home` request. Backend computes the deterministic order and always takes `slice(0, 2)` for Home. UI explicitly supports “Latest details loaded for the same events.” | Confirmed source explanation for repeatedly showing the same eligible pair. Batch rotation is absent; source success with no alternatives must remain distinct from source failure. |
| QA-EVENT-02 | Event scoring reads selected active Interest identities and event interest identities, then counts their intersection. Friends Interested/Going, location, age, and school/organisation do not enter this Event formula. | Confirmed source capability boundary. No invented weights or additional field access. See formula distinction below. |
| QA-FRIEND-01 | Connected Home's `GroupHomeSocial` includes FriendActivityPanel only. Friends has a Discover chip and FriendDiscoveryPanel. | Home discovery entry is absent; the feature is not absent from the entire app. No new discovery algorithm is necessary merely to expose the existing entry. |
| QA-PROFILE-01 | Home social header is the app brand and Today section. OwnProfile renders a CircleAvatar containing the username's first letter. OwnProfile/ProfileDetails have no avatar field. | Photo avatar requires the concrete profile/storage/privacy delta. Root reports LI specifically requested photo upload; that clarification must be persisted before reuse as a contract. Compact entry is a separate presentation change. |
| QA-PLACE-01 | Check-in creation already accepts a user-entered place label; the main record view uses it above expandable coordinates. SocialProfilePage also prints raw coordinates and then the label when present. Real activity projection uses the actual venue name when available. | Do not claim every location is coordinates-only. Prefer the existing readable label, with an honest unavailable state. Automatic geocoding is not implemented or authorised by these facts. |
| QA-DETAIL-01 | Connected cards route through `eventPath`; when participation is enabled this opens an in-app ParticipationEventPage, which reads EventDetail and renders it before the external registration action. | An in-app detail path exists. Sparse data and purchase/link presentation still need repair; a claim that every card directly opens an external seat selector would be inaccurate. |
| QA-DETAIL-02 | The controlled Ticketmaster projection keeps title/time/URL/venue/category, but no description or images. Controlled EventDetail forwards those fields. The general EventDetail type supports optional shortDescription, but has no cover field. Recommendation projection carries only ID/title/time/matched interests. | Confirmed data/projection gaps, not merely a hidden image widget. Use actual allowed provider fields; field absence and provider failure must remain distinguishable. |
| QA-FOLLOW-01 | The sidebar label is “明确跟进”; it opens ProactiveSettingsPage, not a new-follow-up form. New scheduling is entered from a saved message. Turning the category on currently asks for a typed IANA zone plus confirmation. System notification controls have a separate configured/installation gate. | Label and setup discoverability need repair. In-app follow-ups and native notification availability are separate. Current deployed endpoint availability has not been inspected in this QA round. |

## Source anchors at the baseline

- AI readiness: `lib/features/ai_conversation/ai_conversation_providers.dart:230–280`;
  `presentation/ai_conversation_page.dart:345–350, 1025–1045, 1380–1396, 1654–1671`.
- Selection lifecycle: `ai_selected_sources_providers.dart:348–381, 435–453,
  530–547, 616–635`; picker `presentation/ai_selected_sources_page.dart:65–70`.
  Opening the picker without choosing anything does **not** set active true.
- Home lifetime: `lib/app/home_shell_page.dart:197–234`;
  `lib/features/event_recommendations/presentation/event_recommendations_page.dart:55–86`.
- Recommendation request/rank: `lib/features/event_recommendations/data/backend_event_recommendation_repository.dart`;
  `backend/src/event-recommendations/domain/rank-events.ts`;
  `backend/src/event-recommendations/application/recommend-events.ts:53–76`.
- Actual controlled candidate source: `backend/src/bootstrap/controlled-event-recommendations.ts:38–65`
  reads the provider's first batch and only maps the explicitly bound Music segment
  to an Interest identity. `backend/src/event-browse/infrastructure/ticketmaster-browse-source.ts`
  uses page 0, size 20 for firstBatch. This is not proof that all eligible provider
  events were considered, or that all profile interests have a provider mapping.
- Friend placement: `lib/app/remote_social_composition.dart:170–208`;
  `lib/features/friends/presentation/friend_module_page.dart:124–180, 205–225`.
- Profile and place: `lib/features/account/domain/account_preferences_repository.dart:7–20`;
  `lib/features/account/domain/profile_details.dart`; `presentation/own_profile_page.dart:95–120`;
  `lib/features/check_in/presentation/check_in_record_view.dart:64–86`;
  `lib/features/friends/presentation/social_profile_page.dart:466–486`.
- Detail route: `lib/app/router/app_router.dart:141–142, 505–508`;
  `lib/app/router/event_participation_routes.dart:64–80`;
  `lib/features/event_participation/presentation/participation_event_page.dart:168–210`.
- Detail projection: `backend/src/event-browse/domain/browse-values.ts:28–44`;
  `backend/src/bootstrap/controlled-event-recommendations.ts:69–85`;
  `lib/features/event_detail/domain/event_detail_repository.dart`;
  `lib/app/event_recommendation_card.dart:34–43`.
- Follow-up entry: `lib/features/ai_conversation/presentation/ai_conversation_page.dart:1747–1757`;
  `lib/app/router/app_router.dart:419–440`;
  `lib/features/proactive/presentation/proactive_settings_page.dart:183–223`;
  `lib/features/proactive/presentation/proactive_push_controls.dart:8–32`.

## Formula distinction and minimum contract dependencies

[The approved deterministic v1 decision](../../decisions/2026-09-01-deterministic-v1-recommendation-formulas.md)
explicitly omits location and participation counts from Event scoring and requires
a new version and PM decision for formula changes. Friend recommendation differs:
its implementation uses shared interests × 2 plus common authorised events × 1,
where each user's authorised Interested/Going IDs are deduplicated first
(`backend/src/friend-recommendations/domain/friend-ranking.ts:10–18, 110–159`).
This does not mean friends' participation currently influences Event ranking.
Age and affiliation are not inputs to either inspected ranking function.

QA needs the following concrete contracts to evaluate the new behavior; this is
not approval to invent them or a request to reopen the approved product direction:

- Automatic today references: captured timezone/day boundary, bounded count and
  ordering, incomplete-read handling, explicit exclusion/disable scope, and how
  changed/deleted sources invalidate preparation without losing the draft.
- Event batches: rotation scope, deterministic eligible order, exhaustion,
  account/consent/expiry invalidation, and failure behavior. The existing source
  first-batch bound must be stated honestly.
- Photo: owner write/read boundary, allowed content/size, profile visibility,
  deletion/update concurrency, and actual image storage/transport contract.
- Event detail: actual available description/image fields, licence/attribution,
  validated URLs and lifetime; distinguish information from purchase without
  inventing a second URL or guaranteeing an external page step.

## Minimum independent verification matrix

| Check | Required observation | Current QA status |
| --- | --- | --- |
| Ordinary input control | Type a nonempty draft, visit references without selecting, return; Send available, draft exact, zero send side effects. | Independent Pass on 087281e. |
| Cancel final selection | Select and remove the only record, return; available Send, exact draft, no automatic execute. | Independent Fail: Send callback null; all preceding readiness/draft/no-send assertions passed. |
| Cancel empty review | Review zero sources, cancel review, return; available Send without forcing another preview. Explicit empty selection must not silently reacquire excluded sources. | Independent Fail: Send callback null; all preceding readiness/draft/no-send assertions passed. Auto-today exclusion still awaits repair-head verification. |
| Send-time freshness | One explicit Send checks the exact selected/automatic IDs and current versions; changed/deleted/expired preparation cannot dispatch stale content; draft survives. | Await exact App/Context repair head. |
| Unknown / saved User | While original outcome is unknown, no new ordinary/selected execution; read the original operation. Saved-User retry preserves identity and selection rules. | Await exact repair head; prior F1 evidence is not a new-round pass. |
| Home scroll | Actual Home with populated sections: scroll down and back; section does not trigger a redundant read or collapse the anchor. Expiry/background/permission retirement still applies. | Root reports its own red; no QA execution. |
| Batch/discovery/detail | With an alternative eligible batch, explicit rotation changes group; exhaustion is honest. Home and Friends discovery remain usable. Actual details precede a separately labelled purchase action. | Source audit only; await contract/head. |
| Profile/place/follow-ups | Photo permission and privacy obey contract; compact controls remain hit-testable at 320dp/large text. Readable labels preferred. In-app scheduling remains usable independently of push configuration. | Source audit only; await contract/head. |

Independent fixture: `tool/core-feedback-qa/ai_cancelled_selection_test.dart`.
Initial SHA-256: `66c46fe9c0e44874c94826a88fb9ddf102bc757d380e6471cbf4cb8a8443407c`.
It reuses existing fake repositories and asserts behavior rather than a particular
`active=false` implementation or fallback to legacy preparation. It disposes
providers in `try/finally` before widget-test timer checks. It is outside production
test ownership by the explicit QA directory assignment.

## Authorised baseline execution

Integration subsequently granted one exclusive short Flutter window for these
three cases. Command, run from this QA checkout with unchanged baseline production
files and QA commit `bb93759b029725397608bdbbed490f0c330f4c23`:

```text
flock -n /home/miku/.local/state/enmori-product-round-20261023/flutter-validation.lock /home/miku/.local/bin/fvm flutter test --no-pub --reporter expanded tool/core-feedback-qa/ai_cancelled_selection_test.dart
```

- Started 2026-10-25T11:47:27.905715Z; ended 11:47:44.715466Z; 16.809 seconds.
- Flutter command exit 1; 1 Pass / 2 Fail, precisely at the two expected button
  availability assertions. No fixture, compile, pending-timer, or cleanup failure.
- Raw log: `/home/miku/.local/state/enmori-core-feedback-20261025/qa-ai-gating-087281e/baseline-red.log`.
  SHA-256 `7995ca8135bb7bb8be033435bf8a566e7a93433e648fd7b703c1763fd7dbcaad`.
- Same private directory retains `run.json`, the exact fixture, and
  `source-before.json` / `source-after.json`: all 872 inspected source, existing
  test, contract, dependency-lock and platform files unchanged.
- `.fvmrc` pins Flutter 3.47.2. Reused the already-resolved Integration package
  config/graph after exact hash checks; no pub get or dependency changes.
  `pubspec.lock`: `523dfbacd19c0d6e3c33fe9e6e46606ec62f8939bc78f7013810a01d5feb8a96`;
  package config: `9a1b335331cad80214d50523873fc1dfe9f58b7d165f91e4e61eebef04d0a1cd`;
  package graph: `475e4eba271931418a8c39e5ce58fac59064d3437a4a6e4d2be6afc89646803e`.
- Lock released when the command ended; slot explicitly returned to Integration.
  No second run, formatter, analyser, broader suite, or model call was performed.

App's reported IME controls and selected-record red, and Root's Home red/green,
remain author evidence only; no author count is added to the three QA cases.
No repaired head has yet passed these independent cases.

Integration has also supplied `api/ai-today-context-contract.md` in its working
tree. QA read its server-derived civil day, latest-five bound, explicit off/empty
selection, current-topic identity exclusions and fresh Send-time preparation.
The baseline above predates that addition; implementation and an exact integrated
revision still require independent review before claiming the new behavior.
