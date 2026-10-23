# Calendar repair and language persistence — connected-phone follow-up

Date: 24 October 2026, Asia/Singapore. LI reported “手机已接入” after the
[deployment report](2026-10-24-li-calendar-deploy-9b-diagnosis.md).
The [connected-phone decision](../../decisions/2026-10-24-li-calendar-deploy-9b-diagnosis.md#connected-phone-follow-up)
resumes these bounded checks while preserving existing data.

## Exact installed app and service

The connected V2405A retains `com.enmori.app.group`, version code **25**, version
name `1.0.0-group20261023`. Its installed APK SHA-256 remains
`e0ee6242f72774a43d1ab8dbe91089cb4f42dbe01d7c3bde0bbf4f15c5222f69`, matching
the earlier signed v25 artifact. Package version, first-install time,
last-update time and APK hash match before/after this follow-up. No installation,
uninstall, application-data clear or signout occurred. The v26 APK was not used.

The existing backend retains the deployed calendar-only commit
`7a3c4fa31b5bb609349a961a2e4e08aeb80c9036`. No service restart or configuration
change was needed during this phone session.

## Observed results

| Check | Actual result |
| --- | --- |
| English month statistics | The real app loads October successfully. All 31 UI day counts match the independent read-only Firestore reference. Recorded days are 21 October: 4, 22 October: 3, 23 October: 1; remaining days are zero. The previous calendar-unavailable error does not appear. |
| Calendar → History | Selecting 21 October and choosing “Read this date in History” opens that date with four records. |
| Record and return | Opening an existing saved record and returning preserves 21 October in History. No edit action is used. |
| Recorded-day navigation | “Later day” moves 21 → 22 → 23 October. It is disabled at the final recorded date. “Earlier day” returns 23 → 22; it is disabled at the first recorded date, 21 October. |
| Chinese persistence | English → 简体中文 takes effect immediately. `am force-stop` followed by a fresh launch changes the app PID. Home and Settings remain Chinese, and Settings still selects 简体中文. |
| Fresh Chinese month load | After that process restart, the Chinese month calendar loads successfully and all 31 counts again match the reference. The inspected native screenshot shows readable Chinese headings, weekday labels and day counts. |
| English restoration and persistence | Chinese → English restores the original language. A second force-stop/fresh launch changes the PID again; Home and Settings remain English and the language selector remains English. The app is left on Home in English. |

The phone retains its existing authenticated account. Successful fresh calendar
loading after process restart exercises the actual device/client/protected API
path. This supplies the phone evidence missing from the earlier read-only
deployment check. The separate cached CLI login remains invalid; no credential
was extracted from the phone and no new login or custom token was created.

## Data preservation and remaining limits

Independent read-only snapshots before/after the phone session again match all
**88 scoped document contents**, with no missing, added or changed documents.
The scope includes the account/binding, recursive account subcollections,
Check-ins and participation records, including existing Personas, conversations,
messages and message source/effect records. No Check-in, Persona, participation
or conversation was created or edited. Settings' account/privacy Save action was
not used; only the device-local interface-language selection changed and was
restored.

This closes the previously failing calendar count and recorded-day flows for
the named installed app and deployed backend. “Restart” means application
process termination and fresh launch, **not a whole-phone power cycle**. It is
not full UAT, v26 verification, cross-account testing or Release acceptance.

AI small-plan relevance remains unresolved as recorded in the deployment report.
This follow-up did not send another AI message, retry a historical operation or
change model configuration. The earlier real-chat history and failed examples
remain unchanged.

Raw screenshots/XML, navigation assertions, restart PID observations, package
metadata, hash snapshots and safe summaries are retained only under the private
directory `~/.local/state/enmori-calendar-device-20261024/`. They are not added to
Git or published. The public report contains no account identifier, credential
or private record content.
