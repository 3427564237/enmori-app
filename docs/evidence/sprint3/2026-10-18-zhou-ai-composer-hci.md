# ZHOU AI composer keyboard and multiline repair

18 October 2026 SGT, `D:\3851`. This is the next independent HCI increment after [Persona PR #147](https://github.com/3427564237/enmori-app/pull/147) was delivered, under the [confirmed continuous-improvement direction](../../decisions/2026-10-18-li-zhou-du-continuous-improvement.md). Work and verification proceeded without waiting for that review, old merges or the shared real-model incident.

## Original failure and final behavior

The accepted social AI page at #140 / the unchanged AI source inherited by #147 uses a fixed 260-height switch between a lazy whole-page ListView and a Column with a pinned composer. At 320x640, 2x text, keyboard inset 300 and a four-line draft, the Retry form overflows by **36 pixels**. The Send-only control case passes. Earlier taller 740/820 probes passed and are retained; they were not evidence that the compact Retry path worked.

The final repair keeps one stable editor subtree at every height. History remains an Expanded, independently lazy ListView. The existing composer stays bottom-aligned at its natural height when it fits; it is capped at 60% of available body height and scrolls locally when necessary, leaving room for history/status/recovery controls. The input controller, focus node, selection and draft are not moved into or out of a lazy list when the keyboard changes. No label, request/state rule, timeout, recovery, cancellation or session policy changes.

The composer scroll view is explicitly non-primary. The history remains the only route primary scroll target, so an AppBar-focused PageDown does not assert or scroll the wrong area. The existing route and composer keys remain available; the route key now names their common Column instead of only history.

## Source and verification

- Base: Persona #147 `f0a1c4698e18ceac9cc4320169530a0f74857343`.
- Source-only range: `f0a1c46..5e147b7dfedae2f51c7caee2babfcd0bca19b88b`, commits `d155db9` plus import-only `5e147b7`.
- Exactly two source/test paths: AI page and its existing page tests. No Persona delta is introduced in this range; its prior approved-scope repair remains attributable to #147.

Pinned Flutter 3.47.2 / Dart 3.13.2, final source: affected AI/controller/wire, network harness, repeat-use, shared-router and offline-social tests **251/251 Pass**, exit 0. Fatal-info analysis has no issues; non-writing format reports two files / zero changes; whitespace Pass. Commands, tested blobs/hashes and local log fingerprints are in the [machine receipt](2026-10-18-zhou-ai-composer-hci.json).

Seven new cases are included in 251, not added again:

1. Empty/40-message history x Send/Retry, 2x text: opening/closing keyboard insets 400 and 500 retains draft, selection and focus, with no implicit send, retry or cancel. Distant history rows remain unbuilt until needed.
2. Compact four-line Send and Retry: actions can be reached and actual clicks invoke exactly the selected action once, without overflow.
3. Android-platform widget fixture: focus Settings and press PageDown; history really moves, one primary position remains and no exception/generation occurs. This is a host widget test, not physical Android evidence.

The existing offline social capture target was also rendered with the pinned SDK's bundled Roboto and MaterialIcons. The normal chat raster was inspected: history and composer remain separated, the input is pinned above navigation, and existing control labels/icons remain legible. These synthetic Flutter rasters are local under `build/zhou-hci-20261018/visuals-roboto`; they are not real model or device captures. The capture case already belongs to 251 and is not counted twice.

## Retained failures and review

A first threshold-scaling draft removed the overflow but could put the focused editor outside the lazy fallback tree. The fixed parent structure replaces that draft. A test that entered an unbuilt lazy child initially needed an actual scroll; the failure is not hidden. The initial stable-tree draft also inherited one primary controller in both scroll views; PageDown reproduced the framework assertion before `primary:false` fixed it. The platform-test fixture was corrected to the supported Android variant instead of manually restoring a global override. One unnecessary-import analysis info was removed in the final source-only commit.

Independent local static review checked the final layout, route consumers, editing-state protection and primary isolation; no remaining actionable finding. It does not replace LI's formal review. Old #133/#140 protocol checks are reused where unchanged; the affected run does not certify the shared original-model failure or the whole app.

## Compact SHI device procedure

On an identified authorized candidate containing this exact AI page, enable large system text, focus Message and enter four harmless synthetic lines. Open/close the keyboard and rotate as applicable: preserve draft/selection/focus, scroll within the composer to reach Send or the already-permitted Retry, and check history/status remains independently reachable. Use an existing safe Retry state or fixture; do not manufacture one by sending to the blocked real model. When an external keyboard is available, focus an AppBar control and press PageDown: only history should scroll. Verify existing explicit Back/discard/cancel behavior; no action should occur merely from resizing.

Physical Android/TalkBack, iOS, APK build/install and real Backend/model execution are **Not Run** here. The original real-AI failure and JIN/LI storage/lifecycle/lease disposition remain separate, and no new positive model request was made. No Backend/API/dependency, shared router/runtime, business rule, device/service operation, merge, Issue/Project or overall acceptance change is included.
