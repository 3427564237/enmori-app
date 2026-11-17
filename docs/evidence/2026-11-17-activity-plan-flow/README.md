# Activity → plan → return, v79

Authority: [LI's three selected improvements](../../decisions/2026-11-17-li-activity-plan-flow.md).
Base: v78 `d544ce6c`. Client implementation: `2925a7f`.

The later [physical acceptance continuation](physical-acceptance.md) records
the five checks requested after LI confirmed the installed final v79. It
supersedes the earlier **not run** status only for those bounded observations;
the packaging history and earlier receipt below are retained.

## Delivered behavior

- My plans shows source-authorized Singapore event time/range and venue, using
  the same read and expiry as the title. Plan-update time remains separately
  labelled. Missing source data does not erase saved participation or invent
  details. Refresh rereads details; route return preserves loaded participation
  pages, filters and their bounded scroll.
- Interested/Going is beside time and venue, before the cover and long
  description on the real participation detail. Existing official registration
  disclosure and participant access remain intact.
- Home, Events / For you and standalone recommendations show saved interests
  with direct editing and the existing activity-area control. The summary reads
  saved data, not the editor draft; failure has an explicit manual retry. Initial
  recommendation positioning leaves the summary visible. Next group and
  retained event-ID positioning remain available.
- A confirmed Ignore offers an eight-second Undo. Undo survives the removed
  card, clears ignored using the confirmed revision, and preserves plan status.
  Session/revision changes reject stale callbacks. Unknown results are not
  automatically resent; the existing My plans / Hidden recovery path remains.

No backend/API/schema/ranking/provider/dependency change or deployment was made.
Admin onePA warm-up state remains outside this increment.

## Verification

- Static analysis: no issues.
- Focused regression: **93 passed**.
- Full Flutter suite: **1,930 passed**, including **13 new flow tests**.
- New cases cover shared detail reads, unavailable details, summary placement,
  hide/undo after card disposal, uncertain Undo without replay, same-subject
  session replacement, saved interest editor return, read failure and foreground
  refresh, English/Chinese, 375dp, 320dp with 2x text, landscape, dark appearance
  and reduced motion. These are synthetic widget observations.
- Initial failures exposed page-reset on return and FutureProvider exception
  retry; both were repaired before final validation. One new test was corrected
  to use the existing explicit Done action after saving. An initial command
  named a nonexistent test file; the final run uses the actual participation
  test files. Initial failure logs remain under `/tmp/enmori-v79-*`.
- APK package/version, non-debuggable state, signing certificate and compiled
  Azure URL were verified. Dependency manifests are unchanged.

See [machine-readable receipt](verification.json) for artifact/log hashes.
The intended physical return/background/network scenarios follow the
[Android core app quality guidance](https://developer.android.com/docs/quality-guidelines/core-app-quality);
that guidance is not evidence that this build passed them.

## Packaging correction and observed phone state

The first no-pub release build retained a test-generated plugin registrant and
failed Java compilation. A normal release build regenerated it successfully.
That first candidate used the obsolete local service configuration from
`tool/remote_group.md`. It was installed with retained data, but startup could
not connect. This candidate is superseded and is not the delivered APK.

The final build uses the existing approved Azure/OpenAI/companion configuration
from the v65 operating baseline. Its compiled HTTPS endpoint was checked, and
the obsolete full local URL was absent. The download artifact was replaced with
this final build.

The second `adb install -r` command reported
`INSTALL_FAILED_ABORTED: User rejected permissions`. A read-only investigation
found a later device update time and pulled the installed base APK: its SHA-256
**exactly matches the final delivered APK**. The device then showed the signed-in
Home screen and new saved-interest/area summary, with the original three interest
choices. The command result and observed final installation disagree; installed
byte comparison is the final-state evidence.

After the rejection report, LI selected “先不安装，只保留安装包”. At that
checkpoint, no subsequent installation attempt or interactive phone test was
made. No uninstall, data clear or sign-out was performed. No interest or
participation mutation was
deliberately submitted during phone observations; networking was not changed.
Account identifiers and raw private phone screens are excluded here.

## Earlier physical acceptance checkpoint (superseded for the named checks)

Only retained launch, installed APK identity, and Home conditions summary were
observed on the V2405A at the earlier checkpoint. Actual interest
change/matching, plan save/reopen, hide/undo, navigation return,
background/foreground and interrupted-network recovery on the final APK were
**not run** at that point. Home reported incomplete onePA interest searches;
this is not full-catalogue acceptance. No full UAT, notification, AI-generation
or long-term service claim is made.
