# LI current Persona P08 verification and final candidate

10 October 2026, Asia/Singapore. Executor/PM: LI HOURUI. Approved task [#68](https://github.com/3427564237/enmori-app/issues/68), full isolated A scope. This is LI's actual verification and acceptance evidence, separate from owner/JIN executions.

## Exact source and independent chain

- Current final source candidate is existing [Draft #72](https://github.com/3427564237/enmori-app/pull/72), **`0839c46b865bb6092020ad0ae77e17922ea40eb0`**, product **`af56e6ea979039102eff1a2fd52d974f484fc8a3`**. No extra source merge/cherry-pick or replacement candidate is needed: it already descends from accepted #69 `00cb606` and unchanged #70 `f646e26`.
- The entire non-document Git manifest is identical between product and publication heads: **432 files**, SHA-256 **`62dd89e85004710c19a12210288102da89eeec381a1bd482c5e470fd97bf70e4`**. Format: sorted `git ls-tree -r` lines, excluding `docs/` and case-insensitive `.md`, joined by LF with a final LF.
- Backend/API/package pins/lockfiles and all shared `lib/app` Home/router sources are unchanged from #70. Existing independent DU approval [5467840467](https://github.com/3427564237/enmori-app/pull/70#pullrequestreview-5467840467) binds unchanged `f646e26`.
- JIN initial #72 review [5470329704](https://github.com/3427564237/enmori-app/pull/72#pullrequestreview-5470329704) binds `17aa358`; its 307/307, three additional probes and API 36 Android/persistence 1/1 remain that execution. JIN focused current-head review [5470543060](https://github.com/3427564237/enmori-app/pull/72#pullrequestreview-5470543060) covers the later management semantics correction, 22/22 affected tests and analysis. No old-head test is relabeled as a JIN current-head rerun.
- LI verified all **26/26** historical manifest source Git blobs at `ab69c03`, plus both later selection/TalkBack source manifests at their declared commits. Current source/head equality and ordinary/isolated feature binding agree with the actual files. JIN's earlier source finding was nonblocking; no LI product/source/harness fix was made.

The accepted older #69/#71 gate has a separate [LI decision](../../decisions/2026-10-10-li-isolated-read-integration-acceptance.md). That older tree does not certify this later Persona UI. This current #72 head is now the concrete final candidate for JIN's remaining combined-gate supplement, then LI independent review. This record is LI execution and cannot self-satisfy that independent gate.

## LI execution at the exact current head

Existing Linux tools: FVM 4.3.0; Flutter 3.47.2/Dart 3.13.2; Node 24.19.0; Java 25.0.4.1; installed Android SDK/build-tools 36 and existing dedicated API 36 AVD. Locked Backend dependencies reused read-only through a temporary symlink, removed after verification. No dependency/script approval, lockfile, SDK installation/configuration or main/source change.

| Check | Actual LI result |
| --- | --- |
| `fvm flutter pub get --offline --enforce-lockfile` | Pass; tracked lock unchanged |
| `fvm flutter test --no-pub --reporter expanded --concurrency 1` | **308/308 Pass**, current-head full regression, 29 seconds |
| `fvm dart analyze --fatal-infos lib test integration_test` | Pass, no issues |
| Pinned-node `node_modules/typescript/bin/tsc --project backend/tsconfig.json` | Pass |
| Pinned-node `--test 'backend/dist/test/**/*.test.js'` | **366/366 Pass**, zero failed/skipped/cancelled/todo |
| Actual filtered isolated Auth/Firestore suite through the unchanged committed inner runner | **71/71 Pass**, zero failed/skipped/cancelled/todo; services/profile stopped/removed |
| Unchanged `tool/run_persona_android_emulators.mjs emulator-5554` on current source | **1/1 Pass**, font scale **1.0**, Android scenario 31 seconds; second invocation exit **0** including cleanup |
| Independent host saved-state rereads | Pass: owner collection empty/revision **4**, peer empty/revision **0** |
| Reviewer-only rendering probe against actual exported pages | **1/1 Pass**, six synthetic software-rendered views; not extra product/device cases |
| Current diff/ancestry/source hashes and whitespace | Pass |
| Teardown | Ports 8080/9099 free, current-run profiles removed, only LI-started headless AVD stopped; no device remains attached |

Backend Emulator execution uses the existing guard/runner, a fresh filtered temporary profile, only `demo-enmori-rmvp01a-r10`, loopback Auth 9099/Firestore 8080 and synthetic fixtures. The Android runner supplies the same real guard, scoped fixture Accounts, HTTPS trust and real Backend repositories. CI/tool paths are invocation-scoped; no ambient credentials, cloud fallback, real accounts, external provider or model call.

The Android scenario traverses create → independent read/route recreation → edit → select without activation → confirmed activation → owner switch/foreign denial → return → delete Active/no Active, with separate direct host persistence checks. Actual labels/Android tap targets, empty-name focus, injected Tab/Shift+Tab/Enter cancellation and restored invoker focus pass. This is API 36 emulator evidence, not LI physical-device, audible TalkBack or physical-keyboard execution. The unchanged owner physical Android/API 35 normal/2.0 cases retain their original attribution.

Latest LI dedicated fixture APK: **167,272,324 bytes**, SHA-256 **`41435715ba4f27ebcb60cb1abb8e12dfbe34eb7168ac09a384bfb250f67c7be9`**. Compiled ID/launch manifest **`com.enmori.app.personatest`** was checked before installation. It is not the ordinary app, owner/JIN prior APK or a release artifact; ephemeral fixture configuration means it is not uploaded. No ordinary app was installed, removed or read during LI's run.

## Visual and human accessibility evidence

LI inspected the actual pages/copy and these clean reviewer-generated software renders. They use the app's seed/theme/outlined fields, SDK Roboto and Material icons, 375×812, with synthetic `Study Guide` data. The dark/2.0 case is additional fixture inspection, not global theme/platform acceptance. No Figma comparator is approved/claimed.

- [Inactive management](li-persona-visual-20261010/management-inactive.png) and [selected while still Inactive](li-persona-visual-20261010/management-selected-inactive.png): filled/bordered/checkmarked intent, independent status and explicit Activate.
- [Four-field Create/defaults](li-persona-visual-20261010/create-form.png), [activation confirmation](li-persona-visual-20261010/activation-confirmation.png), [dirty-exit confirmation](li-persona-visual-20261010/discard-confirmation.png).
- [Dark enlarged-text fixture](li-persona-visual-20261010/create-dark-large-text.png): labels/options/action remain readable; the long name helper visually ellipsizes while preserving the 1–50 limit and full semantics. No universal largest-text or dark-theme conformance conclusion is made.

The owner-provided TalkBack items **1,2,3,5,6,7** Pass are attributed human results on `82d8e89`, APK `7219b6...`. The subsequent [item-4 audible retest Pass](https://github.com/3427564237/enmori-app/pull/72#issuecomment-6081846892) binds corrected `af56e6e`, review head `0839c46`, APK `e2e74ad02669b2db549ef10b515a261fb289bad37b47b8fe36fd18cd270c95b6`. It explicitly supersedes the earlier immutable Pending observations for item 4 only. All seven have Pass evidence across two checkpoints; neither an all-seven latest-APK rerun nor independently heard LI/JIN audio is claimed. Physical keyboard remains Not Run. These limits do not create a new standalone requirement.

## Failed attempts and provenance

LI Android attempt 1 built successfully but the original dedicated-package preflight assertion rejected before installation, exit 1; no device product scenario ran. Later independent aapt inspection showed the correct dedicated package, and eight read-only aapt exit/close event probes all returned complete matching output. A particular transient/cache/event cause is **not proved**. A read-only Gradle init diagnostic failed during plugin resolution and is not a successful product check. LI changed no assertion, guard, runtime source or fixture. Attempt 2 used the unchanged source, runner and scoped environment; package preflight, actual PC13, persistence and full teardown passed with exit 0. The earlier failure is preserved; it is not counted as a passing invocation.

A reviewer-only visual helper initially stalled because asynchronous font/image work was not placed in `tester.runAsync`; only that owned probe process was stopped. Early helper renders also lacked test-loaded Material icons/the app input theme and excluded overlay dialogs. The corrected ignored helper loads the SDK fonts/theme and captures the complete Material overlay; the final one-case probe and inspected PNGs pass. These are reviewer-helper defects, not product fixes or passed Android cases.

Local diagnostics, failed/final command logs, source/visual manifests and ignored rendering/probe sources are retained under `/tmp/enmori-li-final-review-20261010/` and the review worktree's ignored `build/li-review/`. No credential/configuration file, fixture APK, raw device-private log or human screenshot is uploaded. Existing owner history, including its earlier ordinary-app uninstall/data-loss risk, remains in the original immutable packet and is not erased by LI's later dedicated-AVD run.

## Readiness boundary

LI's [bounded Persona component acceptance](../../decisions/2026-10-10-li-persona-p08-component-acceptance.md) covers the selected isolated M23–M25 / NS31–NS34 and PC11–PC13/client PC14 scope. The new final-tree JIN gate supplement and LI independent review remain separate. Ordinary builds stay disabled; global Q04/style/accessibility, physical keyboard/iOS, AI/Conversation P04–P07/M26–M27, model/context, real Event rights, history/Footprint/Calendar UI, index/runtime/real-data enablement and overall 42-route/38-state/Sprint/UAT/Release/Done remain outside. No merge, existing Issue closure/manual Project promotion or overall 11 October promise.
