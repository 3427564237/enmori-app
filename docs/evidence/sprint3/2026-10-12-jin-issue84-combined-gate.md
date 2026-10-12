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

## Actual first checkpoint

| Check on the exact combined source | Actual result |
| --- | --- |
| Strict Backend build and full regression | Pass: 543/543; exit 0; zero failed/cancelled/skipped/todo |
| Full Flutter unit/widget regression | Pass: 313/313; exit 0 |
| Fatal-info analysis of lib/test/integration_test | Pass: no issues; exit 0 |
| Full guarded Auth/Firestore Emulator | Running at initial publication; no completed Pass claimed yet |
| Actual isolated Android Search + host persistence | Not Run at initial publication |
| Separate Android My Friends/Profile + host persistence | Not Run at initial publication |
| Separate Android Persona PC13 + host persistence | Not Run at initial publication |
| SHI new-composition review | Requested with this Draft PR; Pending |
| LI independent review of this gate / bounded acceptance | Pending; requested after the execution packet is complete |

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
runs use the existing dedicated API 36 AVD and separate fresh fixture profiles;
they are serialized after the full Emulator suite and require actual outer exit
and cleanup evidence before being marked Pass.

## Retained exceptions and pending contributions

Full #72-to-source whitespace check remains Fail / exit 2 for the inherited
copied decision's EOF blank line at line 56, accepted as a nonblocking #79
documentation exception. Code/API/test/tool diff whitespace is Pass / exit 0.
An initial local source checker assumed every operation had `operationId` and
failed with KeyError. The unchanged normative contract does not supply that
field everywhere; the corrected checker verifies unique method/path pairs.
No API or product change was made to satisfy the checker.

At this first checkpoint no new #82 History client, #83 AI client or #85 LI
builder integration is included. Their coherent submitted code must retain its
assigned independent review and LI acceptance before candidate refresh. JIN
reviews new ZHOU code separately; SHI reviews JIN composition and LI reviews
JIN-authored gate evidence. A later changed executable receives new applicable
checks; this record must not relabel earlier runs as evidence of that source.

First concentrated runnable source/evidence target remains 20:30 SGT today;
22:00 reviewed contributions and 23:59 required acceptance are targets, not
promises on reviewers' behalf. Failures/blocked checks will be reported without
silently moving those targets. The original 11 October Sprint result is not
rewritten. No whole 42-route/38-state completion, real AI persistence/producer/
model/provider, ordinary enablement, deployment, merge, Issue closure or Project
transition is claimed. Raw logs, APKs and temporary credentials remain local.
