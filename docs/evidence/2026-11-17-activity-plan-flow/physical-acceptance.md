# Final v79 physical acceptance continuation

Authority: [LI's same-day continuation](../../decisions/2026-11-17-li-activity-plan-flow.md#same-day-continuation-physical-acceptance-and-branch-push).
Date: 17 November 2026, Asia/Singapore.
Device: V2405A, existing signed-in release application.
Implementation: `2925a7fc`; package `com.enmori.app.group`, version 79,
`1.0.0-plans20261117`. The installed APK's SHA-256 matched the final delivered
APK recorded in [verification.json](verification.json). No installation,
uninstall, data clear, sign-out or backend deployment was performed in this
continuation. No application code changed during acceptance.

These observations were made through the actual Android UI using ADB input,
UIAutomator snapshots and screenshots. They are physical release-app evidence,
separate from the earlier 1,930 passing Flutter tests. A debug/instrumentation
APK was not substituted. Local private captures are indexed by hashes in
[physical-acceptance.json](physical-acceptance.json); screenshots, account
identifiers and device serials are excluded from the repository.

## Results

| Requested check | Observation | Result and scope |
| --- | --- | --- |
| Real interest matching | The initial saved selection produced a Music-labelled Ticketmaster recommendation. Saving the temporary Dance/Food selection changed the summary and returned onePA line/cardio dance activities labelled `Matches: Dance`, and the Cheng San cooking demonstration labelled `Matches: Food`. The next group could be opened. The original selection was saved again and read back in the final summary. | Passed for these real positive samples and editor return. This does not establish complete catalogue coverage or ranking accuracy. |
| Plan round trip | An existing Interested YOASOBI Singapore plan displayed Sat, Feb 20, 7:00 PM SGT and National Stadium. Its loaded detail placed Interested/Going with the summary before the cover. Changing it to Going, returning, selecting Going and reopening found the same event and source metadata. The original Interested filter remained selected on the first return, correctly showing zero matches; the Going count increased from 2 to 3. | Passed for an existing saved record, including confirmed status change and reread. Earlier detail reads failed twice; a later visit loaded successfully. Other older source-unavailable cards retained participation with an explicit unavailable-details fallback. |
| Hide and immediate Undo | From that existing event's detail, Ignore recommendation produced both the hidden status and the Undo snackbar. Undo was tapped while visible. The menu then offered Ignore recommendation again, and the later refreshed plan list had zero hidden records. Interested remained selected. | Passed for the physical detail entry point. Recommendation-card disposal and stale/uncertain callbacks remain covered by the earlier widget tests, not by a separate physical card-removal trial. |
| Background/foreground | Android Home and recent tasks were used from recommendations and again from My plans. The first return kept the Events tab and saved conditions, but a recommendation read failed; explicit Retry recovered Dance recommendations. The second return kept My plans and its Interested filter, loaded all records and restored the original counts. | Passed with a recovery qualification. The recommendation return was not seamless. Process death, reboot and arbitrary duration/background policies were not exercised. |
| Network interruption and recovery | With original Wi-Fi off/mobile data on, mobile data was briefly disabled. Opening the interest editor showed a retryable unavailable-service error. Data was re-enabled in a `finally` cleanup. In a continuous repeat, Retry successfully loaded the previously saved Dance/Food selection. Final network reads were Wi-Fi 0/mobile data 1. | Passed for a real offline read and explicit retry after reconnection. Interrupted participation writes or unknown commit outcomes were not physically submitted. |

## Retention and restoration

- All 9 pre-existing plan records remained. Final server-backed UI counts were
  Interested 1, Going 2, no current participation 6, hidden 0, matching the
  initial counts. No test plan record was added or deleted.
- The original three interests were saved again and confirmed by the final
  conditions summary. The activity area was unchanged.
- The tested plan's status and hidden flag were restored. Real save/restore
  actions advanced its revision/update timestamp; this was not a byte-for-byte
  rollback of history.
- The signed-in account was retained. Wi-Fi and mobile-data settings were
  restored to their original values. No existing app data was cleared.

## Exceptions and limits retained in the record

The first two attempts to read the existing event detail showed a temporary
service error. A subsequent visit succeeded. The first background return also
showed a temporary recommendation error and recovered through Retry. Several
older plan cards had no currently available source details. These observations
do not establish which upstream service or cache caused the failures.

Recommendations explicitly reported incomplete onePA interest searches, and
one intermediate Home capture reported onePA unavailable. Positive matches are
not evidence of complete coverage. The original-interest summary was
available while recommendations waited for event sources; the final capture
then showed a Music-labelled Ticketmaster recommendation and the incomplete
onePA notice.

Two automation commands were rejected because automatic permission review
timed out before execution. Each was retried once. On the next capture after
these long pauses, the UI was Home instead of the previously observed interest
editor, so those interrupted continuations were not counted as successful
editor recovery. The cause of that route change was not isolated. The later
continuous offline/reconnect/retry sequence and explicit My plans background
cycle provide the bounded successful observations above; they do not rule out
an intermittent route reset during longer waits.

No full UAT, exhaustive interest/category validation, complete event-source
coverage or long-term service stability is claimed. Admin onePA warm-up status
remains outside this increment.
