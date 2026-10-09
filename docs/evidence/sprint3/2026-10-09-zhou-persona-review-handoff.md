# Persona P08 client: implementation and review evidence

Owner execution on 9 October 2026 (UTC+08:00), for [#68](https://github.com/3427564237/enmori-app/issues/68). This is a bounded implementation handoff for independent review and acceptance, not an approval record.

## Source and authority

Implementation commit: `7e09e7844cdf4e5835120f5ae7eb43b4cbd3db99`. Final integration-test commit: `ab69c03641647f649eb148e094bb7fed3aec1ef0`, which only adds scrolling to a lazily constructed test target. The subsequent evidence-only commit does not change that executable source. The [source and evidence manifest](2026-10-09-zhou-persona-review-manifest.json) binds the files and retained logs by SHA-256.

Base: [#70](https://github.com/3427564237/enmori-app/pull/70), branch `souma/li-persona-home-router-20261009`, exact `f646e26d30547ca9abe8084daedeebe803b1d3f4`. This stacked PR preserves the existing combined components and LI's Home/router contribution; it does not imply that either base PR has merged.

Controlling sources, without rewriting or importing incomplete copies of their historical links:

- [LI's confirmed P08 isolated-flow decision at 141ebcf](https://github.com/3427564237/enmori-app/blob/141ebcf2cecccaa503ff48a8f3403915db6c060e/docs/decisions/2026-10-09-li-persona-p08-isolated-flow-approval.md).
- [Approved contract at 55fa4a7](https://github.com/3427564237/enmori-app/blob/55fa4a7ab77b32b08d300d391ebee4293ad6f963/docs/planning/2026-10-07-zhou-persona-first-contract-delta.md), including PC11-PC13 and client PC14.
- [JIN's exact-head #67 consistency approval](https://github.com/3427564237/enmori-app/pull/67#pullrequestreview-5467525337) and [implementation release at 7799609](https://github.com/3427564237/enmori-app/blob/7799609d61c949643a2c17f88f6b442ba86ff240/docs/evidence/sprint3/2026-10-09-persona-p08-implementation-release.md).
- [LI's #70 page-composition handoff](https://github.com/3427564237/enmori-app/blob/f646e26d30547ca9abe8084daedeebe803b1d3f4/docs/evidence/sprint3/2026-10-09-li-persona-home-router-handoff.md) and [DU's approval of that exact head](https://github.com/3427564237/enmori-app/pull/70#pullrequestreview-5467840467).
- [LI's bounded acceptance of #65 Backend at c19811c](https://github.com/3427564237/enmori-app/blob/c19811cef912c2b094ed71469c11fc994f5dcb81/docs/decisions/2026-10-09-li-persona-backend-component-acceptance.md). This approval remains attributed to that Backend contribution.

The user subsequently authorized this Draft PR and requests to JIN and LI. Earlier local-only records remain historical snapshots; their upload restriction does not describe this new authorized handoff.

## Implementation

- Strict Persona DTOs/Repository for the six approved operations, operation-specific success/error validation, and JSON-body DELETE/204. Existing shared-client callers retain their existing single-result contract.
- A 15-second foreground create budget, separate eventual completion, and pre-dispatch session/command eligibility. No automatic retry, late-token dispatch or persistent queue.
- Session state retaining the exact uncertain create command, recovery-412 closure, matching late success, explicit disposition, independent rereads and highest-observed revision. Obsolete sessions, commands and pages cannot overwrite current state.
- Overview, management, create and edit pages for M23-M25/NS31-NS34, through LI's existing page composition. Selection remains separate from explicit activation; activation/deletion and dirty/in-flight exits follow the approved confirmations.
- Shared-auth correction: `userChanges()` to `authStateChanges()` prevents token/profile refresh from invalidating in-flight feature commands. Real signout and later same-UID authentication still create a new session. This is a new shared behavior change for JIN review and LI visibility, not covered by DU's earlier routing approval.
- Accessibility correction: cancelled management confirmations restore keyboard focus to the invoking control after it is reenabled, guarded by page/session lifetime.
- Real Android test composition and a controlled local two-owner Auth/Backend/Firestore fixture. Debug-only loopback exceptions and a preflight-verified `com.enmori.app.personatest` package isolate subsequent test installs from the ordinary app.

Backend/API/data-model, dependencies/lockfiles and shared Home/router are unchanged. Ordinary builds keep the isolated Persona entry disabled. No cloud, model or production runtime is enabled.

## Verification

Pinned installed tools: Flutter 3.47.2, Dart 3.13.2, Node 24.19.0, pnpm 11.19.0. Physical device: Samsung SM-A736B, Android 15/API 35. Synthetic fixture accounts only; no account tokens, device serial, certificates, APKs or raw private logs are published.

| Check | Actual result |
| --- | --- |
| Full Flutter unit/widget regression | **307/307 Pass**, final sequential run; includes six new accessibility cases and six auth-session cases |
| `dart analyze --fatal-infos lib test integration_test` | **Pass**, no issues |
| Physical Android PC13, system font scale 1.0 | **1/1 Pass**, final `ab69c03`, 33 seconds; effective 16sp = 16.0 |
| Physical Android PC13, system font scale 2.0 | **1/1 Pass**, final `ab69c03`, 34 seconds; effective 16sp = 32.0 |
| Host independent persistence checks | **Pass** on both final runs: owner empty/revision 4; peer empty/revision 0 |
| Ordinary Debug APK, test flag absent | **Build/identity Pass**: `com.enmori.app`; built only, not installed |
| Formatting, whitespace, JavaScript syntax and scope diff | **Pass**: 21 Dart files formatted with no change; no Backend/API/dependency/shared Home/router delta |
| Backend build/unit-contract suite | Earlier same-day **366/366 Pass**; unchanged Backend, not rerun at this checkpoint |
| Auth/Firestore Emulator suite | Earlier same-day **71/71 Pass**; not relabeled as a new execution |
| Final owned fixture/device-setting cleanup | **Pass**: font restored to 1.0, accessibility settings unchanged, no reverse mappings, fixture listeners or current-run temporary profiles |

PC11/PC12 automated coverage includes real-client delayed token/header/body controls, timeout -> recovery 412 -> original late 201, zero late dispatch after expiry/signout, independent read/revision boundaries, obsolete responses and explicit unresolved-command disposition. Controller fakes are not the only evidence.

PC13 drives the actual pages, Firebase Auth Emulator, HTTPS Backend and Firestore: create, route recreation and independent read, edit, selection without activation, confirmed activation, denied foreign read/activation by a second owner, return to the original owner and delete Active. The host separately checks empty collections, owner revision 4 and peer revision 0. Forced token refresh remains enabled to exercise the auth repair.

The Android accessibility checks inspect actual Flutter semantics and 48dp tap-target/label guidelines on overview, management, create, edit and confirmation states. Empty-name validation focuses the labeled field without a request. Keyboard-event traversal reaches activation/deletion triggers, defaults to Cancel, loops with Tab/Shift+Tab, cancels with Enter, restores trigger focus and emits no mutation. The large-font run records the effective Android nonlinear text scale and repeats the functional/overflow checks.

**Not Run:** human audible TalkBack reading, speech ordering/quality and a physical keyboard. TalkBack is installed but was not enabled. Injected keyboard events and Flutter semantics on hardware do not establish TalkBack service traversal or audible acceptance. These residual accessibility checks are explicitly handed to LI; the old RMVP-01A Sponsor deferral is not extended to Persona. JIN review and LI visual/accessibility acceptance remain pending.

## Reproduction and evidence handling

From the checkout, using its pinned dependencies:

```text
fvm flutter test --no-pub --reporter expanded --concurrency 1
fvm dart analyze --fatal-infos lib test integration_test
node --check tool/run_persona_android_emulators.mjs
node --check tool/persona_android_fixture.mjs
node tool/run_persona_android_emulators.mjs <attached USB serial or emulator-NNNN>
```

For the device runner, set invocation-scoped `ENMORI_TEST_TEMP_PARENT` to an existing directory outside the checkout, `ENMORI_TEST_FLUTTER_DART`, `ENMORI_TEST_FLUTTER_SNAPSHOT`, `ANDROID_HOME`, `PUB_CACHE`, `GRADLE_USER_HOME`, `JAVA_HOME`, `FIREBASE_EMULATORS_PATH` and `ENMORI_TEST_OPENSSL` to the installed tools/caches. Ports 8080/9099 must be free. The runner supplies the test-only package flag and bounded loopback forwarding itself, rejects unexpected APK identities before installation, and cleans only run-owned mappings and synthetic partitions. Do not globally enable the test flag. For enlarged text, preserve the original system font scale, run with 2.0, then restore it in `finally`; this execution restored 1.0.

Raw local logs, historical checkpoints and tested APKs remain in the separate drafts directory. The manifest and [selected execution transcript](2026-10-09-zhou-persona-review-results.txt) provide reviewable evidence without uploading fixture secrets. APK hashes identify test artifacts only; their temporary runtime has been destroyed and they are not release packages.

## Retained failures and historical device impact

Earlier session/client probes exposed definite rejection versus uncertain completion, stale-read/revision handling and late-response feedback errors; the final suite retains their regression cases. Auth refresh initially produced 4 Pass/2 Fail before the six-case passing repair. This round's focus tests initially had 4 Pass/2 Fail for cancellation focus restoration; after the correction all six passed, with the 15 other page tests also passing.

The first full-suite attempt this round hit Windows `PathExistsException` in Flutter's compiled test cache and stalled. Only the identified test process was stopped; sequential execution then passed all 307. A log rename failed while the former shell still held its handle, so the raw first log was overwritten; its error survives as an explicitly labeled excerpt captured from tool output. No source assertion was removed or global cache deleted.

The first large-font PC13 attempt passed its form checks but timed out waiting for Activate before opening its dialog. The button was below the lazy ListView's constructed region; waiting alone could not find it. The test now scrolls the actual management list within a fixed bound before focus traversal. Product behavior and all focus/mutation assertions are unchanged. The original failed device log is retained separately.

Earlier retained setup failures include blocked unapproved dependency install scripts (later frozen restore with scripts disabled), cross-volume Kotlin incremental caches, Windows environment-key casing, a loading-frame helper race and an incorrect SDK positional argument. The final runner uses process-scoped Gradle properties for in-process/nonincremental compilation and fixed bounded waits. These failures are not counted as passes.

During the first earlier run that reached device installation, Flutter found a signing mismatch and automatically uninstalled the existing ordinary `com.enmori.app`. Its old local data may have been cleared and cannot be reconstructed from this evidence. The user was informed. The later dedicated-package repair prevents subsequent harness runs from targeting that package; it does not undo the historical impact. The ordinary APK was only built, not reinstalled.

One earlier failed-build temporary folder retained Kotlin logs without configuration JSON/certificates/private keys. Automatic approval review rejected its explicit cleanup with `blocked by policy`; deletion was not retried and shared compiler processes were not terminated. This historical residue is distinct from successful-run cleanup.

## Review and acceptance path

JIN (`chuxi12483468`) reviews this new ZHOU implementation, shared-client/auth change, harness and evidence at the published exact head. LI (`3427564237`) subsequently assesses the evidenced isolated Persona scope and residual accessibility checks. DU's exact-head approval of unchanged LI Home/router remains attributed to that contribution. Owner tests and agent self-checks do not substitute for either independent approval or acceptance.

Keep the PR Draft/Open. No auto-closing Issue keyword, Issue/Project completion change, merge or deployment is part of this handoff. P04-P07, M26/M27, public AI/Conversation, live model/host/context-reader choices and whole-module/Sprint/UAT/Release completion remain outside this implementation.
