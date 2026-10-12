# JIN Issue #84 — accepted Search and internal AI combined candidate

12 October 2026, Asia/Singapore. Owner JIN; composition reviewer SHI; independent
reviewer of JIN gate evidence and bounded acceptance LI. This is the first
coherent candidate under the [formal reissue at f8c6772](https://github.com/3427564237/enmori-app/blob/f8c67722581f85846ca06d850cb1dfe92586ed46/docs/decisions/2026-10-12-li-parallel-delivery-reissue.md)
and [Issue #84](https://github.com/3427564237/enmori-app/issues/84).

## Exact composition

- Executable/source merge: `89b6bc7d68d0a9b43db943f7076231a188d208b9`.
- Tree: `b0468c618259bfc8b69becbed90228eff1cdf744`.
- First parent: accepted #80 `4199eca0371a78f5d053dde359c30bd0f011f09e`.
- Second parent: accepted #79 `d242cc9b8fa5626a877d0397c6f1a41278b5c81a`.
- Retained baseline ancestor / PR base: accepted #72
  `0839c46b865bb6092020ad0ae77e17922ea40eb0`.

This is an actual two-parent source merge, not a merge-tree simulation. Every
path was compared with both accepted inputs and their common product baseline:
the combined tree is the exact union, with zero manual conflict resolutions or
new product edits. The tree matches LI's earlier preflight, but only executions
below count as this candidate's evidence. Subsequent changes to this evidence
document do not change the executable source.

The complete OpenAPI matches accepted #80: 27 unique method/path operations and
33 schemas. AI lifecycle adds no public operation. Shared Home/router/Auth,
dependencies, configuration and the existing ordinary/controlled-runtime
exclusion boundaries retain their accepted input content. Search remains in
the default-disabled synthetic composition; Conversation Application remains
internal-only and absent from Bootstrap. Existing Event/privacy and history/
Persona route unions are preserved, not overwritten.

## Actual completed execution checkpoint — 17:47 SGT

| Check on the exact combined source | Actual result |
| --- | --- |
| Strict Backend build and full regression | Pass: 543/543; exit 0; zero failed/cancelled/skipped/todo |
| Full Flutter unit/widget regression | Pass: 313/313; exit 0 |
| Fatal-info analysis of lib/test/integration_test | Pass: no issues; exit 0 |
| Full guarded Auth/Firestore Emulator | Pass: 73/73; exit 0; zero failed/cancelled/skipped/todo |
| Actual isolated Android Search + host persistence | Pass: 1/1; 341 seeded documents unchanged; outer exit 0 |
| Separate Android My Friends/Profile + host persistence | Pass: 1/1; atomic friendship/pair and both member pointers reread; outer exit 0 |
| Separate Android Persona PC13 + host persistence | Pass: 1/1; owner revision 4 / peer revision 0 and empty Persona collections reread; outer exit 0 |
| SHI new-composition review | Requested with this Draft PR; Pending |
| LI independent review of this gate / bounded acceptance | Requested with this completed packet; Pending |

First Draft #86 was published at **17:40:08 SGT**, head `00debeb8c35221ebe5df6a7170d9d8b4bf1ddb45`, with Backend/Flutter/analysis already passing, Emulator running and Android Not Run. That earlier checkpoint remains in Git history; the completed runs above supersede only those pending execution observations. These are distinct current-source cases, not additions to historical component totals. Eight changed Dart files also passed non-writing format checking (zero changes).

Pinned Node 24.19.0, pnpm 11.19.0, TypeScript 7.0.2, Flutter 3.47.2 / Dart
3.13.2. Backend uses the verified existing dependency cache, with invocation-only
`pnpm_config_verify_deps_before_run=false` to suppress automatic installation;
no dependency install, version change or relaxed compiler setting. Commands:

```text
pnpm backend:verify
flutter test --no-pub
dart analyze --fatal-infos lib test integration_test
node build/jin-final-emulators.mjs
node tool/run_my_friends_emulators.mjs --android-search emulator-5554
node tool/run_my_friends_emulators.mjs --android emulator-5554
node tool/run_persona_android_emulators.mjs emulator-5554
```

The full Emulator launcher is the local guarded wrapper documented in
[#73's reproduction](https://github.com/3427564237/enmori-app/blob/c3e1f84bd305093ffe7f4d6d83b6df3d0289baa5/docs/evidence/sprint3/2026-10-10-jin-final-isolated-candidate-gate.md#environment-and-reproducibility).
It allocates a fresh filtered profile, checks free loopback ports and invokes
the committed full-suite child runner with `emulators:exec`, fixed demo project
`demo-enmori-rmvp01a-r10`, Auth `127.0.0.1:9099` and Firestore `127.0.0.1:8080`.
The child validates its own fresh filtered profile. No cloud fallback. Android
runs used the existing dedicated API 36 AVD and separate fresh fixture profiles, serialized after the full Emulator suite. Actual full-suite and all three device invocations exited 0, including teardown.

## Device, persistence, isolation and cleanup

The Windows device checkout was detached at the exact executable merge
`89b6bc7`, tree `b0468c6`, with no tracked changes. Java was Temurin 21.0.12.1;
AVD identity `enmori-validation-api36`, serial `emulator-5554`, Android API 36.
Search and My Friends used `com.enmori.app` on that dedicated test AVD; Persona
passed its pre-install dedicated-package guard and used
`com.enmori.app.personatest`. All APKs were inspected with pinned SDK aapt:
version 1.0.0/code 1, min API 24, target/compile API 36.

Each device fixture used actual Auth Emulator sign-in, approved HTTPS Backend
and isolated Firestore. Search independently compared all 341 persisted seed
records after Search/Next/Clear/Reload; no mutation occurred. The separate
My Friends/Profile fixture confirmed friendship, cleared pending state and both
list pointers. Persona performed create/reread/edit/explicit activate/delete and
second-owner isolation; independent host reads found owner revision 4, peer
revision 0 and no live Personas. These are three separate fixtures on one source,
not a fabricated all-feature Android flow. The full shared Emulator suite also
passed the combined isolated reads/Persona coexistence case. Internal AI remains
fake-Port Backend evidence; none of these device runs invokes AI or proves real
Conversation persistence. History UI and new #82/#83/#85 builders are not claimed.

The actual Search/Persona semantic, focus, tap-target and injected-keyboard
assertions in their committed flows passed. Font scale remained 1.0 before and
after (Persona reported effective 16sp = 16.0). No new font-2.0, human TalkBack,
audible traversal, physical-keyboard or global accessibility pass is claimed.

At **17:47:02 SGT**, all fixture invocations had settled and exited 0. Fixtures
closed their HTTPS/Backend/Firebase resources; the outer launchers stopped
Auth/Firestore and removed temporary profiles. A read-only check found zero
recent matching fixture profiles and zero listeners on 8080/9099/9150. The AVD
identity/font were rechecked before its explicit shutdown; subsequent adb
readback contained no devices. No unrelated process/profile was deleted, and
no build-daemon lock-ownership claim is made. Credentials/certificates were
fixture-local and are not published.

Search and My Friends Emulator retry cases each observed two SDK transaction
attempts of 106 logical gets each. Attempts are not additional distinct tests.
Ordinary/controlled-demo exclusion, Persona six-route exclusion, authorization,
privacy and safe-error regressions passed in the full Backend/Emulator suites.

## Local evidence identity

The following SHA-256 values identify JIN-retained actual-run artifacts under
ignored `build/jin-issue84/`. Raw logs/APKs/private fixture material are not
uploaded; reviewers must distinguish these owner fingerprints from their own
reruns or independently obtained downloads.

| Local artifact | SHA-256 |
| --- | --- |
| `backend.log` | `25da21ded3134bd01532e35a71e5f0395c6421dd527748cef91a313ead26ec55` |
| `emulators.log` | `8281b48a142b35fbd2df6867ff09993fdc8c4c2005231cd4fd8c09fd68176f35` |
| `flutter.log` | `f8bf9377509a1e2b2e267962261fa445b144f4c98b2c086826348316760b40f7` |
| `analyze.log` | `9a9d35ce9d6fac973a72f078461e18cde1f1c7f2ae7fa7a5916ae87adef4b99a` |
| `format.log` | `4dd070c6fc9308fc2bb2eba0f4e4f0d534dc75b308639c36ab79cf3404ec5ac4` |
| `android-search.log` | `fb0a4a760d7e1bf07426948c8328634ddca0a002cb430d795913aff388ec3e7c` |
| `android-friends.log` | `ec88cd29f368aecf11abcb19f70774894dbfd33880540067d8a77a5bba9f2d80` |
| `android-persona.log` | `1191719e4be7d1604fe856a37e426d340ba800ac95c1db31502cdbce618f7275` |
| `source-checks.json` | `b42bae2db25418c2146d2853d51e84482ef9e0a25f5816383258ec805b7dcb9c` |
| `cleanup.json` | `d815eb2c38c6825d8073ed27404020469f0d605647209d6dfc9814e9ee9975b5` |
| `search-apk-identity.txt` | `d03728e642d0600d2c77995b9c440ef01bf7a3e04857a58693e63694e63b0929` |
| `friends-apk-identity.txt` | `d03728e642d0600d2c77995b9c440ef01bf7a3e04857a58693e63694e63b0929` |
| `persona-apk-identity.txt` | `43f89ca668937e82ed4576a1fcbe099296f3feba0cff6ff9c1a0ecb646ce3f0a` |
| `search-89b6bc7.apk` | `89f7e6094dfbac7b25e14c121bcc43a24dbdfcbee7a01d994bfbf1403c23dd52` |
| `friends-89b6bc7.apk` | `29ec3d512db1cb51efc6e2578e75ddee037aa3e09841a988602a8ed1f9d2b07d` |
| `persona-89b6bc7.apk` | `09a70556d416b6529808dea6bea4b88bc27f3b263be5ea088788c85a7b725004` |
| `run-android.ps1` | `da92c7ff53a69efb38f5326a7646489a902cc2cd8d58c09af6275fd0aee88443` |

## Retained exceptions and pending contributions

Full #72-to-source whitespace check remains Fail / exit 2 for the inherited
copied decision's EOF blank line at line 56, accepted as a nonblocking #79
documentation exception. Code/API/test/tool diff whitespace is Pass / exit 0.
An initial local source checker assumed every operation had `operationId` and
failed with KeyError. The unchanged normative contract does not supply that
field everywhere; the corrected checker verifies unique method/path pairs.
No API or product change was made to satisfy the checker. Preliminary read-only inventory path lookups also missed their guessed file paths; no pass is derived from those lookups. The complete accepted-input Git union and unchanged accepted OpenAPI are independently verified above. Existing Kotlin plugin/SDK metadata warnings were emitted; no plugin/dependency upgrade was made. No new product/device test failure occurred in this candidate run; previous component failures remain attributed to their historical records.

At the completed 17:47 checkpoint no new #82 History client, #83 AI client or #85 LI
builder integration is included. Their coherent submitted code must retain its
assigned independent review and LI acceptance before candidate refresh. JIN
reviews new ZHOU code separately; SHI reviews JIN composition and LI reviews
JIN-authored gate evidence. A later changed executable receives new applicable
checks; this record must not relabel earlier runs as evidence of that source.

The first concentrated source was published at 17:40:08 SGT and its required execution packet completed at 17:47 SGT, before the 20:30 SGT first-package target;
22:00 reviewed contributions and 23:59 required acceptance are targets, not
promises on reviewers' behalf. Failures/blocked checks will be reported without
silently moving those targets. The original 11 October Sprint result is not
rewritten. No whole 42-route/38-state completion, real AI persistence/producer/
model/provider, ordinary enablement, deployment, merge, Issue closure or Project
transition is claimed. Raw logs, APKs and temporary credentials remain local.
