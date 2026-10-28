# LI takeover: first executable recovery packet

Date: 2026-10-28 (Asia/Singapore).
Authority: [confirmed takeover](../../decisions/2026-10-28-li-unfinished-work-takeover.md).
Base: `2306ac0c5a060b2d999a5b8c34e09704c446de31`.
Product/test commit: `a682f020c98359b41277f953230d3fd940e7d229`.

## Responsibility changes verified

GitHub Issues #63/#68/#77/#78/#82/#83/#84 now have the sole assignee
`3427564237`; #44 remains LI-owned. Each body starts with the published takeover
decision and retains its complete prior body below it. Readback through the
mutation response and Project item listing confirms the new assignees. All
remain Open; existing Project statuses remain unchanged. #63/#68/#77/#78 retain
their bounded component acceptance and transfer only residual closeout work.
Closed #47 preparation and completed #187 remain historical completed work.

## Reproduced defect and repair

When a route covers `OwnAvatarEditor`, `_current` discards an in-flight read or
save response. Previously the editor retained `_busy`, did not re-read on return,
and continued supplying the photo to its covered image widget. This violated the
approved [avatar return/privacy contract](../../planning/2026-10-27-avatar-contract-proposal.md).

The editor now observes route/TickerMode visibility, retires old read and picker
callbacks, clears the displayed saved photo and busy state, and establishes a
fresh saved revision on return. Draft bytes and unresolved writes stay within
the same session. A late picker response from an earlier route visit is ignored.
Native system-picker background/resume still accepts the explicitly chosen
preview. Matching readback may confirm an unknown write; no automatic write is
introduced. No Backend/API/dependency or visibility-policy change.

## Executed verification

Flutter 3.47.2 through FVM, under the shared
`/home/miku/.local/state/enmori-product-round-20261023/flutter-validation.lock`.

- Before the fix: three focused regression cases failed on missing return reads
  and a retained covered preview. An initial test-fixture attempt also counted
  the resolving-to-authenticated startup read; the fixture was corrected to an
  already authenticated session before this product reproduction. No product
  change was made to satisfy that fixture-only expectation.
- Final `fvm flutter test test/features/own_avatar_test.dart
  test/features/shared_avatar_test.dart test/app/own_profile_flow_test.dart
  --reporter expanded`: **25 passed**, exit 0. Includes five new route/read/save/
  picker regressions, existing explicit publication/removal/unknown-save checks,
  shared-avatar visibility and Profile navigation/session/small-screen checks.
- `fvm flutter analyze --fatal-infos
  lib/features/account/presentation/own_avatar_editor.dart
  test/features/own_avatar_test.dart`: no issues, exit 0.
- `fvm dart format` on those two files completed; `git diff --check` passed.

Synthetic local log SHA-256:

- Red: `5afac8ee44fcef678c4fa4b2d8f1b6c20fff0b91621b20e9a54b66b4f27231db`.
- Final: `6cf9bafb28411bbab35dabac456cc321ec5b9d9f68b983781fbb1dece0707891`.

No APK build/install, service change, real-account photo write, provider/model
request or physical-device result belongs to this packet. The concurrent LI
integration chat retains its phone/runtime execution. This is author validation,
not independent review or full module/Sprint/UAT/Release acceptance.

## Remaining work now owned by LI

- AI semantic closeout: inspect and score the existing private 24-case output
  against its fixed rubric before selecting any minimal correction. Protocol
  eligibility remains separate from semantic quality; no blind retry.
- Source coverage: preserve JIN's completed 14-category disposition and actual
  missing-field observations. Additional provider access/display basis remains
  a concrete unresolved product/access choice, not a teammate-delivery wait.
- Existing #189/#191 independent review conditions remain truthful. The active
  LI integration chat handles #189 cancellation and Home recommendation repairs;
  this packet does not overwrite that checkout or claim its device results.
- Integrate this exact avatar delta into the next candidate in the established
  serial order; source validation here does not establish its inclusion in the
  installed APK. Preserve all remaining acceptance items rather than close
  Issues because their assignee changed.

The Draft PR uses a frozen `souma/li-takeover-base-20261028` comparison branch at
the base SHA above, so only this takeover and avatar-recovery packet is reviewed.
It does not target main or move the concurrent integration branch.
