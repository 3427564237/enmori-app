# LI joint candidate validation — 6 October 2026

Local executor: LI/Codex. This is the early combined check authorized by the [implementation decision](../../decisions/2026-10-05-li-blocker-implementation-approval.md) and [practical delivery guidance](../../decisions/2026-09-30-sprint3-practical-delivery.md). It does not assign DU as an Android executor or replace JIN's later combined gate and LI's independent review of JIN-authored gate evidence.

## Exact candidate and review trail

The local branch `souma/s3-joint-validation-20261006` composes these pinned sources, with two normal, conflict-free local merge commits:

| Source | Exact commit | Verified scope |
|---|---|---|
| Current remote main | `281c16b07a64633dea083808f9b8a3a567d7e6c4` | Five preparation Markdown files since the original common baseline `432f5285966a6c2705473be21a2652ca2869520a`; no added product code |
| PR #50 | `ec59a166f8901932bf9453ee49d7b51e671d32e4` | [DU approval](https://github.com/3427564237/enmori-app/pull/50#pullrequestreview-5427310306), including the bounded Check-in Pending repair; excludes predecessor/joint/merge acceptance |
| PR #54 | `9cfb9a9e23d4a589e59c40cde78cceadd617cd70` | [SHI Friend approval](https://github.com/3427564237/enmori-app/pull/54#pullrequestreview-5427129989) and [ZHOU Event approval](https://github.com/3427564237/enmori-app/pull/54#pullrequestreview-5425205340), each scoped to its component |
| Executed joint candidate | `e029f51cf0db6bca7064634ebe351470e878a804` | Includes both reviewed source heads and current main; new joint independent disposition has not been submitted |

Compared with #54, executable differences are only the two Check-in Presentation files and the five-case Pending regression test already reviewed in #50. Those three blobs match #50 exactly. All other tracked product/runtime/contract/test files match #54, including Friend, Event, shared routing/auth/network code, Backend and OpenAPI. Remaining differences are Markdown/JSON evidence and preparation records; their historical proposals do not supersede the approved implementation contract.

SHI's latest independent clean run on #54 passed Friend 3/3, full Flutter 150/150 and analysis. The older shader failure remains historical evidence; this report does not relabel that failed run as a pass. No repeated Friend/Event implementation review is requested for unchanged blobs.

## Execution

All checks began Not Run for this new joint candidate. Results below belong only to the candidate above. Existing commands and tests are reused; no product code, dependency, SDK, theme or test exclusions were added for this composition.

| Check | Actual result |
|---|---|
| `pnpm backend:verify`, Node 24.19.0 / pnpm 11.19.0 | Pass, 313/313; generated untracked `backend/dist` cleared before build |
| `fvm flutter analyze`, Flutter 3.47.2 / Dart 3.13.2 | Pass, no issues |
| `fvm flutter test --reporter expanded` | Pass, 155/155; includes Pending, Unicode and sign-in lifecycle regressions |
| `pnpm backend:verify:emulator` | Pass, 37/37; actual Auth/Firestore Emulator suite |
| `node tool/run_s3_blocker_emulators.mjs emulator-5554` | Pass, 1/1 Android integration and host persistence assertions; runner exit 0 |

Auth/Firestore tests use `demo-enmori-rmvp01a-r10`, ports 9099/8080, with serial execution. Android uses the existing isolated `enmori_s2_api36` AVD, API 36, software graphics. Preflight confirmed `emulator-5554` device and boot completion. The runner uses real Backend HTTPS, temporary test trust and synthetic fixture accounts; no real account/provider credentials or remote Firebase project are used. The actual Android test passed all three flows below. Emulator ports were released and the AVD started for this run was stopped after success; `adb devices -l` is empty. The runner deleted its two temporary Auth users and private configuration/certificate directory in `finally`; Firestore fixture data lived only in the non-exported Emulator process. The generated test APK embeds ephemeral fixture credentials and remains ignored locally; it is not a distributable artifact.

Android pass markers:

- `S3_CHECKIN_ANDROID_THREE_SNAPSHOTS`: save Private/Public/Friends-only defaults, create each new record, reread saved Private after later setting changes.
- `S3_EVENT_HOME_ALL_DETAIL_COPY`: Home and independently computed See All navigate to the same Backend Detail and copy its approved synthetic URL.
- `S3_FRIEND_TWO_ACCOUNT_DECLINE_ACCEPT_REREAD`: A sends, B declines, A sends a new reference, B accepts, A independently rereads Already friends.
- `S3_CHECKIN_THREE_SNAPSHOTS_FRIEND_ACCEPTED_EVENT_DETAIL_COMPATIBLE`: host checks three stored visibility snapshots/owner, settings revision, friendship with no pending request, empty recipient inbox and unchanged six-field recommendation storage.

APK SHA-256: `365da73cf73a3dd80d67f43cf0106ab5ae40b20f5e5f45fde330e76e38c036ca`. Device test completed at approximately 11:46 UTC (19:46 Asia/Singapore) on 6 October. No physical-phone, cloud-provider or UAT conclusion is inferred from this Android Emulator result.

Measured, sanitized results are in [the joint result manifest](2026-10-06-li-joint-results.json). Raw local logs are `/tmp/enmori-joint-backend.log`, `/tmp/enmori-joint-analyze.log`, `/tmp/enmori-joint-flutter.log`, `/tmp/enmori-joint-firestore.log`, and `/tmp/enmori-joint-android.log`; only bounded non-sensitive result summaries are included in this packet.

## Remaining gates

GitHub readback on 6 October confirms #50 and #54 remain Draft at the reviewed commits above. PR #43 `27b899fe93066298bd36d4d5dadf0f90a374a50d` still has DU's review request and no submitted independent conclusion. PR #42 `479619e8d124f3342458506fc145dc4bfbe3f483` has no human GitHub review conclusion in the inspected surface; the historical Copilot quota comment is not approval. Verify the applicable planning review/acceptance basis separately before treating this predecessor as cleared.

JIN's later combined gate and LI's review remain pending. Component approvals are retained; they are not automatically transferred to this joint SHA. If later composition changes Friend/Event/shared wiring, request the corresponding current-head review. No remote branch/PR publication, merge, Ready status, Issue/Sprint acceptance, UAT, Release or real-user/provider activation was performed in this local run.
