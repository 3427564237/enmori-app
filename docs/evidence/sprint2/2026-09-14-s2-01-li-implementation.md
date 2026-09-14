# S2-01 LI implementation and verification evidence

- **Issue:** #27, S2-01 Own interests vertical slice
- **Owner / independent reviewer:** LI / DU KUN
- **Implementation baseline:** `31bdb78574ca04f50d42954816ad33d709f89ca4`
- **Controlling Sprint 2 contract:** PR #25 head `3a110132b01f2dee3605351ce123aa90a3376ccb` (open; independent review and merge still pending)
- **Implementation branch:** `souma/s2-01-interest-20260914`
- **Code commit SHA:** `0b082ab19aca9783a1eedc932da87cca6d209010`

## Delivered local scope

- Added the three S2-01 Interest routes and the fixed OpenAPI/data mapping.
- Added Backend application/Port/Firestore boundaries with account-derived ownership, 0–10 distinct selection validation, Active/new-assignment enforcement, existing Inactive preservation/removal, optimistic revision replacement, safe errors and no Interest idempotency store.
- Added Flutter models, Backend Repository, Riverpod controller and Interest editor reached from Home. The page supports loading, editing, clearing, saving, success, explicit failure retry, explicit reload after 412, Inactive removal and late-response abandonment.
- Kept Account and Check-in DTOs unchanged. No Event, fixture initializer, Admin API, dependency, Mood, Weather, history, AI or Friend product entry was added.

## Environment and results

| Check | Environment | Result |
| --- | --- | --- |
| Frozen dependency install | pnpm 11.19.0; `pnpm install --frozen-lockfile --ignore-scripts` | Pass; lockfile unchanged; 690 cached packages linked; lifecycle scripts disabled |
| `pnpm backend:verify` | Node 24.19.0 official Linux x64 binary; pnpm 11.19.0 | Pass, 125/125 tests |
| `pnpm backend:verify:emulator` | Node 24.19.0; Firebase Auth + Firestore Emulator; demo project `demo-enmori-rmvp01a-r10`; loopback controlled profile | Pass, 17/17 tests |
| `fvm flutter analyze` | Flutter 3.47.2 / Dart 3.13.2 | Pass, no issues |
| `fvm flutter test` | Flutter 3.47.2 / Dart 3.13.2 | Pass, 88 tests |
| `fvm flutter build apk --debug` | Flutter 3.47.2; existing pinned Android toolchain | Pass; `app-debug.apk`, 167066570 bytes, SHA-256 `e0a89564cc3a083934f380e7c75ad52d487517bbc7051a80f3e824af7ffa235b` |
| Real-backend Flutter integration test | `integration_test/s2_interest_real_backend_test.dart`; Firebase Auth Emulator + controlled Backend configuration required | Authored and included in analysis; **Not Run — Blocked** with the Android row below |
| Android Emulator Interest page + real Backend/Firebase Emulator | `adb get-state`, `adb devices -l`, `fvm flutter devices`, `fvm flutter emulators` | **Not Run — Blocked:** no Android device/AVD and no emulator source was available |

The Node archive checksum was verified against the official v24.19.0 `SHASUMS256.txt`: `14b342e71204f811bde6153be8e04b62aef63c236fef92b55f9c83154b409647` for `node-v24.19.0-linux-x64.tar.xz`.

The Emulator suite exercised real Firebase identity, Fastify transport and Firestore persistence for an empty revision-0 read, 10-Tag save, later read, stale 412, new-Inactive 422, account isolation, concurrent same-revision updates, Inactive retain/remove/no-readd, dependency containment and prior Auth/onboarding/Note cross-boundary regression paths. The Firestore Emulator warned that no rules file is configured and therefore rules default to allow; product access in these tests still crossed the Backend/Firebase Admin adapter, and this warning is retained rather than hidden.

## Remaining gates

- Android Emulator UI with the real Backend/Firebase Emulator: `Not Run — Blocked` until an Android AVD/device and the already-approved controlled ingress/configuration are available.
- DU independent review of the exact evidence-bearing head: Pending.
- Commit, push, PR creation, Issue/Project transition and merge: Pending action-time authorization and later evidence; current GitHub status remains Ready / Not Run for published implementation evidence.
- S2-03, S2-06, the Event chain and final LI team smoke remain owned/dependent work outside S2-01 implementation. No Sprint completion is claimed.

## Prepared PR description

**Title:** `feat: implement S2-01 own interests vertical slice`

**Body:**

> Implements Issue #27 from `31bdb78574ca04f50d42954816ad33d709f89ca4`, using the fixed Sprint 2 contract at PR #25 head `3a110132b01f2dee3605351ce123aa90a3376ccb`.
>
> - fixes the Interest OpenAPI and Firestore mapping for SHI/DU;
> - adds authenticated/onboarded catalogue read and account-isolated own-selection read/replace;
> - enforces 0–10 distinct IDs, Active new assignments, existing Inactive retain/remove, and transactional revisions;
> - adds the Home Interest editor with explicit retry and mandatory reload after 412;
> - preserves existing Account, registration/onboarding and Note Check-in contracts.
>
> Verification: `pnpm backend:verify` 125/125; `pnpm backend:verify:emulator` 17/17; `fvm flutter analyze` pass; `fvm flutter test` 88/88; Android debug APK build pass. A real-backend Flutter integration test is authored but Android Emulator UI execution is `Not Run — Blocked` because no AVD/device is available. DU independent review remains required before S2-01 can be formally complete.

## Prepared DU review handoff

> Please independently review Issue #27 on the exact PR head. Focus on OpenAPI/Firestore mapping consistency, owner derivation through the existing Auth Binding, transaction ordering and same-revision concurrency, 0–10/duplicate/missing/new-Inactive handling, preservation/removal of existing Inactive references, 412 reload without automatic overwrite, Flutter cancellation/late-response behavior, and unchanged Auth/onboarding/Note flows. Re-run the four recorded verification commands with Node 24.19.0, pnpm 11.19.0 and FVM Flutter 3.47.2. The Android Emulator UI row is explicitly `Not Run — Blocked`; do not infer it from widget tests or APK build output.
