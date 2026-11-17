# Check-in edit: unknown-result exit repair

Date: 17 November 2026. Baseline: installed v80, source `82a6658d`.
Status: source repair and focused regression passed; the final v83 unknown-update
exit and invalidated-detail recovery paths passed the bounded physical recheck
below. Unknown-delete and committed-write/response-loss cases remain unverified
on this phone. Original severity: **本轮应修**.

## Authority and observed defect

The [12 November usability repair decision](../../decisions/2026-11-12-li-usability-repairs.md)
explicitly approves repairing save-in-flight/unknown-outcome exit wording while
preserving unknown-result contracts. The
[current review decision](../../decisions/2026-11-17-li-stable-candidate-review.md)
authorizes minimal rooted core-task repairs and repeated final-APK verification.
No backend, write contract, data model or dependency change is selected.

The root reviewer physically edited a synthetic private record in v80, tapped
Save, and disabled Wi-Fi/mobile data about 150 ms later. The edit page reported
“The result could not be confirmed. Reload before trying again.”, offered Reload
saved record, and disabled Save/Delete. Back then displayed “Discard changes?
Your unsaved changes will be lost.” with Cancel/Discard. This presents an
already-dispatched, unknown-result operation as an ordinary unsaved draft.
It could incorrectly suggest that leaving abandons an operation that may have
already taken effect. This is a recovery/comprehension defect, not a visual
preference or observed duplicate write.

Private evidence retained outside the repository:
`v80-edit-cut-network.png`, `v80-edit-cut-back.png` in the audit's local private
evidence directory. No private record text, identity or raw device log is included
here. The root reviewer restored network access, explicitly reloaded the same
record, and observed the original saved note with no automatic replay. That
one readback establishes this trial's outcome only.

## Root cause and bounded repair

`CheckInEditPage` used only `pending` and local `_dirty` to choose its return
behavior. A generic failure retained the draft but reached the ordinary Discard
dialog. An unknown deletion with no dirty fields could leave without any
unknown-outcome explanation. The shared pending flag simply ignored Back.

The repair is confined to `check_in_edit_page.dart`:

- Generic failures already rendered as unconfirmed now use Leave/Keep editing
  and explain that leaving does not cancel the request or undo its effect.
  The copy directs the user to reload/read History before another change.
- The guard applies even when the local fields are clean, covering unknown
  deletion. Keep editing preserves the draft and mandatory readback lock.
- A pending operation still cannot be left through Back; it now displays a
  truthful request-in-progress message. This applies to the existing shared
  save/delete/read pending state without introducing cancellation.
- Ordinary unsaved drafts retain Cancel/Discard. Confirmed exits use a local
  allow-pop flag, with mounted/session checks and duplicate-dialog protection.

The controller, repository, expected revision, idempotency handling, mutation
receipts, session replacement behavior and saved data are unchanged.

## Regression evidence

Before production changes, the corrected bilingual widget fixture reproduced
four expected failures: unknown save and unknown delete each in English and
Chinese lacked the required exit explanation. A fifth test reproduced the
missing pending-Back feedback. Three prior edit tests passed. The first draft
of the fixture used an English-only Back finder; that fixture error was fixed
before recording this baseline.

After repair, **45 tests passed** across:

- `check_in_edit_flow_test.dart` (9 tests, including the five new failing-before
  cases, ordinary dirty-draft Cancel/Discard, preserved fields after Keep editing,
  disabled mutation controls until readback, exactly one dispatched request,
  and duplicate edit-route return notifications retaining a single dialog that
  one Keep editing tap dismisses);
- `check_in_pending_recovery_test.dart`;
- `check_in_from_record_flow_test.dart`;
- `content_coherence_test.dart`;
- `content_coherence_edges_test.dart`;
- `journal_language_flow_test.dart`.

Command: `fvm flutter test --no-pub` with those six files,
`--concurrency=2 --reporter expanded`. Focused `fvm dart analyze` of the two
changed files found no issues; `git diff --check` passed. Intermediate expanded
fixture runs had incorrect button/PopScope finders and an omitted frame pump;
these were test-only errors corrected before the recorded 45-test pass.
The duplicate-notification assertion does not require a real system Back on an
open dialog to keep it open: system Back may dismiss that dialog normally.
It does not explain the root reviewer's first unsuccessful physical Cancel tap;
that isolated interaction has no captured causal trace.

The UI review agent independently inspected the final production/test diff and
the passing log. It found no packaging-blocking issue: pending completion cannot
coincide with this unknown-result dialog, leaving does not call the controller,
clean-field unknown deletion is guarded, Keep editing retains the write lock,
and session/duplicate-dialog/ordinary-draft protections remain. Reviewed
production SHA-256: `b850a6451cebc66d85f644c3043597c4211a5860b82558cf0c2c7de5dd9149b2`.
This is a read-only source review, not v81 device acceptance.

Sanitized local test-log fingerprints (SHA-256):

| Log | SHA-256 |
| --- | --- |
| `edit-unknown-exit-before.log` | `e65c94da2ebd8c7d234c9ebdeae5981d0119066247a8a0ba642252d38a6a897e` |
| `edit-unknown-exit-regression.log` | `02154680bd2764a466f8f71f0cb7b6c28276557ee2bb2c887e596a0717aa10de` |
| `edit-unknown-exit-analyze.log` | `6b1bc44620cfa75577212b59517408cb804f74765eeaa6b00637adcd1d139116` |

These are fake-repository/widget tests, not a new APK or real-network acceptance
claim. They cover a returned unknown failure and delayed pending completion,
not Android process death or every server commit/response-loss timing. The
final replacement APK must repeat the interrupted edit, Keep editing/Leave,
explicit readback and no-duplicate checks before physical closure. The earlier
74-test read-only review did not exercise this unknown edit Back branch and
does not override the subsequent physical defect.

## v81 follow-up: leaving the editor exposed an invalidated blank detail page

This subsequent physical finding does not invalidate the bounded v80 wording
repair, but it prevents treating v81 as the final accepted package. Baseline:
v81 `683f0a1a`, APK SHA-256
`92f29670486115a8b3492a31ceed9f21d76372a759044db8c5129b3213f2f548`.
Priority: **本轮应修**. Replacement-package device recheck remains required.

The root reviewer repeated the synthetic private-record edit, then interrupted
network access after Save. The new unknown-outcome copy was correct and one
Keep editing tap worked. Back → Leave returned to Saved Check-in with only
Return Home: no record, loading panel, error or Reload. Private captures
`v81-edit-left-readback` at 19:23:51 SGT and `v81-edit-left-ready` at 19:23:57
record this state under the same process. Raw PNG/XML remain outside Git.
This report does not interpret those captures as evidence of lost saved data.

The rooted state chain is:

1. `afterContentMutation` correctly invalidates dependent content even when the
   edit result is unknown; `CheckInController` becomes `CommandIdle`.
2. Saved Check-in is covered by the editor, so its content-access listener
   correctly avoids reading an offscreen record.
3. Leaving the editor returns `null`. The Saved page only reread after the
   explicit `saved` result; it did nothing after this unknown-result exit.
4. Saved Check-in renders pending, succeeded and failed states, but no panel
   for Idle. The invalidated page therefore remained an empty recovery screen.

The minimum repair adds 15 lines to `check_in_page.dart`: capture the initiating
session and, on editor return, reread only if the session identity is unchanged,
the Saved route is current and its controller is Idle. It uses the existing
read/loading/error/Reload path. Existing success/deletion handling is unchanged;
it neither replays a write nor presents leaving as successful completion.
Ordinary discarded edits retain valid saved details without an extra read.
The existing controller still gates reads on foreground state. No controller,
API, request key, revision, content-invalidation or data rule changed.

The first two-page fixture required authentication to be resolved before opening
Saved Check-in, as the real router already does. After correcting that fixture,
the baseline had **3 expected failures and 10 passes**: unknown save with either
server commit outcome, and unknown deletion all lacked the post-return read.
All three failed at the expected read count (one observed, two required).

After the repair, **59 tests passed** across the six previous focused files plus
`test/app/check_in_history_shared_router_test.dart`. The edit file now has 14
tests. New continuous two-page cases establish:

- both committed and uncommitted unknown saves enter a pending fresh read;
- an offline read becomes the existing explicit error with Reload, then
  successful explicit retry displays the actual saved value without another
  update request or fabricated “updated” toast;
- an unknown deletion whose server result removed the record shows the
  existing unavailable/reload state, without a fabricated deletion receipt;
- ordinary local-draft discard does not reread still-valid details;
- a replacement same-UID session cannot reread the old record on editor return.

Changed-file static analysis and `git diff --check` passed. The independent UI
reviewer found no blocking source issue in the bounded diff and verified the
same-session/current-route/Idle conditions, existing pending/failed behavior and
the retained foreground guard. This remains source/widget evidence, not final
replacement-APK acceptance.

| Evidence | SHA-256 |
| --- | --- |
| `saved-edit-return-before.log` | `b4eb64180d23acfe078875a720b25d20072e7b078d8ff739fc4b6e6e62d2bfc4` |
| `saved-edit-return-regression.log` | `c937488cf3912a748a3f61db05ed8857ce082a96ed784f3c88d1e7f46ad43d52` |
| `saved-edit-return-analyze.log` | `9c67effb0ca9ff5c448b6abe62f73f52168717771979fcd6ec84d2ae9e01fc19` |
| Reviewed `check_in_page.dart` | `991d69b10827fe46aa9d6e10ccd2047f2224f41aa7ac4aad37166bbf90f6d7e9` |

The final APK must repeat the complete unknown edit → Keep editing → Leave →
Saved read/error → explicit Reload sequence and confirm the recorded data.
The earlier 45-test wording pass did not cover this parent-page return path;
it is retained as its original checkpoint, not whole-flow acceptance.

## v82 physical recheck: observed update-exit and blank-detail paths passed

This later checkpoint completes the previously pending physical recheck for
the observed SC-07 unknown-update exit and SC-10 blank-detail recovery paths.
It preserves the preceding v80/v81 failures and test-only checkpoints; it does
not establish whole-app readiness or every unknown-result outcome.

Version: v82 `1.0.0-rc20261117`, source
`e5cdb7bcca8b6fc35679badaad06638e0c77722d`, APK SHA-256
`9bd1e2a973c59962ed5fcd06b69c7ba5363118dabfaa915185ff16f56aa706ba`.
The root reviewer operated the retained-data physical installation against the
matching v78 backend. This subtask only read the existing private capture
metadata/XML and computed hashes; it performed no device operations.

Observed sequence on 17 November 2026 (SGT):

1. At **19:36:42**, the interrupted edit reported an unknown result. Back at
   **19:36:45** showed the new Leave/Keep editing explanation. One Keep editing
   tap returned to the draft by **19:36:48**. The before/after XML has the same
   draft value, with Save changes and Delete Check-in still disabled.
2. Back → Leave while still offline reached Saved Check-in by **19:36:58**.
   It displayed Check-in unavailable and Reload Check-in, rather than the v81
   empty page. Leaving did not present a successful update or cancellation.
3. The reviewer restored Wi-Fi/mobile data to **1/1** in the cleanup path and
   explicitly tapped Reload. At **19:37:10**, readback showed the original saved
   note: this particular interrupted edit had not committed. That observation
   is limited to this request; it does not imply unknown writes never commit.
4. A subsequent normal edit saved successfully. Pressing Back during the
   pending request produced “Please wait while this request completes.”.
   The **19:37:31** capture contains that feedback and the updated saved-detail
   value. History at **19:37:44** and Calendar at **19:37:47** agreed with one
   synthetic record; the observed update did not create a duplicate record.
5. The reviewer deleted only this task's synthetic private record. The final
   **19:38:38** Home capture accompanied the reported return to zero records
   today. Existing account data was retained. These ordinary cleanup deletion
   observations do not cover an interrupted/unknown deletion.

All listed capture metadata records the same app process during this sequence.
The reviewer checked the real saved values; this repository records neither
those private note strings nor account identifiers. The file hashes below bind
the original PNG/XML kept in the audit's private local directory.

| Private capture basename | PNG SHA-256 | XML SHA-256 |
| --- | --- | --- |
| `v82-edit-unknown` | `fc9e2934b9789bb694a28681a731dcf489e38790735cb4a314c8595c9f38d3fc` | `c659efa816912fcb4965678ddd8d044a361a5147641cd0d2bf39417d97864edb` |
| `v82-edit-unknown-back` | `9bb1c7094d811e052f78c3de5c537cc34d0cbd7674f270a15b1e51d9e4f27fef` | `ab71396812ea4a813dbcabfbdde301986326cf1289da0ad9771800571c1d853f` |
| `v82-edit-unknown-kept` | `fc9e2934b9789bb694a28681a731dcf489e38790735cb4a314c8595c9f38d3fc` | `c659efa816912fcb4965678ddd8d044a361a5147641cd0d2bf39417d97864edb` |
| `v82-left-offline` | `e1a3d692e955077a159c994b4fd7f2b7325aee841937f4b0444e43ffab4ba9fd` | `249b56cb35091d9009f708fe58b9ce0b55dcf77b8092d7a79aea02c6a03b3f40` |
| `v82-recovered-detail` | `e1fd3ec4baca501eb0054f34ea2337a580ccc9a9771467c12362a3dadcc04226` | `be778645d27dcd6a33434cf2c62897d1f6c13f531acfd23b297f4f3afa2c5e52` |
| `v82-edit-pending-back` | `889dff2f760821885fa00375bd068eab59221631cd48f8d84080f8c7acf16af3` | `f921792600857c9b2aa2eb213eae61cbcc85679f22dce63c43961dfa5dd8f600` |
| `v82-history-updated` | `f5a78090434712cf41d1d4369131bfcb233caa2767619d33b313f6c6db7f4a66` | `c220e6a1f102f6376e2af792a7c1016b7b8887e39551387a051baf1076494e84` |
| `v82-calendar` | `f9081cdbb400d7b302b75f7e8b3a55ae3b42b4d48d87425230e4f33c1f1360dd` | `cf3066d1459c7a2944637a57c0a272b37b390f68a9d75ca37959db5f1d75c7c0` |
| `v82-clean-home` | `98f9038ff490018cbb9725c7ee537b5ed08b322482033bdecaa96b6d217e13e7` | `cea6c734dbd2e8ee3d58677fcc6bc956c9aa8bc4f16091793af328e11dc4aa21` |

Remaining limits: **unknown deletion has not been physically exercised**;
committed-but-response-lost updates/deletions remain covered by fake-repository
tests, not this real-network trial. Android process loss, other devices, all
interruption timings and historical v79 Home resets are not closed by this
checkpoint. Overall release readiness remains governed by the main report.

## Final v83 physical recheck: same-package SC-07 and SC-10 paths passed

The final installed candidate was v83, source
`abc072adfdae57e4cdd0fd7c9de4b2bbfe21a445`, APK SHA-256
`7dd81dfdc2783a58cd6acfbf5d446000b1c35312364f25e5975d4160270fc9b8`,
against the matching v78 backend. This repeats the bounded update-exit and
returned-detail paths on the final artifact, rather than relying only on v82.

On17 November2026 SGT, the root reviewer created a synthetic private record
without GPS/weather, using two actual guarded Save taps. Saved detail and
History read back one record. At20:27:07 a later update, interrupted by disabling
network150ms after Save, showed an unknown result and locked both writes.
Back at20:27:10 displayed the corrected non-cancellation explanation; one Keep
editing action retained the same draft and disabled writes at20:27:15.

A subsequent Back → Leave was selected while disconnected. The20:27:24 capture
named `v83-left-offline` still shows the dialog transition. It is not counted as
a settled offline error-page observation. Network cleanup restored the original
Wi-Fi/mobile-data1/1 values with no errors. At20:27:27 and20:27:38, the returned
Saved Check-in page showed Check-in unavailable and Reload Check-in. Explicit
Reload at20:27:44 returned the original saved value: this specific update had
not committed. No second Save was selected during this recovery.

The normal update then succeeded. The20:28:10 screenshot shows the pending
Back feedback and updated detail; stable final detail was independently read
at20:28:20. History at20:28:36 and Calendar at20:28:33 agreed with one updated
record. Cleanup deleted only that synthetic record; History at20:29:10 showed
no records for the tested date, and Home at20:29:23 showed no saved records
today. The process ID stayed17953 across the recorded sequence.

This subtask independently compared draft/original/updated XML values, read
selected screenshots and verified hashes; it did not operate the device.
The sanitized20 capture-pair hashes and network restoration receipts are in
[the final physical sequence](physical-acceptance.md#final-v83-check-in-create-interrupted-edit-readback-and-cleanup).
No raw notes, account identifiers, screenshots or XML were copied into the
repository.

**Remaining physical limits:** unknown deletion and committed-but-response-lost
updates/deletions are still untested on the real service; their fake-repository
regressions remain a different evidence class. This checkpoint does not close
historical v79 Home resets, every interruption timing or overall release
readiness.
