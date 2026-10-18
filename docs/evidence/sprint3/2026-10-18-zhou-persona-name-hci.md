# ZHOU Persona Name readability repair

18 October 2026 SGT, `D:\3851`. First independent HCI increment under [S-PM-1018-LI-ZHOU-DU-CONTINUOUS-IMPROVEMENT](../../decisions/2026-10-18-li-zhou-du-continuous-improvement.md), copied unchanged from LI `8dd85381381512961713b242c2b3ab5a93dc28db` (blob `e066fc93ab177514afea6915f586a1130035894c`). This is not a new requirement or a repeated #140 review.

## Demonstrated problem and correction

On approved #140 `9150c3c7852d43c31bcb59ce80193b08be5c2850`, Persona creation at 320x640 and 2x text clips both the existing Name guidance and the validation correction. Two separate probes report `RenderParagraph.didExceedMaxLines=true`; the original run is 0 Pass / 2 Fail. Previous no-overflow/scrollability checks did not detect text ellipsis.

Source-only `f8b49f917eebc7aa244c9d11d6876487938bae16` changes only the editor, its existing accessibility tests and the exact confirmed PM record. Native `InputDecoration.helperText` and validation `errorText` are retained. Each fixed message's character count supplies a conservative maximum line count, allowing natural wrapping rather than another arbitrary small cap. The original strings, Name rules, theme/error styles, enabled conditions, saving and focus behavior are unchanged.

Four new regressions check 320x640 and 640x320 at 2x and 3x text: neither message is truncated, Save and correction are scrollable/hit-testable, invalid submission focuses Name and creates no Persona. The existing semantic test now requires the full correction in the Name field's own hint, not merely a separate error-text node.

An intermediate custom `errorBuilder` passed visual checks but lost the field/error semantic association in pinned Flutter. Independent local review identified this; a new test failed with an empty Name hint. Restoring native `errorText` fixed it. That intermediate failure remains in the receipt; it is not a product regression shipped by this packet.

## Verification and attribution

Pinned Flutter 3.47.2 / Dart 3.13.2, exact committed source exported beneath `D:\3851\build\zhou-hci-20261018\persona-f8b49f9`:

- Affected Persona/domain/session/HTTP-harness/Home-router suites: **90/90 Pass**, exit 0, including four new readability cases.
- Fatal-info analysis: no issues, exit 0; non-writing format: two files / zero changed; scoped whitespace Pass.
- All **1,293** exported tracked files matched the committed Git blobs after execution. The unfinished next AI layout increment in the main working directory was excluded from this source and its checks.

Commands, source blobs, exported hashes and local log fingerprints are in the [machine receipt](2026-10-18-zhou-persona-name-hci.json). Counts overlap with the focused five-case check and are not added. The first export test preflight lacked generated `package_graph.json`; copying matching existing generated metadata resolved it without pub/dependency changes. The failed preflight log remains. Local independent static review is supporting evidence; LI formal new-code review remains separate.

## Compact independent device procedure

SHI can verify on the next identified authorized candidate: open Persona creation, use large system text on a narrow phone and in landscape, read the full Name guidance, submit an empty Name, then read the entire correction. Confirm Name receives focus and its screen-reader error remains associated; scroll to Save and Back. No Persona should be created by invalid submission. Repeat in edit mode as applicable. Record actual candidate/APK, text setting, orientation and result without private content.

New Android/TalkBack, iOS, APK and real service/model runs are **Not Run** for this repair. Existing real-AI failure and JIN/LI original-operation disposition remain separate; they do not block this local UI fix. No Backend/API/shared router/runtime/dependency, business rule, automatic retry, service/device operation, main merge, Issue/Project change or whole-module acceptance is included.

The next independent item is already being implemented: AI multiline Retry overflow and editing-state preservation during keyboard changes. It proceeds while this Persona packet is reviewed.
