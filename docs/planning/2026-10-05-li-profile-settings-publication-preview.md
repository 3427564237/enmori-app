# LI verified Profile/Settings publication preview — 2026-10-05

The approved implementation is complete locally with source `e6f72b9123e79045d7c1c0cc1cd58a8198275434` and verification-only follow-up `b752ee04ae4a65785a9235b0df284df10ecb9dfb`. The [execution/evidence packet](../evidence/sprint3/2026-10-05-li-profile-settings.md) and [PM preparation execution](../evidence/sprint3/2026-10-05-li-pm-preparation-execution.md) are concrete reviewable artifacts. The last authorized documentation publication is `7e24396135ce41c94873da05f59af033c4035dee`.

LI's existing action-time GitHub confirmation preference applies to this new source/evidence publication. The previously approved package explicitly authorized implementation locally and publication of its preparation/decision documents; it did not merge or accept LI's resulting new code.

## Proposed actions upon confirmation

1. Recheck #50's published head/base and push the verified source/tests/evidence commits to its existing `souma/s3-01-li-start-20260930` branch without force. If that branch changes, reconcile the actual changes and reverify affected checks before publication.
2. Update #50's title and description using the exact content below; append the actual final evidence/publication commit and immutable evidence link at publication. Keep it Draft/Open over #43 and retain DU's assigned independent review.
3. Post the short evidence/status comment below to #45. No separate message to a teammate, self-approval, predecessor merge, #45/#44 closure, Project Done or Sprint/UAT/Release acceptance is included.

## PR #50 title

`feat: add owner Profile Settings and device signout`

## PR #50 description

Home opens the authenticated owner's Profile with canonical Username and saved Interests. The new approved increment adds an optional editable DisplayName, independent Profile visibility, Check-in-default and optional-data-use Settings, and device signout. Save is followed by an authoritative Backend reread; unsaved Back does not submit, stale/unconfirmed writes require explicit reload, and disposed/previous-account responses cannot restore old state. Returning to Home retains its independent recommendation request.

The four owner-only Backend operations derive identity from verified Auth/Binding, expose minimized DTOs, reject undeclared fields and use separate Profile/Settings revisions with atomic Account-field preservation. Legacy reads do not migrate data. Current Account reads accept Friends-only; initial onboarding Accept/Reject remains unchanged. No new dependency, collection, index, other-user reader or provider integration is introduced.

Relates to #45. Owner: LI HOURUI. Assigned reviewer: DU KUN. Authority: S-PM-1005-LI-PROFILE-SETTINGS and its exact approved contract.

Owner verification: Node 24.19.0/pnpm 11.19.0 strict Backend build and 286/286 tests; real isolated Auth/Firestore Emulator 28/28; Flutter 3.47.2/Dart 3.13.2 analysis clean and 126/126 unit/widget tests; Android 16/API 36 real Auth → HTTPS Fastify → Firestore Emulator scenario 1/1. The device scenario covers canonical name/visibility save, cancellation without PUT, independent Settings changes, real signout/sign-in, retained Interests and fresh Home reads. Host persistence corroborates final resource fields/revisions. Instrumented test APK SHA-256: `de0678aa8e91a78828acaaa50b608eb2e3f9db31e6e6aa9b5e6bcbf5e063d915`.

Implementation/Android source: `e6f72b9123e79045d7c1c0cc1cd58a8198275434`; verification-only follow-up: `b752ee04ae4a65785a9235b0df284df10ecb9dfb`. DU approved the historical first-Profile product at `acc6763b8b2cc53dc67b38a4a7c7a3fa7ff4ebf5` and its Android test/runner/evidence at `daca5e3a60696c411290451346a8ce8db9d1de20` (review 5407782515). Those approvals stay limited to their exact scopes; the new diff/evidence needs DU disposition. #43 predecessor `27b899fe93066298bd36d4d5dadf0f90a374a50d` over #42 remains a separate review gate. Recheck the combined tree and actual diff after the predecessors are resolved.

Preparation-only #51/#52 were accepted and merged; #46/#47 preparation items are Done. This does not complete their modules. Other-owner destinations/producer permissions, additional Profile fields, verification/recovery prototypes and the JIN combined gate remain Pending/Not Run. This packet is owner Emulator evidence; cloud/controlled-Demo, physical phone, iOS, UAT, Release and whole-Sprint acceptance are not established. #45/#44 remain open.

## Issue #45 comment

LI's approved own Profile/Settings increment is implemented and verified: optional DisplayName, independent Profile privacy, saved future Check-in visibility and optional-data-use choices, real device signout/sign-in, and canonical save/reread/cancel behavior. Backend 286/286, Auth/Firestore Emulator 28/28, Flutter 126/126 plus clean analysis, Android real-Backend scenario 1/1 and host persistence checks Pass. The new source/tests/evidence are published together in #50 for DU's disposition; the actual head and evidence link will be appended at publication.

DU's first-Profile product approval at `acc6763` and follow-up Android test/evidence approval at `daca5e3` are recorded; neither approves the new diff or predecessor #43. #43's separate review and final stacked-tree checks remain required. #48 needs DU's bounded artifact before LI can review it; JIN's combined gate likewise needs an actual submitted packet. Preparation-only #46/#47 are accepted/closed, while #45/#44, whole modules, Sprint acceptance, UAT and Release remain incomplete. No owner artifact, contract or independent approval is invented.
