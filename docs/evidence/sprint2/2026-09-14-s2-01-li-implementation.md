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

### 2026-09-15 physical-device follow-up preflight

LI's vivo V2405A (Android 16/API 36) now reports `device` over USB ADB. This is a PM-controlled physical-phone opportunity, not the Android Emulator row above and not DU independent evidence. The PR #32 implementation source head for this preflight was `c83faf2f3223468744c440dee5714c59b853b64e`.

- A configured debug APK was rebuilt from that head with the previously approved private `--dart-define-from-file` path. The file is 194653617 bytes; SHA-256 `d42111bc3ae4859a594af9ebaf627fd5610b5771abb29764edc5ff6242f97be0`. The path and its values are not stored here.
- The phone's installed `com.enmori.app` is the prior 2026-09-13 APK, SHA-256 `131d3e7b34cf95ed8d12b7840cbc31ff9c239cff074e25dc783e9efb0ffca50e`.
- The installed and new APK signing certificate SHA-256 digests differ. An in-place update that retains app-local data is therefore unavailable. A scoped uninstall/reinstall of `com.enmori.app` requires LI confirmation because uninstall deletes local session/cache; no uninstall or install was performed.
- The approved controlled Firestore project's `interest_tags` collection had 0 records on read-only preflight. LI did not initialize or write SHI-owned fixture data.
- The private tailnet HTTPS Serve rule remains configured, but no Backend process was listening at the loopback target. Host-side Tailscale status reported the phone peer offline; USB ADB availability does not establish phone-side VPN reachability. No ingress, authenticated Interest request, UI save, or later-read was executed.

**Physical phone result:** `Not Run — Blocked` by the signing mismatch and phone-side private-network/Backend readiness pending LI direction; a real Active-Tag selection path also depends on SHI's controlled Tag data. The permanent test targets Firebase Emulator and `10.0.2.2`, so its Emulator execution is not silently relabeled as physical-phone evidence.

### 2026-09-15 LI PM-controlled physical-phone execution

LI subsequently authorized a scoped `com.enmori.app` reinstall and turned on the phone's Tailscale VPN. Execution was approximately 15:26–15:36 SGT on the same V2405A/Android 16 device and PR #32 source head `c83faf2f3223468744c440dee5714c59b853b64e`.

| Row | Observation | Result |
| --- | --- | --- |
| Scoped installation | `adb uninstall com.enmori.app` and `adb install` of the configured debug APK both returned `Success`; pulled installed bytes matched the local 194653617-byte APK and SHA-256 `d42111bc3ae4859a594af9ebaf627fd5610b5771abb29764edc5ff6242f97be0` | Pass; only this app's local session/cache was deleted; no cloud delete was run |
| Connectivity and Auth boundary | ADB reported `device`; host-side tailnet status reported the phone peer online; Serve remained tailnet-only; the existing loopback Backend ran under Node 24.19.0; loopback/private HTTPS `GET /v1/me/onboarding` both returned `401 AUTH_REQUIRED` | Pass for ingress/Auth boundary only, not product flow |
| Interest initial read | Authenticated app Home opened the new Interest editor; UI showed `0 of 10 selected`, an empty catalogue, and enabled Clear/Save. Read-only controlled Firestore preflight found no `account_interests` document and no `interest_tags` records | Pass for empty own-selection/catalogue UI; Active-Tag selection `Not Run — Blocked` by missing SHI data |
| First empty save | Tapping Save showed `Interests saved.`; a subsequent Firestore read found exactly one `account_interests` document with only `interestTagIds=[]` and `revision=1` | Pass for PM-controlled UI → authenticated Backend → Firestore persistence |
| Later read and revision recovery | Done returned to Home; reopening the editor showed the empty selection and enabled Save. A second empty save showed success rather than 412; Firestore revision became 2 while selected IDs stayed empty | Pass; the second successful compare-and-set is evidence that the reopened page read revision 1 through the Backend |
| Other S2-01 UI/chain paths | One/ten Active Tags, selected Inactive removal, 412 UI reload on a real phone, new registration/onboarding, Note creation, and Android Emulator execution were not performed in this focused run | `Not Run` with the individual dependency/gate retained; existing automated/Emulator results remain separate |

The app initially displayed the prior onboarding destination (New Check-in) rather than Home. Its Note field was empty; a scoped app restart navigated the authenticated startup route to Home. No Note was entered or created. A temporary diagnostic screen capture of the empty Note page and pulled APK comparison files were deleted after inspection. No password, token, email, UID, AccountId, private Note text, endpoint, or Firebase configuration value is retained in this record.

This is **LI PM-controlled Android product-chain evidence for the empty Interest case only**. It is not DU independent review, DU/JIN proxy testing, Android Emulator execution, UAT, Release, S2-01 Done, or the final Auth/onboarding → Note → interests → Event → See All team smoke. The Backend listener was stopped after this focused run; the pre-existing private Serve rule was not expanded or published.

The Node archive checksum was verified against the official v24.19.0 `SHASUMS256.txt`: `14b342e71204f811bde6153be8e04b62aef63c236fef92b55f9c83154b409647` for `node-v24.19.0-linux-x64.tar.xz`.

The Emulator suite exercised real Firebase identity, Fastify transport and Firestore persistence for an empty revision-0 read, 10-Tag save, later read, stale 412, new-Inactive 422, account isolation, concurrent same-revision updates, Inactive retain/remove/no-readd, dependency containment and prior Auth/onboarding/Note cross-boundary regression paths. The Firestore Emulator warned that no rules file is configured and therefore rules default to allow; product access in these tests still crossed the Backend/Firebase Admin adapter, and this warning is retained rather than hidden.

## Remaining gates

- Android Emulator UI with the real Backend/Firebase Emulator: `Not Run — Blocked` because no Android AVD/emulator source is available; the LI physical-phone empty case above does not satisfy this distinct gate.
- DU independent review of the exact evidence-bearing head: Pending.
- Code/evidence commits, branch push and Draft PR #32: Published on 2026-09-14 after LI action-time authorization. Issue #27 remains Open and its Project item is `In Progress`; merge and Done are pending. The 2026-09-15 physical-phone evidence is a documentation follow-up to PR #32, not a new implementation source head.
- S2-03, S2-06, the Event chain and final LI team smoke remain owned/dependent work outside S2-01 implementation. No Sprint completion is claimed.

## PR #32 description at initial publication

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
