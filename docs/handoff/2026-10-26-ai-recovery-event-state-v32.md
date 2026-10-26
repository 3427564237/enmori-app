# AI recovery and Event state candidate v32

**Physical acceptance found a remaining failure.** The first today-referenced
reply was displayed, but switching off then sending returned
`AI_CONTEXT_SELECTION_CONFLICT` (409), with no second reply. Input and reference
editing remained available. No automatic resend was attempted. LI subsequently
approved [off-mode history exclusion](../decisions/2026-10-26-li-reference-off-history-exclusion.md)
for the next v33 candidate. That correction is not contained in v32.

26 October 2026, Asia/Singapore. This supersedes the behavior and acceptance
instructions in the historical [v31 handoff](2026-10-26-reference-event-v31.md)
within [LI's recorded correction](../decisions/2026-10-26-li-v31-recovery-and-state-preservation.md).
It is part of [Draft PR #189](https://github.com/3427564237/enmori-app/pull/189),
based on the integration branch containing SHI #187. Independent review of the
new changes remains pending; earlier approval of SHI #187 does not cover them.

## Result

- The draft and the next reply's reference choices remain editable while a
  previous result is unresolved. Dispatch and retry guards remain separate.
  The two prominent Check result / Leave without retrying actions are replaced
  by at most three foreground outcome reads per target/view. These reads never
  send or regenerate. Back remains available. An independent new topic parks
  the original unresolved target guard in session memory; returning to that
  target restores it. It does not release a claim or copy/resend the old input.
- All entries use the same today/manual/off reference panel. Explicit changes
  to next-reply references survive late recovery of an earlier reply. Successful
  sourced replies can independently reread the saved transcript before display.
- An explicit chat send prepares the local model host before the existing
  generation budget. LI selected retaining the 30-minute idle release and
  accepting the initial wait. Model, context, generation limits and existing
  client 15/75/90-second limits remain. Cancellation, disposal or lost authority
  during preparation prevents later dispatch. A failed closed-control cleanup
  reports maintenance failure without freezing unrelated healthy chat; the
  original target's guard remains.
- Completed public Event list/detail/cover snapshots survive short background,
  website and child-route returns in the same session, within their original
  five-minute lifetime. Returns do not renew expiry. In-flight work is retired;
  expired/replacement-session data and private participation state are cleared.
- Event search progressively shows available loaded matches and offers Stop.
  It retains the query, partial rows and opaque cursor. A failed later page can
  be retried without restarting from page one. Loaded rows remain usable while
  later pages are loading. No provider search endpoint was added.
- The prominent cover/network implementation paragraph was removed. The source
  label and optional website/source information remain. Registration still
  requires the existing explicit Yes/No outcome; cancellation does not register.

The sourced-reply readback and stale-read fences reuse ZHOU's PR #188 source
`97be7bed3a991814ca9856339cde422d25c16983`; its eight regression cases are included
and the automatic-recovery expectation is adapted. This is source attribution,
not a claim that PR #188 was merged, approved or independently accepted.

## Source, checks and artifact

| Evidence | Result |
| --- | --- |
| Tested/built/deployed code | `44e44a2cc46f08c9f2eed47d3626cc156d469dda` |
| Source tree | `5b4bf1df4dc48c158683bc527a43cd5d1a282b97` |
| Flutter / Dart | 3.47.2 / 3.13.2, pinned FVM |
| Analyze | No issues found |
| Focused Flutter regressions | 274 passed in 20 files |
| Backend | Strict TypeScript build, runtime-entry syntax and 1534 tests passed; Node 24.19.0 |
| Signed release build | Pass; assembleRelease 109.9 seconds |
| Frozen build inputs | All 2187 tracked files, client/signing configuration and source head unchanged during build |
| File | `build/group-delivery-v32/ENMORI-group-v32-release.apk` |
| Package / version | `com.enmori.app.group`; code 32; name `1.0.0-group20261026` |
| Size | 66,939,034 bytes |
| APK SHA-256 | `b118df4d6ee68c5335eb3994847abfcf431e491eaf2cd547f34746a0a9f937c6` |
| Certificate SHA-256 | `0fa59aeaa9ce03a830405ce79136b4abc3d62510fbb8360c8ebf7c88a82966ee` |
| Upgrade identity | Same package, signer and nine permissions as verified v31; higher version |
| Manifest | Not debuggable; messaging auto-init and analytics collection disabled |

The shared Flutter/Gradle lock serialized checks and build. No API, Firestore
schema/index, dependency or lockfile change was introduced. These are focused
Flutter results, not a full-repository Flutter-suite claim. Earlier failing
regressions and subsequent fixes remain in private logs: draft/new-topic locks,
search cursor retry, fake-controller state initialization, and superseded
background/manual-recovery expectations. The final recorded runs are green;
overlapping earlier runs are not added to the totals above.

## Deployment and installed phone

The exact source above was archived into the existing controlled local Backend
service. Its compiled critical modules match the tested outputs. A normal
graceful restart completed at **18:29:36 SGT** with AI configured/available,
maintenance healthy, and no pending/unknown operation in the startup snapshot.
Auth-admin read, Firestore read and binding checks passed. This is a startup
snapshot, not ongoing proof of every operation. Worker and real push remain
unconfigured. No force kill, data reset, credential change or configuration
change was used. The old candidate and rollback configuration remain private.

A read-only metadata comparison across restart retained all ten existing
conversations and their forty messages, with selected conversation metadata
unchanged and zero open global operation fences. It did not read message bodies
or prove historical no-effect from absence.

At **18:36:07 SGT**, `adb install -r` successfully upgraded LI's reconnected phone
from v31 to v32. The installed APK hash exactly matches the artifact above;
first-install time remains `2026-10-21 12:13:08`. No application data was cleared.
Launcher smoke passed. The phone's existing authenticated session reached the
AI screen, with an empty draft before testing; no existing draft was overwritten.

Physical AI test results are recorded in the adjacent machine-readable evidence.
Tests use a new topic and short synthetic messages, without editing existing
Check-ins or conversation history. Longer acceptance, cold-after-idle behavior,
network interruption and Event website-return checks remain with LI.

The separate cached CLI refresh token had expired (`TOKEN_EXPIRED`), so the CLI
authenticated chat probe was Not Run. No credential reset or alternative
permission path was attempted; the physical phone uses its existing SDK session.
An earlier 57.9-second first request versus a later 1.34-second request is evidence
consistent with a cold start, not proof that all reported 503s had that cause.
The old coarse log also cannot prove that cleanup triggered the reported global
lock. Both relevant source paths are now covered without rewriting that history.

## Remaining source work and LI acceptance

**Actual Event introductions and alternative information-page links are still
incomplete.** The sampled source responses did not supply introductions; supplied
links can open seat selection. v32 does not fabricate text or infer a second URL.
JIN's [all-14-interest source package](../planning/2026-10-26-jin-all-interest-event-coverage.md)
is assigned in [Issue #84](https://github.com/3427564237/enmori-app/issues/84),
including the introduction/link gap. No completion or ETA is claimed.

LI's remaining physical checks:

1. After at least 30 minutes of model inactivity, send with today references on,
   allow the first-load wait, then turn references off and send again. Check for
   one reply per send, without needing a second send to recover the first.
2. Enter AI from a specific owned Check-in. In the same reference panel switch
   between today, off and manual records from two days; check draft/choice retention.
3. During slow or interrupted send, check that input/reference choices remain
   editable. Starting an independent topic must work without resending the old
   message; returning to the unresolved target must retain its protection.
4. Search Events, stop a long search and continue/retry as needed. Open a loaded
   result, tap booking then cancel, and return from its website within five minutes.
   The valid detail/list/search state should remain without a forced full reload.
5. Confirm removal of the cover implementation paragraph. Treat missing source
   introductions as the documented JIN gap, not a passed content-delivery check.

No independent review, full UAT, Release or Done claim is made. Raw logs, UI
dumps, account metadata, credentials and signing configuration stay outside Git.
See [machine-readable evidence](../evidence/2026-10-26-ai-recovery-event-state-v32.json).
