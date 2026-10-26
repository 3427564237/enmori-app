# AI reference off correction: v33

26 October 2026, Asia/Singapore. Final candidate in
[Draft PR #189](https://github.com/3427564237/enmori-app/pull/189), on the
integration base containing SHI #187. Use this handoff after the
[v32 result](2026-10-26-ai-recovery-event-state-v32.md), whose physical off-mode
failure remains recorded. No independent approval or full UAT is claimed.

## Correction and evidence

The phone received the first today-referenced v32 reply. Turning references off
then returned `AI_CONTEXT_SELECTION_CONFLICT` (409): an inherited exchange still
depended on a Check-in outside the new empty source scope. It was not another
model cold-start timeout. Input and reference editing remained available.

LI explicitly selected [off-mode history exclusion](../decisions/2026-10-26-li-reference-off-history-exclusion.md).
Off now uses the existing empty-source selection and excludes every pair in
that exact preparation's current latest-two window. The reference panel explains
this. Every explicit Send gets fresh exclusion keys; changed windows are not
mapped to old keys. History is retained, older pairs are not backfilled, and
today/manual conflict review and all backend provenance/authority checks remain.
Rejected or unknown operations are not automatically resent.

Two new regressions failed before the change and passed after it. The final
focused Flutter run passes **276 tests in 20 files**, with **no analyze issues**.
The 13-case today/off file includes both new regressions. Do not add overlapping
runs to these totals. No full-repository Flutter-suite result is claimed.

| Evidence | Result |
| --- | --- |
| Tested and built app head | `604bcb930beb1d5e321da44738e914e95328cbe4` |
| Source tree | `875c1312d101c6fef6354bdb61382ed72d609bb2` |
| Toolchain | Flutter 3.47.2 / Dart 3.13.2, pinned FVM |
| Release build | Pass; assembleRelease 93.7 seconds |
| Frozen inputs | Tracked files and private client/signing configuration unchanged during build |
| Artifact | `build/group-delivery-v33/ENMORI-group-v33-release.apk` |
| Package / version | `com.enmori.app.group`; code 33; `1.0.0-group20261026` |
| Size | 66,939,034 bytes |
| APK SHA-256 | `a70a1f1154679231aef9b53c75435a40541654f8b34571e554d7df1ffb0f86e0` |
| Certificate SHA-256 | `0fa59aeaa9ce03a830405ce79136b4abc3d62510fbb8360c8ebf7c88a82966ee` |
| Identity / manifest | Same package, signer and nine permissions as v32; nondebuggable; messaging auto-init and analytics collection disabled |
| Installed | 18:58:50 SGT, `adb install -r`; installed hash matches; launcher passed |
| Data preservation | No data clear; first-install time retained as `2026-10-21 12:13:08` |

The first v33 USB installation was rejected by the phone. After LI explicitly
confirmed readiness, the retry succeeded. Raw device identifiers, UI dumps and
credentials remain outside Git.

Backend source is unchanged from `44e44a2cc46f08c9f2eed47d3626cc156d469dda`,
already deployed at 18:29:36 SGT with its strict build and 1534 tests passing.
The unchanged-backend diff was verified; it was not rebuilt, retested or restarted
for this Flutter-only correction. The earlier v32 handoff records deployment,
data-preservation boundaries and source attribution to ZHOU #188.

Physical on/off results and request status/latency are in the
[v33 evidence](../evidence/2026-10-26-ai-reference-off-v33.json). They are bounded
interaction evidence, not cold-after-idle, network-loss, model-quality or full
product acceptance. Synthetic inputs use a new topic and do not edit Check-ins
or existing conversations.

On the installed phone, two new synthetic messages in the same topic each
received a visible reply: today references on, then references off. Both execute
responses were 200, taking 16.437 and 17.106 seconds respectively. Input and the
reference button remained enabled after each reply; no repeated Send was used.
These are full endpoint times, not model-only generation times.

## Remaining LI checks

1. After at least 30 minutes without a model request, allow the first-load wait
   and check one reply per send. The requested 30-minute idle release is retained.
2. Enter from an owned Check-in and use the one panel to switch today/manual/off,
   including manual records from two days. Check draft and reference retention.
3. During a slow/interrupted reply, check editable input/references and an
   independent new topic. The old target must remain guarded without resend.
4. Search Events, stop/continue a long search, open a loaded detail, cancel booking
   and return from the website within five minutes. Valid detail/list/query state
   should remain without a forced full reload. Check the removed cover paragraph.

**Actual Event introductions, alternative information-page URLs and complete
14-interest source coverage remain JIN's work in
[Issue #84](https://github.com/3427564237/enmori-app/issues/84).** v33 retains
v32's browsing/state fixes and does not claim to supply that missing source data.
Independent review, full UAT, Release and Done remain separate gates.
