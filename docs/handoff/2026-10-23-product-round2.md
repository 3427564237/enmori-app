# Product expansion round 2 — 23 October 2026

Authority: [confirmed PM scope](../decisions/2026-10-23-li-product-round2.md).
Previous round and calendar repair close at
`58e8e06f71cc888007d7fde1ec1aa8a0bc52f480`.
Common round-2 baseline: `4d9cbf926d356320bc9b4721031e3c50dddd9fae`.
All five owners confirmed clean new branches at this exact commit, preserved
their first-round branches and verified their accepted work is included.

Integration branch: `souma/product-round2-integration-20261023`.
Module PR target: fixed `souma/product-round2-review-base-20261023` at the common
baseline above (replaces the initial assembly target; decision records why).
Integration PR target:
`souma/product-integration-20261023`. All new PRs are Draft; no main merge.

| Module | Existing chat ID | New branch | Capability / consumer / interface | Delivery SHA / status |
| --- | --- | --- | --- | --- |
| Integration | `01a1689a-d9ea-7cd0-82cc-8da9d0d1770f` | `souma/product-round2-integration-20261023` | Shared routes, composition and final candidate | Composition checked; signed candidate pending |
| App | `01a1689b-0799-7550-a624-e44ec1aa3081` | `souma/product-round2-app-20261023` | Today's own Check-in preview → detail → refreshed Home; existing own-date Repository + device date/zone | Integrated `b1492ef9efcc2a624aa6820f859e3e9b60247aed`; [Draft #181](https://github.com/3427564237/enmori-app/pull/181) |
| Social | `01a1689b-0dd3-7560-b85b-25100b4a02eb` | `souma/product-round2-social-20261023` | Visible user's plans vs own choices → Event detail → fresh comparison; existing participation reads | Integrated `f72f965a0bcdc67c150d63ee2a6fe55d725b90f3`; [Draft #184](https://github.com/3427564237/enmori-app/pull/184) |
| Journal | `01a1689b-1662-7f13-bc79-b5ffeeadd284` | `souma/product-round2-journal-20261023` | Own saved record → new editable text draft → explicit create; existing readOwned/create | Integrated `b9f4b644a1f2ef6b92927421e055864e09b31d39`; [Draft #182](https://github.com/3427564237/enmori-app/pull/182) |
| AI | `01a1689b-1e74-7c10-8268-48613e5c668c` | `souma/product-round2-ai-20261023` | Find current conversation messages → context → return with draft; existing authorized messages/explicit paging | Integrated `867aa12b26f5d843d78c444a2af8b0b966adf55f`; [Draft #183](https://github.com/3427564237/enmori-app/pull/183) |
| Backend | `01a1689b-274c-7173-a559-90cd40e96985` | `souma/product-round2-backend-20261023` | Existing APIs support all four consumers; added composition regressions, no new service feature | Integrated `fe1dde54a212bae4d124e6f772a8e85572d7bc39`; [Draft #180](https://github.com/3427564237/enmori-app/pull/180) |

Owners preserve their old branch, verify the common baseline includes accepted
round-1 delivery, and protect any dirty work before branching. Keep one source
for preferences and business facts. Report selected capability, how it differs
from existing behavior, consuming screen, interface needs and a short acceptance
path early; continue independent implementation instead of waiting for routine
approval. New authority-sensitive behavior remains scoped for review.

Flutter validation is serialized with
`/home/miku/.local/state/enmori-product-round-20261023/flutter-validation.lock`;
Integration owns Gradle/APK builds. Deliver exact commits, bounded check results,
remaining limitations and new Draft PR links. Integration accepts only reviewed
deliveries and tests composition and critical return paths.

The prior 19 targeted calendar/transport checks passed; calendar deployment and
phone verification remain not run. The 58-probe AI relevance diagnosis remains
unsuccessful, and further small-plan tuning/model probes are stopped. No source
or fixture result is reported as real AI/device acceptance. No shared runtime,
real data, phone, signer or infrastructure is changed during this round.

## Integrated paths and source verification, 24 October

All five module deliveries above are locally merged by exact commit. Module
Draft reviews remain separate on the fixed common review base; no GitHub PR or
main branch was merged. Integration supplies the Home day section and awaited
History/owned-detail callbacks; owned detail opens `/check-in?from=<id>` for a
fresh owner read and a separate text draft. Discard returns to the source, with
a direct-entry fallback. No historical location, weather or sharing is copied.

The shared visible-participation entry now supplies a Scaffold, safe scrolling
and navigation to `/people/<username>/plans/compare`. Comparison awaits Event
detail before fresh reads; direct entry can return to the relevant Profile.
Current session, current URI and covered-route checks fence these callbacks.
AI lookup uses its internal page and existing transcript; it does not change
shared routes, prompt/model transport, consent or operation recovery.

Central module verification has final passing evidence for App 13, Journal 19,
Social 13 and AI 15 unique cases. These are bounded batches with documented
corrections, not one fresh combined suite. Journal corrected one inner-text
hit-target warning; AI corrected lazy-list test scrolling; Social corrected
test compilation, lifecycle frame scheduling and lazy-list scrolling. App/AI
lint corrections only added braces. Module notes retain the original failures.
Backend's strict TypeScript build and 112 isolated checks passed; it added two
consumer regression cases without changing service source or API contracts.

Integration's four-file batch passed 13 language/AI navigation cases while the
router fixture initially failed compilation due to a missing provider import.
After that import, 24/33 router cases passed; nine reported pending fixture
timers because UncontrolledProviderScope does not own the test's container.
The fixture now disposes its external container within the test body, before
Flutter's timer invariant. The final complete router-file run passed 33/33.
Thus 46 distinct composition cases have passing evidence, including seven new
Home/Journal/Social route cases. The final four-target static analysis is clean.
Tests do not demonstrate real service/model, native restart or phone acceptance.

Journal's English/Chinese 375×812 fixture images were reviewed by both Journal
and App. They show readable copy, original user text, current permissions and
explicit Save. This is synthetic static preview evidence only. No additional
feature, dependency, data model, service configuration or signing change is
introduced by assembly. Candidate version and artifact hashes are recorded only
after the release build and signature/package checks succeed.
