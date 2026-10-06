# LI — Check-in Pending lifecycle remediation

Status: local repair and focused regressions Pass; publication/new-head DU disposition Pending. Source branch: `souma/s3-checkin-pending-recovery-20261006`, based on PR #50 `97d102de34dc457bbcb8f7154471ff1dea8efa7c`. Executable fix: `d54a04f8ea092aafd0a8ad7bd4bebd1e814105c5`. Later delivery commits add evidence/preview only.

Authority/scope: LI's request to finish the remaining work after teammate updates; approved Note-only Check-in and narrow snapshot contracts remain unchanged. [DU's exact-head Changes Requested review](https://github.com/3427564237/enmori-app/pull/50#pullrequestreview-5424567436) identifies the lifecycle bug and requires delayed create/read pop/reopen regressions. This is an implementation repair, not a new business/contract decision.

## Reproduction and repair

Five widget scenarios failed before the repair: same-Note create retry, changed-Note create retry, saved-read exit, composer confirmation-read exit, and replacing a saved page while both reads are delayed. The first four kept the reopened Save button disabled. The last discarded the replacement page's current read because an old page's deferred global abandonment invalidated it.

Pages now remember the existing controller operation token when they initiate create/read. Disposal immediately invalidates only that owned operation. A guarded microtask clears its abandoned Pending UI state after route disposal, without clearing the Note/idempotency key or touching a newer operation. A page without an owned operation cannot cancel another page's read. Ref-mounted/generation checks still discard old completion.

The server write is not cancelled or asserted absent. Retrying the same normalized Note on the same auth subject retains the original key; a changed Note starts a fresh key. Existing successful-result key clearing and auth-subject key reset remain. No Backend/API/OpenAPI/storage, dependency, architecture, activation or visual-style change was made. The executable delta is two Check-in Presentation files plus one widget test file.

## Measured verification on the PR #50 candidate

| Check | Result |
|---|---|
| Before-fix widget reproduction | 0 passed / 5 failed, expected disabled-button/lost-current-read assertions |
| After-fix focused widget suite | 5/5 Pass |
| Full Flutter suite | 133/133 Pass, no skips |
| `fvm flutter analyze --no-pub` | Pass, zero issues |
| Clean Backend build/regressions | 290/290 Pass, zero failures; generated dist cleared before build so no stale #54 tests were counted |
| `git diff --check` | Pass |
| New-head Android/Emulator execution | Not Run; no new-head device success inferred |
| New-head independent DU review | Not Run |

Commands: `fvm flutter test --no-pub test/features/check_in_pending_recovery_test.dart --reporter expanded`, `fvm flutter test --no-pub --reporter expanded`, `fvm flutter analyze --no-pub`, pinned Node `pnpm backend:verify`. Runtime: Flutter 3.47.2 / Dart 3.13.2, Node 24.19.0 / pnpm 11.19.0. Counts above are the standalone #50 candidate, not the combined #54 totals. Earlier APK/Emulator evidence remains historical.

## Live teammate/predecessor boundary

ZHOU [approved Event on #54 at exact `9cfb9a9e23d4a589e59c40cde78cceadd617cd70`](https://github.com/3427564237/enmori-app/pull/54#pullrequestreview-5425205340); the two Event findings are resolved for that scope. #54 was not changed by this repair. SHI's Friend approval is still withheld for the recorded shader/test-asset gap; [the clean supported-environment evidence and diagnostic steps](2026-10-06-li-shader-review-support.md) do not impersonate SHI's result.

DU's #50 Changes Requested remains until new exact-head disposition. #43 at `27b899fe93066298bd36d4d5dadf0f90a374a50d`, based on #42 `479619e8d124f3342458506fc145dc4bfbe3f483`, remains Draft and has no independent review. This prerequisite is not silently discharged by a #50 approval. No merge, Issue/Project status advance, overall acceptance, UAT or Done is claimed. Updating #50's base branch later does not automatically turn standalone #54's old Check-in source into the repaired code; the eventual combined tree still requires its normal validation.
