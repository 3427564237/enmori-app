# LI bounded acceptance — #83 selected AI client

- Source ID: S-PM-1012-LI-AI-CLIENT-COMPONENT-ACCEPTANCE.
- Authority: human LI HOURUI / PM, 12 October 2026, Asia/Singapore.
- Status: Accepted for the released N01/N05/N06 client and explicit synthetic harness only.
- Controlling scope: [parallel reissue](2026-10-12-li-parallel-delivery-reissue.md), [conditional A](2026-10-12-li-isolated-note-conversation-conditional-a.md), [Issue #83](https://github.com/3427564237/enmori-app/issues/83).

Accept corrected [#88](https://github.com/3427564237/enmori-app/pull/88) head
`398f81c901fc64f230442dc1405d0ba6b75763b7`, executable
`2b4290b470a026e20b73e09dce10cae46af2f147`, tree
`876549d84effa0e04fea9539b6a2425527b57b42`, base #81
`2f00a6c7ab686ffba2429a4dc74761b12a04d3a5`.

[JIN exact-head APPROVE 5490189972](https://github.com/3427564237/enmori-app/pull/88#pullrequestreview-5490189972)
resolves the two original R1/R2 findings. New relevant assistant/tombstone reads
revoke stale Retry; older user-saved outcomes cannot reopen it. Retry replies
must preserve the original user ID, sequence and persisted time before success
or row merge; contradictory pairs retain unknown protection. Current explicit
outcomes remain required for history-only ambiguity. Prior Changes Requested,
failed probes and owner intermediate failures remain historical evidence.

LI independently ran the clean exact head: full Flutter **443/443**, including
25 correction regressions; fatal-info analysis of lib/test/integration_test;
non-writing format of all 18 changed Dart files; exact base/head whitespace.
All passed. LI verified all 25 manifest Git blob/working-hash bindings (19 exact,
6 LF-to-CRLF-equivalent), 7 published transcript hashes, two byte-identical LI
decision copies and evidence-only final delta. Backend/API, Android/dependencies,
shared Auth/Home/router and normal entry remain unchanged from the selected base.

JIN separately ran 443 and nine unchanged reviewer probes, all Pass. Their counts
overlap the committed suite where applicable and are not LI executions or new
Backend cases. Owner APK compilation/fingerprints remain attributed evidence;
LI did not obtain or rebuild that artifact and no device execution is accepted.

LI local logs under ignored `build/li88-review/` in the AI client review worktree:
Flutter SHA-256 `2bddcfc634b14d2a25da5e4facc2daeabf7e386165562f636b98209eaf893c22`;
analysis `e8dc9876c280f5e5856ad02bdfff74e10fe944a331b6e4f3ea1f4297666ad735`;
source checks `24a883fa90021105b69058eec8a6c1e5fd242ea166ada7c45e228362db539d41`.
Pinned Flutter 3.47.2 / Dart 3.13.2; offline enforce-lockfile pub get succeeded,
no tracked changes. No new failed product run in this LI component verification.

## Supersession and remaining scope

Supersede only Pending JIN correction-review/LI component acceptance for this
exact #83/#88 head. Preserve the original 418-source record and old failures.
The repository default remains null; synthetic transport is confined to its
explicit test entry. This accepts actual client/controller/page code, not real
Conversation persistence/context/model, N02/F01/F03, permanent-unknown exit,
complete source cleanup, NC04–NC09, device/accessibility or whole M26 completion.

LI may now compose this accepted real builder in the explicitly synthetic shared
harness under #85. New LI shared code requires DU review and the changed
composition requires applicable JIN gates; #88's 443 cannot certify that tree.
#82 History is separately pending and does not hold AI integration. Keep
Draft/Open, no merge/Issue closure/board transition, ordinary/provider/model
runtime enablement, whole Sprint/UAT/Release or deadline guarantee.
