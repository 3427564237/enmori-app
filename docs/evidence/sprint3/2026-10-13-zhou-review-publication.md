# ZHOU current increment — review publication

Date: 2026-10-13, SGT (UTC+08:00). This is the publication index for the
completed local increment, under the [human publication instruction](../../decisions/2026-10-13-user-zhou-review-publication.md).
The Draft PR is a delta over accepted #93
`110eda443fbe101608c6aa6df551e52b6a18da5a`; the exact publication head is
reported in the PR and #83/#44 handoff. JIN review and LI acceptance of that
head are pending. No merge, closure, board change or runtime enablement occurs.

## Approval and implementation boundary

| State | Exact scope |
| --- | --- |
| Approved decisions | [Remaining A](../../decisions/2026-10-13-li-remaining-isolated-ai-contract-a.md) selects unchanged packet sections 3–6, including N02/F03/R-A/C-A and the named bounded experiments. No repeated PM product choice is requested. |
| Previously accepted components | [#93 policy acceptance](../../decisions/2026-10-13-li-ai-policy-component-acceptance.md) and [#95 Account producer acceptance](../../decisions/2026-10-13-li-account-producer-component-acceptance.md) retain their original exact heads and limited scopes. #95 needs no repeated component approval. Its actual gateway binding must be verified when composed. |
| New implementation awaiting review | R-A page/session exit protections and 16 new Flutter regressions; prepared inner context reader and 30 tests; independent metadata retention resolver and 29 tests; canonical message/source path parser and 9 tests; two guarded synthetic capability tool batches. These are the new PR's review targets. |
| Producer evidence still required | [DU handoff](../../planning/2026-10-13-du-note-time-identity-handoff-requirements.md): complete source-bound canonical time/immutable owner-Note-time guarantees and physical deletion/no restore/no identity reuse guarantees. The document requests existing prerequisites, not a new product API/registry or a claim that DU has proved them. |
| Later dependent development | Actual Note adapter, message-store/control transactions and target-wide pending settlement, public HTTP composition, complete cleanup runner and the selected shared/device integration evidence remain unimplemented or unwired in this delta. Helpers and finite capability observations do not close those gaps. |

## Delivered source and evidence

The [R-A/prepared-reader record](2026-10-13-zhou-ra-reader-local-development.md),
[local review](2026-10-13-zhou-ra-reader-local-review.md) and
[original source manifest](2026-10-13-zhou-ra-reader-local-source-manifest.json)
retain the original local execution/source binding. The
[independent Backend/probe record](2026-10-13-zhou-independent-ai-local-development.md),
[local review](2026-10-13-zhou-independent-ai-local-review.md) and
[original source manifest](2026-10-13-zhou-independent-ai-local-source-manifest.json)
retain the later increment's actual execution/source binding. Their statements
that the work was uncommitted/unuploaded describe those earlier snapshots;
publication is released by the subsequent instruction above. They are not
rewritten as new test runs or formal approvals.

The [portable evidence directory](2026-10-13-zhou-review-publication/README.md)
provides repository-relative transcripts and reviewer probes. Its copy manifest
records original and published byte hashes and any sanitization. The
[publication scope manifest](2026-10-13-zhou-review-publication/source-manifest.json)
binds every published file except itself to its Git blob and working-byte hash,
plus the unchanged historical source manifests and seven excluded artifacts.
There is no self-referential commit hash in the manifest; the exact final head
is supplied by the GitHub handoff and the files at that head.

| Actual check | Result and attribution |
| --- | --- |
| Final Backend strict compile/full suite | Exit0; **610/610**. This includes preceding572 plus resolver29 and parser9. Prepared-reader30 is already inside572. |
| R-A Flutter feature/full suite | **141/141**, **459/459**; feature tests are included in the full count. Analysis clean, format5 files/0 changes. Later Backend-only work did not alter these inputs; no new Flutter run is claimed. |
| Android | Synthetic AI harness APK build passed. The first ordinary APK build failed due to cross-drive Kotlin incremental caches; both transcripts are retained. Compilation is not device/shared-entry/TalkBack/API24–25/UAT/Release verification. The APK hash is retained in the original manifest; the large generated binary is not a Git source artifact. |
| Query capability batch | Exit0, **16 reports**, own151 references removed. Collection-group pagination/full-reference deleted cursor and exact fixture coverage observed; CLI index validation does not establish Emulator/cloud index enforcement. Runtime digest was not embedded; owner binding and its limits are retained. |
| Guard initialization/epoch batch | Exit0, **16 reports**, own4 references removed; seven pre-start source digests matched. Finite observed schedules include both ABORTED10 then explicit close, and initialize/rotation both commit then current-epoch refusal. No commit ACK loss was injected. |
| Independent local review/probes | No remaining mandatory finding; path6 groups, retention170 BigInt scenarios and two runner negative-guard7 groups passed. These are separate local observations, not extra cases added to610 or JIN/LI approval. |

Previously failed regressions, the Backend571 intermediate checkpoint and the
author-reported first resolver28/29 result keep their original status. There is
no transcript for that first focused resolver attempt; publication does not
invent one. The old failing test/probe transcripts that do exist are included.

No implementation source was changed or functional test repeated solely for publication. Source hashes
are checked against the executed snapshots before staging. The publication
does not move #94 History489/device7 or other owners' accepted evidence onto
this source. The [device-notice follow-up](2026-10-13-zhou-device-notice-ra-followup.md)
retains that distinction and the current responsibility boundary.

## Review handoff

JIN reviews this exact delta; LI performs acceptance within the selected scope.
The formal review path and JIN's changed-source composition gate remain in
effect. Any integration result must name its actual combined source, environment
and executions. Until those conclusions arrive, this batch is published for
review and waiting; it is not full AI, Sprint, UAT or Release completion.
