# QA — approved F0/F1a prototype and visibility repair

25 October 2026. Independent browser review of Product
`3f3d71ca1237754b6555dd66b61c6c5365a99bf3`, with focused repair review at
`da96cdc2dff6be2f1e106b1971149fd66b307d5d`. QA used separate frozen `git archive`
copies, a QA-owned loopback static server and an isolated cached Playwright
Chromium session. This is synthetic HTML prototype evidence, not Flutter,
Firestore, native visibility/read-state, notification, phone or UAT acceptance.

## Critical workflows

All six selected workflow groups passed at the original Product head. These
counts are QA executions, separate from the author's broader matrix.

| Group | Independently observed result |
| --- | --- |
| Settings/create unknown | Settings unknown cannot create an intent; intent unknown reads the original command and provides no replay/new-create path. Exact draft survives. Duplicate follow-up is disabled while ordinary explicit chat send remains available. |
| Time/zone confirmation | Editing time clears both confirmations; quiet time and unresolved zone block confirmation; explicitly keeping the displayed Singapore zone still requires confirmation. |
| F1a selection | Inclusive seven-day boundary is selectable; one-minute older is disabled. Five selections block a sixth. Exclusion requires review, preserves draft, and unknown send preserves text and four remaining selections without resend. |
| Dependent-history exclusion | Conflict blocks Done and Send. Explicit pair exclusion still requires review; review restores sending with the exact original draft. |
| Saved source sidecar | Reading a saved proactive message's source exposes no attach action, preserves the draft and leaves next-request selection at zero. |
| Unknown source | Unknown is distinguished from absent, cached note text stays hidden, and an unresolved recheck does not restore it. |

The prototype explicitly models Singapore time. This review does not establish
arbitrary IANA conversion, gap/fold resolution or native time-picker behavior.
At width 390 with English and enlarged text, the page/screen had no horizontal
overflow; the draft's 56-pixel input remained hit-testable. QA viewed the captures.
Captured page errors were empty and requests were loopback HTML/CSS/JS/font only.

## Actual findings and exact-head closure

**P2, premature read observation, original head:** with viewport 320 × 568,
expanded lab controls and scrollY 0, the message occupied y 753.78125–840.171875.
Its visible height was zero, but the read status was pending and acknowledgement
enabled. The explicit `#screen` IntersectionObserver root did not establish
visibility in the browser viewport. The original failure and screenshot remain.

**Repair independently passed at `da96cdc`:** identical offscreen geometry now
keeps unread and acknowledgement disabled. Scrolling to y 316.78125–403.171875
exposes all 86.390625 pixels and changes to pending; explicit acknowledgement
then syncs. Source uses the implicit viewport root, ancestor clipping, current
target/document visibility/nonzero-area guards and re-observation on resize and
visibility changes. QA reran the original counterexample and positive scroll/
acknowledgement sequence; the author's additional hidden-property/zero-size
fixtures are not counted as QA execution or native background evidence.

A smaller copy inconsistency also closed: after dependent-history review, the
pill previously still said a recheck was needed. At `da96cdc`, before review it
still requires a recheck and disables Done; after review it says the scope was
checked, enables Done and preserves the exact draft. QA viewed the new capture.

## Reproducibility and retained failures

Private evidence is under
`/home/miku/.local/state/enmori-ai-companion-20261025/qa-review/product-3f3d/`
and `product-da96/`. `evidence-manifest.json` in the latter binds scripts,
results, screenshots and both frozen-source manifests. Manifest SHA-256:
`1d762094b24ef2ed632658ec31c34b94f071565bf276205a4797dec15614dd8a`.
Browser invocation used the cached Playwright wrapper with `NPM_CONFIG_OFFLINE=true`, session
`enmori-qa-approved-3f3d`, and `run-code --filename <private script>`.

The first QA harness missed expanding the lab before a language control; a later
F0 harness tried clicking the intentionally disabled duplicate-follow-up button.
Both raw failures remain. The corrected F0 check asserts that disabled state and
tests ordinary send instead. It passes as the same workflow group, not an extra
product pass. No production implementation was changed by QA.
