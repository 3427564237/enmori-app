# Persona TalkBack selection and activation follow-up

Recorded 9 October 2026, after the [ordinary-touch and visual-selection checkpoint](2026-10-09-persona-manual-feedback-and-selection.md). This is attributed user feedback and owner verification, not an independent review or LI acceptance decision.

## User-reported TalkBack results

The user subsequently reported actual TalkBack testing: items 1, 2, 3, 5, 6 and 7 passed. For item 4, the user reported successful operation but said that speech did not clearly distinguish selection from activation. Item 4 therefore remains open for correction and human retest; this is not an all-pass TalkBack result. The agent did not independently hear or observe the reported gestures.

The installed package at this report used product source `82d8e890d71e21bfafc712b205d5d271dd5e1d0f`, published with evidence at `17aa358fe86032ef501a356783a49787c28cb64e`. APK SHA-256: `7219b6ad47ef738bef1b061a10a853b099fabb4795a1604cb6ef3507d18ca8eb`.

| Checklist item | User-reported TalkBack result on the previous APK |
| --- | --- |
| 1. Entry, page identification and navigation | Pass |
| 2. Four form fields and options | Pass |
| 3. Empty-name validation, correction and save | Pass |
| 4. Local selection versus server Active state | Operation passed; speech distinction defect, retest pending |
| 5. Activation confirmation and cancellation | Pass |
| 6. Active-deletion warning and cancellation | Pass |
| 7. Unsaved edit, Keep editing and Discard | Pass |

Earlier ordinary-touch and Not Run records remain valid historical snapshots. This later report does not establish physical-keyboard testing, complete global accessibility conformance, or formal product acceptance.

## Bounded correction

Product source commit: `af56e6ea979039102eff1a2fd52d974f484fc8a3`.

The previous outer `Semantics(selected: ...)` merged selection into the card while the focusable button exposed only `Select` or `Selected`. The button now owns its selected flag and names both its purpose and Persona: `Select for activation: <name>` or `Selected for activation: <name>`. Its independent value is `Currently active` or `Not active`, read from the server-backed active Persona pointer. The separate status text also exposes `Current activation status: Active/Inactive`.

This clarifies the two states already required by the [approved P08 contract](https://github.com/3427564237/enmori-app/blob/55fa4a7ab77b32b08d300d391ebee4293ad6f963/docs/planning/2026-10-07-zhou-persona-first-contract-delta.md), within the [isolated-flow approval](https://github.com/3427564237/enmori-app/blob/141ebcf2cecccaa503ff48a8f3403915db6c060e/docs/decisions/2026-10-09-li-persona-p08-isolated-flow-approval.md). The existing visual highlight, button type/key, keyboard focus and explicit activation confirmation remain. Selecting still changes only page-local state; it sends no activation request. No Backend/API/schema, dependency, router or broader AI requirement changes.

## Verification and device update

- Regression reproduction: two accessibility tests failed against the prior implementation, exposing selection attached to the wrong node and the ambiguous button label. The failing log is retained locally.
- Affected Persona page/accessibility suites: **22/22 Pass** after correction. Tests exercise two Personas and all four selected/unselected × active/inactive combinations, check the actual button node's label/value/selected flag/role/tap action, keyboard focus retention, semantic activation of the selection button, and zero repository activation requests.
- Targeted Flutter analysis: **Pass**, no issues. Formatting and `git diff --check` pass. A separate agent's read-only review found no required correction; this is not JIN's review.
- Dedicated manual APK rebuild, compiled package/Activity/Manifest checks and `adb install -r`: **Pass**, installed at 21:06:58 UTC+08:00. APK SHA-256: `e2e74ad02669b2db549ef10b515a261fb289bad37b47b8fe36fd18cd270c95b6`. Package remains `com.enmori.app.personatest`, launcher label `enmori`. The existing synthetic fixture and original 22:12:57 session expiry were retained; no fixture reset or app uninstall was performed.
- Native Android accessibility-tree inspection: **Pass** for an inactive Persona before and after selection. The current list was empty, so the agent created a synthetic `TalkBack Check` through the actual page. Android exposed a clickable `android.widget.Button` with `Not active, Select for activation: TalkBack Check` and `selected=false`, then `Not active, Selected for activation: TalkBack Check` and `selected=true`. The card retained `Current activation status: Inactive` and `selected=false`; `Activate` remained a separate button. No activation was performed. The app is left on that selected, inactive item for human retest.

The native tree confirms the Flutter-to-Android accessibility bridge, **not actual audible TalkBack output**. Human retest of item 4 on this refreshed APK remains pending. Items 1, 2, 3, 5, 6 and 7 retain their previous-APK user attribution; they are not presented as rerun on this source.

The build completed with existing Java native-access and Firebase plugin/Kotlin migration warnings. No dependency migration was performed for this semantics-only fix. The previous full 307-test regression and automated PC13 device runs remain bound to their earlier tested sources and were not rerun for this bounded correction.

The [manifest](2026-10-09-persona-talkback-feedback-manifest.json) binds source files and retained local evidence by hash. APKs, raw native trees, logs, temporary configuration, synthetic credentials and certificates remain in local drafts and are not uploaded.

## Review boundary

[JIN approved](https://github.com/3427564237/enmori-app/pull/72#pullrequestreview-5470329704) exact previous head `17aa358fe86032ef501a356783a49787c28cb64e` at 20:59:15 UTC+08:00. That approval is preserved and does not automatically cover this new source. The changed head is submitted for JIN's focused re-review; LI acceptance remains pending. PR #72 remains Draft/Open and unmerged. Other AI/Conversation and live-model scopes are unchanged.
