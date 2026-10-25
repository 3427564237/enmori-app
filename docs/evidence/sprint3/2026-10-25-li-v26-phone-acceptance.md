# v26 phone update and bounded acceptance

Date: 25 October 2026, Asia/Singapore. The
[LI decision](../../decisions/2026-10-25-li-v26-phone-acceptance.md) authorizes a
same-package update, existing-data preservation and the named native flows while
deferring AI small-plan relevance. This is a follow-up to the
[v26 candidate record](2026-10-24-li-group-v26.md), whose build-time device gate
remains part of the history.

## Installed artifact and runtime

The connected V2405A was updated from v25 to **v26**, using the existing signed
release APK and a normal `adb install -r`. Installation returned `Success`.
The installed APK was pulled back and hashed; it exactly matches the candidate.

| Field | Verified value |
| --- | --- |
| Package | `com.enmori.app.group` |
| Version code / name | `26` / `1.0.0-group20261024` |
| Product source | `1cc55bf234a6180eb1657135ee92b4ff65860c7d` |
| APK SHA-256 | `0ac3c6dfbcb1a277bfc5265f12bbeb56d584dcfb87308e83142fe718c45829ea` |
| Certificate SHA-256 | `0fa59aeaa9ce03a830405ce79136b4abc3d62510fbb8360c8ebf7c88a82966ee` |
| Signer compatibility | Candidate and APK pulled from installed v25 both verified; certificate matched |
| First-install time | `2026-10-21 12:13:08`, unchanged after replacement |
| Last-update time | `2026-10-25 12:59:49` |

The existing authenticated account remained signed in. No uninstall, app-data
clear, account reset or credential change occurred. This run did not rebuild or
instrument the candidate.

The existing backend remained active at calendar deployment commit
`7a3c4fa31b5bb609349a961a2e4e08aeb80c9036`. No service restart, deployment or
model/configuration change occurred. The candidate record's earlier
"not deployed" statement describes its build-time state; the
[24 October deployment](2026-10-24-li-calendar-deploy-9b-diagnosis.md) and
[v25 phone follow-up](2026-10-24-li-calendar-phone-follow-up.md) record the
subsequent calendar deployment and previous-device evidence.

## Native observations

These checks used the installed release app, ADB native UI snapshots and the
existing authenticated phone session. They are distinct from source/widget tests.

| Flow | Observed result |
| --- | --- |
| Saved Check-in → new draft | Opened an existing 23 October record and selected **Start a new draft**. Note, Mood and Activity matched the source. The new composer disclosed **Private · No GPS · Weather off**. Replaced only the draft note with clearly marked synthetic v26 acceptance text and pressed Save once. The app confirmed the new Check-in. |
| Home today → detail → return | Home displayed the new 25 October Check-in. Opening it showed the saved synthetic note, copied Mood/Activity and a new timestamp. Returning displayed it again. The same record was present after application restarts. |
| Existing source record | Reopened the original record in Chinese later in the session. Its original note, Mood, Activity and timestamp remained present. Returning preserved the selected History date. Final document hashes independently confirmed no modification. |
| AI conversation search | Loaded an existing conversation. An absent phrase produced the explicit no-match state; an existing synthetic marker produced **3 matching messages**. Opened a result, viewed nearby context and selected **Next message**. The transcript had no earlier page, so earlier-page loading was unavailable. |
| AI draft and background return | Entered a clearly marked unsent test draft into an initially empty composer. Returning from search preserved its exact text. Backgrounding the app and reopening it with the same PID also preserved it. Cleared this test draft after verification; no send, small-plan, retry, new-conversation or model-generation action was used. |
| Visible user's plan comparison | **Not Run.** My Friends was empty and Discover reported no current recommendations. No existing visible user was available through those entries. No friendship or sharing change was made to manufacture coverage. |
| Chinese after app restart | English → 简体中文 applied immediately. Force-stop left no app process; fresh launch used a different PID. Home and Settings remained Chinese, and Settings selected 简体中文. |
| English after app restart | Restored English and repeated force-stop/fresh launch. PID changed again. Home and Settings remained English, and Settings selected English. The app was left on Home in English. |
| Calendar statistics | Fresh Chinese and English month views after their respective process restarts each matched all **31** independently calculated October day counts: 21st = 4, 22nd = 3, 23rd = 1, 25th = 1, all other dates = 0. Screenshots were also inspected for readable labels and layout. |
| Calendar and recorded-day navigation | Selected 23 October in the calendar and opened that day in History. Next recorded day advanced to 25 October, skipping the empty 24th; next was then disabled. Previous returned to the 23rd. Opening an old detail and returning retained that date. |

The app remained usable through keyboard entry/dismissal, search scrolling,
background return and process restarts. No fatal crash marker appeared in the
crash-buffer entries attributed to this run's observed app PIDs. This is bounded
interaction evidence, not a performance, accessibility or comprehensive
stability certification.

## Data preservation

Read-only snapshots compare document contents using canonical hashes. The scope
is the existing account/binding, recursive account subcollections, owned
Check-ins and own participation records, including Personas, conversations,
messages and their source/effect records.

| Comparison | Existing documents modified | Existing documents removed | Added documents |
| --- | ---: | ---: | ---: |
| Before → immediately after installation, 88 → 88 | 0 | 0 | 0 |
| Before → after new Check-in, 88 → 89 | 0 | 0 | 1 Check-in |
| Before → final acceptance readback, 88 → 89 | 0 | 0 | Same 1 Check-in |

The added document belongs to the existing account, contains the exact synthetic
test note, has a new 25 October timestamp, is private and contains no location,
place label or weather. It is intentionally retained as the acceptance record.
The original **88 documents all remain unchanged**. Conversation/message counts
and contents remain unchanged. This scoped count does not include the backend's
normal Check-in-create idempotency bookkeeping or service/provider caches.

The Admin readback also exercised the deployed calendar application/query chain
and compared it with independent date grouping; all 31 counts matched. This is
not an authenticated CLI HTTP check: the previous cached CLI refresh remains
unavailable. The phone's fresh month loads exercise the actual authenticated
device/client/API path. No token was extracted from the phone, and an
unauthenticated calendar HTTP request still returned 401.

## Remaining scope and evidence handling

- AI small-plan relevance remains deferred and unresolved. Historical failed
  examples and the current model configuration were retained. This run makes no
  new real-generation quality claim.
- Plan comparison still needs a currently visible participant for native
  acceptance. Earlier-message pagination needs a conversation with another page.
- Restart here means application process termination and fresh launch, not a
  whole-phone reboot. Cross-account/cross-network testing, TalkBack, iOS and full
  UAT/Release/Done are outside this run. No main merge or publication occurred.

Raw APK readbacks, document hashes, native XML/screenshots, restart observations
and assertion summaries are kept only in the owner-only local directory
`~/.local/state/enmori-v26-phone-20261025/`. No account identifier, private record
text, credential or raw screenshot is added to Git. Native text replacement
initially required correcting the automation's selection method; the unsaved
draft was verified against the exact synthetic text before its single Save.
Keyboard-covered navigation was retried only after dismissing the keyboard and
observing the live UI. Neither automation adjustment changed product code.
