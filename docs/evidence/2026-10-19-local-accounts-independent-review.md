# Independent local review — dual-account/core composition

Reviewer: local AI agent, separate from account implementation. Authority: [19 October takeover](../decisions/2026-10-19-li-sponsor-demo-local-takeover.md), repository `AGENTS.md`, Backend/Dart contracts and [skill routing](../tooling/skill-routing.md). Applied repository `enmori-backend-development` and `flutter-dart-code-review` within approved scope.

Reviewed new account code at `6e6488aa582d52d5e17f87b0da7aa875ddfc45b5` and final composition seam `194b7c6267358845dadc2580fc7c69b560e1a1a2`, pinned in a separate detached checkout. Event and AI dependencies had their separate independent review; unchanged component implementations were not re-reviewed. Subsequent `3316f4fbf516cfff3638d9ebbe7f42c1623b9cd3` is documentation only.

**Result: no remaining blocking finding in this bounded delta.** This is a source/component acceptance recommendation, not model/provider/phone/APK/UAT/Release or whole-product acceptance.

Checked exact versioned handoff parsing, v1 compatibility, primary app registration versus precreated secondary, Firebase-verified UID and fresh exact email restriction, sticky unique UID binding and replacement denial, existing Onboarding/Interests/Profile/Friend/History wiring, account/session route replacement, independent debug Sponsor package, private credential transport, and exact owner-scoped cleanup preserving unrelated records. Checked shared real Event source/detail/recommendation capabilities, identical open strategy in compiler probe/candidate/composition, two-pair history and secondary conversation isolation.

A runbook prerequisite was surfaced and sent to parent: the primary must save a nonempty public Profile display name before the Friend journey. This uses the existing Friend contract and is explicitly performed by the real adapter test; no default profile behavior was invented.

Independent verification on pinned Node24.19.0 / Flutter3.47.2 / Dart3.13.2 with existing dependencies:

- Strict TypeScript build: pass.
- Operator `tool/controlled_phone_service.test.mjs`: **21/21 pass**.
- Private handoff `tool/test_li_controlled_phone_handoff.py`: **21/21 pass**. Initial invocation from repository root had only a module-import/cwd failure; rerunning from `tool/` under its existing import convention passed.
- `test/app/controlled_demo_app_test.dart` plus `test/harness/controlled_phone_service_configuration_test.dart`: **35/35 pass**. This is the reviewer's focused subset, not the author's broader62-case packet.
- Actual Auth/Firestore changed v2 cases selected with `--test-name-pattern=v2` from `controlled-phone-service.integration.test.js`: **3/3 pass**. Verified primary registration/interest/relogin/Friend/pagination/identity isolation and preservation of unrelated data; unseen primary cleanup/replacement UID denial; open strategy history lengths0/1/2 across three sends, secondary history isolation and both-owner cleanup. Compiler/model/provider are explicit doubles here.
- `git diff --check`: pass.

Actual adapter verification used exclusively owned loopback Auth19099/Firestore18080, hub14400/logging14500/websocket19150, a generated isolated credential profile and existing `buildControlledEmulatorTestEnvironment`. Standard parent runtime ports were not used. Exact fixture cleanup assertions passed, then CLI shutdown completed. No real model, Ticketmaster request, credentials, device install or external message occurred during review.

Parent still must bind the reviewed source to the final single APK and actual configuration, validate real9B/realTicketmaster/phone journeys and preserve failures/Not Run states. APK debug build must set `ENMORI_SPONSOR_DEMO=true` to select `com.enmori.app.sponsordemo`; the package suffix is intentionally under the existing debug handoff build path.
