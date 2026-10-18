# Local accounts/core-journey implementation evidence

Authority: [19 October bounded Sponsor decision](../../decisions/2026-10-19-li-sponsor-demo-local-takeover.md). Baseline `97b169f6f13b2af44ee2cde1fddb52d8b92386c9`; owned implementation commits `6e6488aa582d52d5e17f87b0da7aa875ddfc45b5` and `194b7c6267358845dadc2580fc7c69b560e1a1a2`. Event/AI component commits are independently authored dependencies; the accounts slice supplies only the final composition seams.

Private handoff v2 reserves the primary email for in-app Firebase registration and precreates the secondary. Backend verification checks Firebase's current identity and exact reserved email on protected requests; each email is locked to one UID and a replacement UID is forbidden. The primary uses the existing onboarding/privacy/Profile/Interests contracts. The private secondary has a public display name and exact generated username for controlled Friend lookup. No public endpoint or arbitrary Account access is added; v1 remains compatible.

The controlled app keeps the existing registration/login/router/session flow in v2, including logout and account switching. It wires the Backend recommendation repository and existing guarded native source capability. The host wires one bounded source projection to browse, recommendations and detail, and selects the same open strategy for compiler startup probe, actual compiler, semantic validation and internal history composition. The independent debug package selector is `ENMORI_SPONSOR_DEMO=true` and target `lib/controlled_demo.dart`; the handoff helper requires `--sponsor-demo` to target it explicitly.

The inherited #157 Footprint controller was inspected and retained: successful next-page reads replace the visible page; failure preserves the old page and cursor for retry. No unneeded reimplementation was made. Cleanup iterates exact two owner/UID scopes, exact created paths and matching current-epoch CLOSED fences only after original work settles. Unknown/failed runtime or sweep outcomes remain held. Unrelated accounts and documents are preserved.

## Verification

Pinned Node 24.19.0 and existing dependencies; Flutter 3.47.2 / Dart 3.13.2; no toolchain or dependency upgrade.

- TypeScript build passed.
- Actual Auth/Firestore controlled-phone integration suite: **19/19 passed**, including legacy repeat/readback/held cleanup and the three new v2 cases.
- The main v2 case performs actual Auth registration, onboarding/consent, Profile save, interest save and refreshed login/readback; exact Friend lookup/request/secondary accept/primary and secondary list reads; 21 actual Note creates with 20+1 paging; secondary record isolation; forbidden foreign identity/current-email change; common Event source generation; exact owned cleanup preserving unrelated Auth/document data.
- Another case covers registration with no Backend request and refuses replacement UID reuse. The open-strategy case performs three primary sends with history lengths 0/1/2 in order, rejects secondary access to the primary conversation, sends from the secondary with empty history and verifies both owners' settled cleanup. Compiler/model/provider responses are explicit doubles; these are not real-model/provider or phone evidence.
- Operator service tests: **21/21 passed**, including matched v2 startup-probe strategy and private output separation.
- Private handoff tests: **21/21 passed**, including a valid v2 transfer to only the verified Sponsor package and refusal of arbitrary/wrong packages.
- Targeted Flutter tests: **62/62 passed** across handoff parsing, harness, v2 registration/login router, inherited Footprint recovery and interest/session behavior.
- Flutter static analysis: clean. Diff whitespace check: clean.
- All original test requests settled; Emulator Suite exited successfully and all five owned standard ports were independently bindable after shutdown. No actual model, provider, device or privileged system mutation was performed by this slice.

## Preserved failed verification attempts

The first integration invocation was **16/18**, with a new test's incorrect own-interest envelope assertion and the inherited Dart child reporting exit 2. The assertion was corrected to the existing normative `interests.interestTags` envelope. A second invocation was **17/18**; a content-free step diagnostic identified `configuration:blocked` in the Dart child. Investigation showed the direct test launcher supplied only Firebase CLI's `GCLOUD_PROJECT`, while the guarded Dart probe deliberately requires both it and `GOOGLE_CLOUD_PROJECT`. Rerunning with both exact demo project environment variables passed **18/18**, without relaxing any identity/environment guard. The final combined suite then passed **19/19**.

A new widget test initially attempted Sign in while the registration-success SnackBar still covered the bottom action. The test now advances through the existing SnackBar lifetime before exercising the visible action; no product UI behavior was changed for the test.

## Remaining acceptance and handoff

Independent accounts review is assigned to the AI implementer and pinned to the two exact owned commits; that reviewer reports its own commands separately. [Operator instructions and exact cleanup inventory](../../../tool/sponsor_demo_accounts.md) describe the primary Profile prerequisite, one-tag catalogue, at least 21 short controlled Notes, private credential handling, build target and stop/hold recovery.

Real Ticketmaster/9B activation, privileged diagnostics installation, final combined full suites, final APK identity/hash, physical vivo install, account switches and two-round complete journey remain parent integration/device acceptance. No whole-product/UAT/Release/Done claim is made by this branch. Credential values remain private and are absent from this artifact.
