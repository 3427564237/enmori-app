# ZHOU controlled HTTP client/probe evidence — 14 October 2026

Owner: ZHOU. New-delta independent reviewer: LI. This is owner-authored local
verification of the four client/probe inputs listed below, using Flutter
3.47.2/Dart3.13.2 and existing locked dependencies. The root publication packet
will bind the final combined source; this record does not invent a commit/hash
for the changing worktree or transfer LI/JIN/DU's older results to this delta.

Authority: [AI acceleration](../../decisions/2026-10-14-li-ai-acceleration-and-target.md),
[selected conditional A](../../decisions/2026-10-12-li-isolated-note-conversation-conditional-a.md)
and [remaining A](../../decisions/2026-10-13-li-remaining-isolated-ai-contract-a.md).
The selected N01 DTOs, original-control-token binding, ordinary current-owner
reads, budgets and R-A rules are unchanged. No new product requirement,
dependency, Auth protocol, Home/router write or ordinary runtime enablement.

## Source and bounded behavior

- [Injected network harness](../../../lib/harness/ai_conversation/ai_network_harness_app.dart)
  composes the existing wire repository/transport and LI's reviewed social AI
  page. A caller supplies the existing observed AuthRepository, client, selected
  environment label and navigation callbacks. There is no default authenticated
  source, token form, embedded credential, fixture fallback or client ownership
  transfer. A label-only rebuild preserves the draft/session; an observed same-UID
  replacement closes the old attempt and drops its late body.
- [Pure Dart probe](../../../tool/ai_wire_controlled_probe.dart) creates a new
  Conversation only, sends its fixed synthetic input, checks the returned U/A
  identities and six-digit UTC metadata against outcome/history, then explicitly
  deletes its own fixture. A failed execute remains blocked and sends at most one
  original-ticket Cancel; it never automatically retries or treats Cancel as
  proof of no effect. A missing delete capability blocks that teardown alone;
  an in-process non-content fixture reference can be handed to the operator.
  This is not generation rollback or proof of physical cleanup. The selected
  Backend fixture operator still owns full teardown/sweeps.
- CLI tokens enter through stdin without terminal echo; no token/key/business
  ID/message content is printed or saved. Only declared non-content fixture
  source, operation-step/failure-kind results and teardown status are emitted.
  Root HTTPS is permitted through the existing transport; clear-text use requires
  its explicit numeric host-loopback constructor. Remote clear-text hosts,
  credentials in URLs, inferred Android aliases and redirects stay rejected.
- [Real-loopback wire tests](../../../test/features/ai_conversation/ai_wire_network_journey_test.dart)
  use a handwritten N01 HTTP peer. [Harness widget tests](../../../test/harness/ai_network_harness_test.dart)
  inject a test observed-Auth source and handwritten HTTP client. Neither fixture
  is JIN's actual store/HTTP composition, Firebase Auth, Firestore or Qwen.

There is no current-input-only fallback when Note/source authority is unavailable.
The harness/probe consume Backend outcomes and do not grant Note permission or
replace an unavailable context read with an empty result. Missing DU guarantees,
real Backend bridges, model facts and complete cleanup remain their own holds.

## Observed commands and attribution

| Actual local command | Observed result and scope |
| --- | --- |
| `fvm flutter test --no-pub test/features/ai_conversation/ai_wire_network_journey_test.dart` | **5/5 Pass**, exit0; actual loopback TCP/HTTP with a handwritten peer. Covers successful identity/readback, lost execute ACK/one Cancel, delete-only hold, prepare refusal and explicit Retry preserving original U. |
| `fvm flutter test --no-pub test/harness/ai_network_harness_test.dart` | **3/3 Pass**, exit0; reviewed social rendering, observed Auth/provider boundary, label rebuild, same-UID replacement/late-body fence and caller-owned client. |
| `fvm flutter test --no-pub test/features/ai_conversation/http_ai_wire_transport_test.dart test/features/ai_conversation/ai_wire_client_test.dart test/features/ai_conversation/ai_wire_network_journey_test.dart test/harness/ai_network_harness_test.dart` | **51/51 Pass**, exit0. This includes the eight new cases above; it is not another 51 new cases or a full-project result. |
| `fvm dart analyze --fatal-infos lib/harness/ai_conversation/ai_network_harness_app.dart tool/ai_wire_controlled_probe.dart test/features/ai_conversation/ai_wire_network_journey_test.dart test/harness/ai_network_harness_test.dart` | Pass, no issues, exit0. |
| `fvm dart format lib/harness/ai_conversation/ai_network_harness_app.dart tool/ai_wire_controlled_probe.dart test/features/ai_conversation/ai_wire_network_journey_test.dart test/harness/ai_network_harness_test.dart` | Final check: four files, zero changed, exit0. |
| `git diff --check` | Pass, exit0 for the observed local combined worktree; no source acceptance is implied. |
| `fvm dart run tool/ai_wire_controlled_probe.dart --base-uri=http://backend.invalid --fixture-source=blocked-cleartext-fixture` | CLI loaded and rejected remote clear-text before reading stdin; expected nonzero result, fixed non-content error only. |
| `node build/zhou-network-cli-fixture.mjs` | Pass, exit0. An ignored local worker spawned `C:/Users/ASUS/fvm/versions/3.47.2/bin/cache/dart-sdk/bin/dart.exe run tool/ai_wire_controlled_probe.dart --isolated-loopback --base-uri=http://127.0.0.1:<ephemeral-port> --fixture-source=handwritten-N01-CLI-fixture`, supplied a synthetic token privately through child stdin and observed child exit0, five requests and own fixture DELETE. It parsed stdout and checked that no token/key/operation/Conversation ID or message text appeared. The transient worker remains build-only; this is standalone CLI/loopback evidence, not actual Backend/storage/model evidence. |

## Retained first failures and corrections

1. Initial wire-test compilation failed because the tool imported `lib/` via
   relative URIs while tests used `package:enmori`; Dart treated those Domain
   classes as different library identities. Canonical package imports fixed the
   source-loading cause. No DTO or repository contract was changed.
2. Initial harness tests expected the authenticated composer while the observed
   Auth source was unauthenticated, and tapped Send before the entered-text
   `setState` frame rebuilt the button. Tests were corrected to assert the
   existing unauthenticated surface, then observe login, and pump the composer
   frame before tapping. Product behavior was unchanged.
3. First targeted fatal-info analysis reported one missing braces style rule in
   the handwritten test client's Cancel branch. Braces corrected that test
   source; final analysis reports no issues.

Actual JIN HTTP→Application→Firestore combination, real Note/source propagation,
complete cleanup, live Qwen, device execution and Release/UAT are not established
by these client fixtures. Existing memory/scripted AI/Persona harness labels and
historical evidence remain intact. This record is not independent approval.
