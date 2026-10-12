# LI independent History and shared-AI gate review

12 October 2026, Asia/Singapore. This checkpoint follows the
[parallel delivery reissue](../../decisions/2026-10-12-li-parallel-delivery-reissue.md).
It records LI's completed reviewer actions, not acceptance of unreviewed LI code.

## DU History #89

Exact reviewed head: `c7729de89ecb35c47561a867e07fcd71cd568833`, based on main
`f46a903cb5b339365ac2024004b32b7b96b99e7c`. The approved #82 task requires the
accepted #64 API/Repository in #72/#80, rather than this older main-based copy.
Accepted #64 is `2d2a81d85a10e0ced88199a25b373289030dbf26`.

[LI formal Changes requested 5492321616](https://github.com/3427564237/enmori-app/pull/89#pullrequestreview-5492321616)
and its [additional routing finding](https://github.com/3427564237/enmori-app/pull/89#discussion_r4249298416)
form one four-item correction packet:

1. Restore the approved abbreviation rejection before repository access. On the
   compiled submitted source CET/EET/EST/GMT/HST/MET/MST/WET all return success
   and reach the fake repository, contrary to unchanged OpenAPI and the approved
   History physical proposal. Valid IANA aliases and UTC remain accepted.
2. Restore the normalized, nonempty, maximum-500-grapheme Note DTO checks and
   accepted negative/boundary tests. LI copied the unchanged accepted #64 test
   into ignored review artifacts; its first empty-Note case returns Success
   instead of Failure, exit 1. Later loop cases are not claimed executed after
   that failed assertion.
3. Preserve API24/25 native compatibility. New java.time calls require API26;
   pinned Flutter minSdk remains 24 and the submitted Gradle configuration has
   no core-library desugaring support. This is source analysis, not an executed
   API24/25 failure. [Android ZoneId reference](https://developer.android.com/reference/java/time/ZoneId#systemDefault())
   and [Android API desugaring documentation](https://developer.android.com/studio/write/java8-support)
   support that boundary. No minimum-version/dependency change is approved.
4. Restore isolated-only History registration. The submitted controlled runtime
   unconditionally supplies History to ordinary R4 routes. LI Fastify injection
   with no isolatedSlices reports `historyRouteRegistered:true`, status 401;
   the accepted route must be absent there. This repeats the prior corrected
   ordinary-runtime exposure, not a new product decision.

LI independently ran full Flutter **161/161**, strict Backend **323/323** and
fatal-info lib/test/integration_test analysis, all exit 0. These are this older
branch's actual suites, not the shared candidate's 478/543 counts. Green tests
do not resolve the reproduced contract failures. Offline enforce-lockfile
dependency resolution changed no lock/source. Existing pinned Backend cache
was linked temporarily and unlinked; its target remains untouched.

DU's latest API36 Android flow and unchanged 22-record host readback remain
owner-attributed. LI did not rerun History Android, physical accessibility or
UAT. No History acceptance or integration is claimed. Non-mutating merge-tree
inspection found ten conflicting paths against #87; it changed no branch and
is only preparation for LI's assigned integration after corrected source review.

[The concentrated #82 handoff](https://github.com/3427564237/enmori-app/issues/82#issuecomment-6126554344)
requests existing-contract repairs and DU's separate #87 review. No additional
PM confirmation, repeated preparation report or global AI hold is required.

Local ignored evidence, SHA-256:

| Artifact | Fingerprint |
| --- | --- |
| flutter-test.log | fa9d312de33599c54e34d2410bd97e860917bff3ce5e9b8ce042f69be4ebb2d6 |
| backend-test.log | 393a6201d42d9fa0cc674de02514b94639c37b9250e6aafbfc388e4d9d74dafb |
| analyze.log | e8dc9876c280f5e5856ad02bdfff74e10fe944a331b6e4f3ea1f4297666ad735 |
| approved-note-probe.log | 11418ff1d18bedb651db023f98bc9d28b8ae0ef5a33de3976f8b616d487b141c |
| zone-probe.log | f1bc8919fb5077696e38b1dc73b1d5af373c94e564504dd852d9b97435d89738 |

The ordinary-route probe is also retained locally under build/li89-review.
All probe identities/data are synthetic; no credentials or raw private logs
are published. No reviewed product file was edited to accommodate a probe.

## JIN #91 evidence supplement

[LI formal APPROVE 5492329752](https://github.com/3427564237/enmori-app/pull/91#pullrequestreview-5492329752)
binds exact evidence head `5b78c5ea32481f92e165f2e3ab73bc8da6c1c95a`, whose
parent is #87 `9a4931dd9c04db75ca466d7c17f978329a252256`, tree
`26c2d21c7353af5bf1a2a2376bae13f3e85881a4`.

LI independently confirmed its single Markdown/186-line diff, new whitespace
exit 0, prior-gate link, unchanged protected Backend/API/tools/Android/Auth/
ordinary-main/dependency payload versus accepted #86, and unchanged API27/33.
The executed payload matches LI's earlier independent Backend543/Flutter478
and physical synthetic-AI7/7 checks; no redundant rerun or attribution transfer.

JIN separately reports Backend543, actual guarded Emulator73, Flutter478 and
four isolated Android fixtures: synthetic shared AI7, real isolated Search1,
Friends1 and Persona1. These remain JIN's evidence, including retained install/
teardown failures, source-newline equivalence, cleanup and inherited whitespace
exception. Raw owner artifacts were not downloaded; local fingerprints are not
independent reproduction. No contradiction requiring correction was found.

This finishes LI's **evidence-only** review. At this checkpoint DU's #87 code
approval and SHI's #91 composition/isolation conclusion are still pending;
changed-combination PM acceptance is not yet established. The historical older
History failure in JIN's document does not override DU's newer #89 observation.
[The #84 handoff](https://github.com/3427564237/enmori-app/issues/84#issuecomment-6126554647)
requests only the remaining named conclusions. Existing #86/#88 acceptances
remain immutable; no duplicate unchanged-feature review is requested.

Keep Draft/Open and current board state. No merge, task closure, ordinary
enablement, real AI adapter/storage/model/provider result or whole
Sprint/UAT/Release/Done claim. Today's 23:59 is still a target, not a verified
result; the earlier 22:00 reviewed-delivery target was not established.
