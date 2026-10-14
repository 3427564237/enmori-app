# SHI first synthetic Event UI increment

14 October 2026, Asia/Singapore. Base: #98 `1cc52800e7d51320d6b97c76b5b6e2ee3f9dcba0`; branch `codex/shi-synthetic-event-ui-20261014`. The containing source commit identifies the three executable files below. Tests ran on their working-tree bytes before documentation/commit; no executable edits followed successful verification.

## Implemented scope

The authorized social read-only Event card/list/detail increment adds icons/detail affordance, a time card, and an explicit opt-in synthetic notice across loaded/loading/empty/error surfaces. Existing recommendation ordering, Home Top2, See All independent read, exact empty copy, stable error/retry, detail/controller and copy-link behavior remain. Default constructors do not claim ordinary data is synthetic. No interest/registration/people mutation or external-launch success was invented.

Executable files:

- `lib/features/event_recommendations/presentation/event_recommendations_page.dart`
- `lib/features/event_detail/presentation/event_detail_page.dart`
- `test/features/event_social_preview_test.dart`

Shared Home/router/social shell, Backend/API, repositories, Android configuration and dependency manifests/locks are unchanged. LI is the shared writer; the [constructor handoff and one proposed missing contract package](../../planning/2026-10-14-shi-synthetic-event-increment-handoff.md) identify how to opt in to the notice at approved synthetic call sites. The proposed own-marker behavior is not implemented or approved by this evidence.

## Actual SHI validation

Pinned Flutter3.47.2/Dart3.13.2, existing locked dependencies, no install or package change.

| Command/check | Actual result |
| --- | --- |
| Pinned Flutter `test --no-pub --reporter expanded test/features/event_social_preview_test.dart` | 8/8 Pass, exit0 |
| Pinned Flutter `test --no-pub --reporter expanded` | 525/525 Pass, exit0 |
| Pinned Dart `analyze --fatal-infos lib test integration_test` | No issues, exit0 |
| Dart format of the three executable files | Test file mechanically formatted before execution; existing two UI files unchanged by formatter |
| `git diff --check` | Pass |

The eight new cases cover synthetic card identity/order/ID-only callback, Top2/See All, exact empty copy, safe retry, pending/detail/non-participation, default constructor behavior, read-only unavailable retry and 320x640/1.5-text scrollability. Logical cases are not physical accessibility evidence. No first focused/full product test failure occurred in these invocations; successful results do not close the separate prior #99 Persona flake.

Backend/Emulator were not rerun for this Flutter-only presentation change. APK build, real Android execution, shared-caller notice integration, ZHOU independent review and LI acceptance are Not Run/Pending as applicable. Prior #98 owner APK/results retain their original attribution and do not certify this new tree. This does not claim all six Event routes, participation, authorised provider access, full42/Sprint/UAT/Release/Done.

## Gates and ownership

- SHI: module source/tests and JIN's separately submitted new AI review; no repeat #99 review.
- ZHOU: independent review of this new Event code.
- LI: shared synthetic call-site integration and bounded acceptance; one consolidated own-Interested/people/external-return proposal needs its precise disposition before dependent new behavior.
- LI/external authority: provider rights/access if real acquisition resumes; not a blocker for synthetic read UI.

Keep Draft/Open when published. No merge, Issue closure, board transition, new API/schema/dependency/index/provider/runtime enablement or completion inference.
