# JIN final isolated candidate — combined-gate supplement

Recorded 10 October 2026, Asia/Singapore. Executor: JIN ZIHAN (`chuxi12483468`). Independent reviewer of this supplement: LI HOURUI (`3427564237`). Assignment: LI's final-candidate handoff under #44/#68. This record adds actual final-tree execution; it does not repeat unchanged contract/component approvals.

**Disposition: final-candidate execution Pass within the bounded isolated scope; first My Friends cleanup failure retained, second unchanged full invocation Pass. LI's independent review of this new supplement remains Pending.** Product source, existing PR heads/bases, Issue/Project states and runtime enablement are unchanged by this documentation delivery.

## Exact source and retained authority

| Role | Immutable source |
| --- | --- |
| Actual final candidate, existing #72 | `0839c46b865bb6092020ad0ae77e17922ea40eb0` |
| Same executable product before evidence-only publication | `af56e6ea979039102eff1a2fd52d974f484fc8a3` |
| Included #69 read/Backend integration | `00cb606961bfeb1cbe09bcd6afdc040c08b57ce1` |
| Included #70 LI Home/router | `f646e26d30547ca9abe8084daedeebe803b1d3f4` |
| Observed unchanged remote main | `f46a903cb5b339365ac2024004b32b7b96b99e7c` |

#69 and #70 are verified ancestors of this actual candidate. The existing three Backend input commits (#61 `5bdbcf8`, #64 `2d2a81d`, #65 `885dbcc`) are also ancestors. No replacement product tree or new implementation branch was constructed.

Retain [LI's isolated read/Backend acceptance](https://github.com/3427564237/enmori-app/blob/541981808681fcc8ef6c8ca8463ddb3375cbba29/docs/decisions/2026-10-10-li-isolated-read-integration-acceptance.md), [LI's full isolated P08 component acceptance](https://github.com/3427564237/enmori-app/blob/541981808681fcc8ef6c8ca8463ddb3375cbba29/docs/decisions/2026-10-10-li-persona-p08-component-acceptance.md), [LI #71 review 5474886317](https://github.com/3427564237/enmori-app/pull/71#pullrequestreview-5474886317), [LI #72 review 5474994250](https://github.com/3427564237/enmori-app/pull/72#pullrequestreview-5474994250), JIN #72 exact-head source reviews and DU's unchanged #70 review. The earlier wait for LI's #71 review and P08 component acceptance is resolved. Those decisions explicitly leave this final combined-gate supplement and LI's independent review of it separate.

## Independent checks actually executed

All new executions below use `0839c46`. LI's own current checks and JIN's older #69/#71/component checks are not substituted for these runs or added into their totals.

| Check | New JIN result |
| --- | --- |
| Strict Backend build and complete regression | **366/366 Pass**, no failed/skipped/cancelled/todo cases, exit 0 |
| Actual isolated Auth/Firestore Emulator suite | **71/71 Pass**, no failed/skipped/cancelled/todo cases, exit 0 including launcher cleanup |
| Full Flutter unit/widget regression, sequential | **308/308 Pass**, exit 0 |
| Fatal-info analysis, `lib test integration_test` | **Pass**, no issues |
| Actual API 36 Persona PC13 and independent host persistence | **1/1 Pass**, independent two-owner persisted Active-delete/revision-4 readback Pass; outer exit 0 |
| Actual API 36 My Friends/Profile regression and independent host persistence | **1/1 Pass**, independent two-owner atomic pair/pointer readback Pass; second unchanged outer invocation exits 0 |
| Source union and inventory | **Pass**: 26 operations / 26 unique inventory entries and matching success statuses / 33 schemas / 26 error codes; security schemes preserved |
| Executable payload identity | **Pass**: 432 tracked non-document files, equal between candidate and `af56e6e`; SHA-256 `62dd89e85004710c19a12210288102da89eeec381a1bd482c5e470fd97bf70e4` |
| Backend/API/configuration/dependency boundary against #69 | Empty diff for `backend`, `api`, package/lock, Firebase and index configuration |
| Frozen Flutter resolution in reused ASCII device checkout | `pub get --offline --enforce-lockfile`: Pass; no lockfile change |
| Whitespace/source preservation | Exact candidate diff check Pass; no product, test or runner edits |
| Final teardown | **Pass**: Auth/Firestore stopped, ports 9099/8080 clear, all three Android profiles absent, no reverse mappings, owned Gradle daemons and dedicated AVD stopped |
| LI independent review of this supplement | **Pending** |

The manifest is Git `ls-tree -r` output excluding `docs/` and Markdown, joined with LF and a final LF, as in the prior gate. The normative probe compares the entire operation/schema/error union of the three approved Backend inputs, not a copied whole API file. Its only adaptations from the [published prior helper](https://github.com/3427564237/enmori-app/blob/3bcd1c4bf9664ccd737018358bfb88719c7b55b4/docs/evidence/sprint3/2026-10-09-jin-isolated-read-combined-gate.md#reproducible-reviewer-only-helpers) are the target head above and the equivalent executable comparison source `af56e6e`.

## Coexistence, identity, persistence and privacy

The 71-case suite includes the real three-feature `combined-read-slices.integration.test.ts` case on this final tree. A single guarded Backend app serves Friend, history and Persona. Two fresh synthetic Auth identities and explicit UID-to-Account bindings/completed Account fixtures prove owner-filtered reads, Persona create followed by independent API and direct host saved-state reads, foreign-owner denial, safe malformed-Persona rejection followed by unaffected Friend/history reads, and ordinary-composition omission. Every issued request settles before scoped app/identity/document teardown.

Actual final-tree instrumentation, included within the suite rather than extra test counts:

- Persona: **208 transaction calls / 215 SDK attempts / seven retried calls / maximum nine logical gets / zero collection scans**. The applicable eight/nine-get path assertions pass. SDK attempts are counted separately; this is not a billing or global request bound. The older gate's eight retries are not reused here.
- My Friends: injected ABORTED retry produced **two attempts, 106 logical reads each**. Retained account eligibility, current bindings, bidirectional block/privacy, recipient authority, terminal/race and atomic pointer cases pass.
- Complete isolated synthetic history audit: **5/5 canonical fixed-millisecond UTC strings**, zero other formats/non-strings, three pages of size two. This is the approved synthetic fixture, not an audit of real/demo data or evidence of deployed indexes.
- Applicable Auth/Profile/Settings/Check-in/Interest/Event/Friend and Persona integrity/replay/capacity/concurrency/deletion/overflow/isolation regressions pass. No provider/model/cloud call or permission is inferred.

Persona PC13 ran on the verified dedicated API 36 AVD at font scale 1.0. The dedicated `com.enmori.app.personatest` package preflight passed before device execution. The actual Auth Emulator → HTTPS Backend → Firestore flow exercised create, saved reread, edit, explicit activation, second-owner isolation, Active deletion and no-Active state. Android semantics/tap targets and injected Tab/Shift+Tab/Enter/cancel/restored-focus checks passed; these do not assert audible TalkBack or physical-keyboard execution. The independent host check reported `PERSONA_PC13_ANDROID_TWO_OWNERS_PERSISTED_ACTIVE_DELETE_REVISION_4: Pass`. The test, host readback and full launcher all exited 0; fixture services stopped and its temporary profile was absent afterward.

My Friends used the same candidate and dedicated AVD, with a separate fresh fixture. It exercised the actual two-account request/accept chain, Profile/My Friends entry, 20/20/2 pagination, privacy/unset-name filtering, reload, owner switch and error recovery. The direct host check reported `MY_FRIENDS_ANDROID_TWO_ACCOUNTS_ATOMIC_POINTER_READBACK: Pass` after confirming the accepted pair and both account list pointers. The second unchanged invocation passed the 1/1 scenario, host check and full launcher cleanup with exit 0. APK metadata independently confirms `com.enmori.app.personatest` for Persona and `com.enmori.app` for My Friends, version 1.0.0/code 1, compiled SDK 36. No personal-device ordinary app was operated.

The two Android fixtures are separate real flows on the same exact source, not one fabricated all-feature Android scenario. The Emulator shared-app case supplies three-feature Backend coexistence; Persona PC13 supplies concrete accepted Home/router/page/session/Repository assembly and persisted lifecycle; My Friends supplies its existing request/accept/list/profile/owner-switch regression under the final shared client/Auth. History/Footprint/Calendar pages, new real Event device flows and public AI/Conversation are not supplied by these fixtures.

## Environment and reproducibility

Windows/PowerShell; existing review checkout and existing ASCII device checkout reused at the exact candidate. Node **24.19.0**, pnpm **11.19.0**, Flutter **3.47.2** / Dart **3.13.2**, Java **21.0.12.1**, existing SDK/build-tools **36** and dedicated `enmori-validation-api36` AVD, font scale **1.0**. Installed pinned Dart/Flutter launchers are used directly because of the previously recorded local FVM-launcher issue. Existing locked dependency caches were reused; no dependency version, architecture or global configuration change.

```text
node <pinned-pnpm.cjs> backend:verify
flutter test --no-pub --reporter expanded --concurrency 1
dart analyze --fatal-infos lib test integration_test
node build/jin-final-source-union.mjs
node build/jin-final-emulators.mjs
# Existing ASCII checkout, same exact head; after the preceding services stop:
node node_modules/typescript/bin/tsc --project backend/tsconfig.json
flutter pub get --offline --enforce-lockfile
node tool/run_persona_android_emulators.mjs emulator-5554
node tool/run_my_friends_emulators.mjs --android emulator-5554
git diff --check f46a903cb5b339365ac2024004b32b7b96b99e7c 0839c46b865bb6092020ad0ae77e17922ea40eb0
```

The Emulator wrapper is byte-identical to the prior published guarded helper (SHA-256 `cfb9f93d61b342d79190bb3694fd146b826728108c6ea07e4a2202ddda558bc6`). Its historical temporary-directory prefix is only a name: a fresh unique profile is created for this execution. It checks local ports and calls the candidate's `buildControlledEmulatorTestEnvironment`, then Firebase CLI 15.29.0 `emulators:exec` and the committed child runner. Only synthetic project `demo-enmori-rmvp01a-r10`, Auth `127.0.0.1:9099` and Firestore `127.0.0.1:8080` are admitted. Actual adapter/composition processes receive that validated environment, not an ambient cloud credential profile. All suites run sequentially where they share Emulator ports.

Android uses invocation-scoped `ENMORI_TEST_FLUTTER_DART`, `ENMORI_TEST_FLUTTER_SNAPSHOT`, `ENMORI_TEST_OPENSSL`, `ANDROID_HOME`, `JAVA_HOME`, `PUB_CACHE`, `GRADLE_USER_HOME`, `FIREBASE_EMULATORS_PATH`; Persona also uses an existing outside-checkout `ENMORI_TEST_TEMP_PARENT`. Existing harnesses create temporary HTTPS certificates/configuration and synthetic identities. The 10.0.2.2 bridge trusts only the generated test certificate; no TLS or isolation guard is bypassed. Only the verified dedicated AVD is targeted; no personal device is operated.

Retained earlier failures are linked, not erased or counted as current-head executions: [#71's first Android cleanup failure and second full success](https://github.com/3427564237/enmori-app/blob/3bcd1c4bf9664ccd737018358bfb88719c7b55b4/docs/evidence/sprint3/2026-10-09-jin-isolated-read-combined-gate.md), [JIN's earlier #72 review](https://github.com/3427564237/enmori-app/pull/72#pullrequestreview-5470329704) recording non-ASCII build-path failure and a Gradle daemon referencing a removed prior temporary directory, [the subsequent source correction review](https://github.com/3427564237/enmori-app/pull/72#pullrequestreview-5470543060), and LI's linked acceptance retaining its first pre-install guard failure. Owner evidence retains the earlier ordinary-app uninstall/data-loss risk and dedicated-package correction. None of those earlier successful runs certifies this final candidate by substitution.

For this gate, the existing ASCII checkout avoids the known path failure. After the Persona launcher completed, JIN stopped only the verified run-owned Gradle daemon before starting the next fresh fixture, preventing reuse of its removed temporary directory. The My Friends harness retains its existing `com.enmori.app` identity only on the dedicated synthetic AVD; it was not run on a personal device. Product/tests/runners and global settings were not changed for this environment handling.

This gate's first My Friends Android invocation passed its 1/1 scenario and independent atomic pair/pointer readback; Firebase child exit was 0 and services stopped. The outer launcher nevertheless exited **1** with Windows `EPERM` removing its unique temporary profile. This is a retained failed full invocation. Inspection found **zero files and two empty Kotlin directories**. After stopping the verified run-owned Gradle daemon, JIN removed only those verified empty directories and their exact fixture parent using non-recursive native operations. No claim is made that the daemon was the proven lock holder. The next invocation uses unchanged source/harness and a fresh profile; its final result is recorded above. Repetition of the same scenario is counted as one distinct Android case.

## Local evidence fingerprints

Raw logs, APKs, fixture configuration, credentials and private keys stay local and are not uploaded. These hashes identify completed runs, not publicly downloadable artifacts.

| Local artifact | SHA-256 |
| --- | --- |
| `backend.log` | `f4ccf81cd202df785a7c79cb7e457978c1d6fd2485ee01800d5700cf1abad9fe` |
| `emulators.log` | `f08d3a7335143c423e7ad98b66d4281acde779e6e48c3984ebc30249950cd551` |
| `flutter.log` | `ccf39030cc1f0f1f9cd6b64e32c90bc81614e1bf91ee00354aa75955ce934cee` |
| `analyze.log` | `9a9d35ce9d6fac973a72f078461e18cde1f1c7f2ae7fa7a5916ae87adef4b99a` |
| Read-only source probe | `6fbfccece03085c0ccb8b414a837ac27e8023b86a93f66e82af26feb29be328b` |
| Persona Android log | `a591bdc10fb118b45f19b8995385ebbdc836abe3b617b53641580a8ff46e4b1f` |
| Persona dedicated APK, 167,373,452 bytes | `c4c8d07872b28d2d047f2a84215c9a6336fd71c379674f9d54407e69976bd6e0` |
| My Friends attempt 1 log, retained outer cleanup failure | `3334dd007031d7912d5a45396b889a357ac554703b1e45a5c1d18c13f2639737` |
| My Friends attempt 1 APK, 80,050,984 bytes | `73e46aae59abe517bee6fa784a7c4d1c9149fdcc795204757e184c48e7c9fddf` |
| My Friends attempt 2 log, full success | `ae05ef2c16262b946f31d6bc0139b90315584e76c20d07183f8b27ab920b9176` |
| My Friends attempt 2 APK, 80,050,972 bytes | `bc62c533c522ceb4da7fb63cf49202f155db3e83d5fa07a123c8e9c90c45e476` |

## Acceptance handoff and original targets

Execution and final teardown completed **10 October 2026, 16:05 SGT**; the evidence package is ready for publication in this session, within the stated 16:10 SGT delivery estimate. Request LI's independent review of this new supplement under the existing JIN → LI path. The old #71 review is complete and does not self-review this later artifact. No extra unchanged component approval is requested; this document does not make a new PM acceptance or merge decision.

LI's accepted TalkBack evidence is retained across two attributed checkpoints: items 1/2/3/5/6/7 on `82d8e89`, and [item 4's later human audible retest](https://github.com/3427564237/enmori-app/pull/72#issuecomment-6081846892) on corrected `af56e6e`. Earlier Pending records remain history. No latest-APK all-seven run or independently heard JIN/LI audio is invented. Physical-keyboard, iOS and global accessibility remain unverified limits, not newly invented standalone acceptance gates.

Original **42-route / 38-state**, five-owner/reviewer responsibilities and **11 October** remain. This supplement delivers only the assigned final isolated combination; it provides no reliable whole-Sprint completion percentage. Remaining Friend search/public Profile/Recommendation/Activity/real-account consumers, history/Footprint/Calendar consumers, real Event rights/access/use/mapping, P04–P07 and M26/M27 AI/Conversation retain their specific authority and evidence needs. LI must explicitly settle any target that cannot be delivered; JIN does not cancel, defer or promise those mappings for other owners.

Existing implementation PRs stay Draft/Open, main stays unchanged, and no Issue closure/manual Project promotion, runtime/index/real-data/model/provider enablement or whole-module/Sprint/UAT/Release/Done claim is made.
