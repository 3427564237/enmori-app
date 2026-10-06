# SHI Event review remediation — local verification

Date: 6 October 2026, Asia/Singapore. Owner: SHI. Independent Event reviewer: ZHOU.

Reviewed PR: #54, remote head `204e6862616f5d21cb19d21422188c829e2e977f`.
Local executable fix: `e90675a4ebbfa1ae4c7ff3d69efcdc22efec7244`.
Local branch: `codex/pr54-event-review-fixes`.

## Authority and bounded change

The [approved isolated implementation](../../decisions/2026-10-05-li-blocker-implementation-approval.md), the Backend architecture and ZHOU's [exact-head review](https://github.com/3427564237/enmori-app/pull/54#pullrequestreview-5425036304) govern this remediation. The user explicitly requested progress on SHI's actionable work. This record does not approve a changed contract or independently close ZHOU's findings.

- Flutter rejects unpaired high/low UTF-16 surrogates in all four Event text fields. Valid supplementary scalars remain accepted and existing length limits remain unchanged.
- Event Detail no longer imports Recommendation Infrastructure. Its private storage parser retains the same calendar-exact Z timestamp and nanosecond comparison behavior. No new shared abstraction or dependency is introduced; recommendation source is unchanged.
- Added nine Flutter parser tests and one Backend regression covering invalid calendars, fraction precision, UTC shape and one-nanosecond end ordering.
- No Friend, Check-in, public route, DTO, storage field, activation or deployment behavior changes.

## Executed evidence

Runtime: Node.js 24.19.0, project-local pnpm 11.19.0, existing Flutter 3.47.2 / Dart 3.13.2. Existing frozen installation was retained; no dependency/lock-file changes.

| Check | Result |
| --- | --- |
| New Unicode tests before the fix | 1 valid control passed; 8 rejection assertions failed as reproduced |
| New Unicode tests after the fix | 9/9 Pass |
| `pnpm run backend:build` | Pass, strict TypeScript |
| `pnpm run backend:test` | 313/313 Pass, no skips |
| Actual isolated Auth/Firestore Emulator suite | 37/37 Pass, no skips |
| `dart analyze --fatal-infos` | Pass, no issues |
| Dart format check on changed Dart files | Pass |
| `git diff --check` | Pass |
| Cross-feature Infrastructure import scan under Event Detail | No Recommendation Infrastructure import |
| `flutter test --no-pub --reporter expanded` | Failed: 142 passed / 8 failed, all reported `Asset 'shaders/ink_sparkle.frag' not found` |
| New-head Android / APK / dual-account device chain | Not Run |

Flutter commands used a temporary ASCII SDK junction to the existing pinned SDK, not a changed SDK, theme, splash factory, test exclusion or asset bypass. The Unicode suite command was `flutter test --no-pub test/features/event_detail_unicode_test.dart --reporter expanded`. The temporary junction was removed after verification. The full-suite resource failure remains a local independent verification blocker; ZHOU's old-head 141/141 result is not a replacement for this result.

Emulator invocation: `firebase emulators:exec --project demo-enmori-rmvp01a-r10 --only auth,firestore --config firebase.json --non-interactive "node backend/scripts/run-emulator-tests.mjs"`. Both CLI and test subprocess used the repository's credential-filtered isolated-profile environment, explicit test mode, matching demo project IDs and loopback Auth/Firestore endpoints. No real Firebase project, shared Demo data or credentials were used. The disposable CLI profile was deleted; all emulators shut down with exit code 0.

## Remaining gates and publication preview

1. Action-time confirmation is required by the [retained publication rule](../../planning/2026-10-06-blocker-publication-preview.md). The old batch approval covers the original published payload, not this new fix. **No push or external review request was performed for this increment.** Proposed batch: fast-forward PR #54's existing branch from the verified remote head to this local branch's final evidence head; publish an English reply containing exact SHA/results; request ZHOU Event re-review; retain Draft. Re-read remote head and reconcile any concurrent changes before pushing. No force push, merge, issue closure or status advancement.
2. ZHOU must independently review the new exact head after publication. SHI cannot approve SHI-owned Event fixes.
3. SHI Friend approval remains withheld for the unresolved local shader/Widget verification gap. Friend executable source is unchanged by this increment; no independent approval is inferred.
4. PR #50 remains at `97d102de34dc457bbcb8f7154471ff1dea8efa7c`, Draft/Open as read back this turn. DU's new Check-in Pending-state finding remains LI's fix and DU's exact-head re-review responsibility. This increment does not address it.
5. Normal Friend/Event entries remain disabled. Real-user eligibility, actual provider acquisition/use and production activation remain outside the isolated authorization. No UAT, Release, Done, or new-head Android success is inferred.
