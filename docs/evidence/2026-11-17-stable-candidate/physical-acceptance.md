# Physical-phone evidence — stable candidate review

17 November 2026, Asia/Singapore. Device V2405A, Android 17,
1260×2800 at density 560 (360×800dp), original font scale 1.0.
ADB UI input, UIAutomator and screenshots operate the actual signed release app;
no debug/instrumentation app or fixture backend is substituted.
Private captures and device logs remain outside Git.

## v79 baseline and interrupted checkpoint

Installed v79 identity and byte hash are recorded in the main receipt. On initial
launch vivo's duplicate-app chooser was shown; the original application was
selected. The chooser was not an ENMORI crash. The resumed app had a retained
signed-in account and existing friends/profile data.

Observed v79 surfaces: Home, interest editor, AI new-topic entry, profile,
settings/privacy, discovery list→discovery card→profile→return, Friends Activity,
Events loading→leave, and My plans. These observations do not constitute an
end-to-end save or model-generation pass.

- **Avatar defect confirmed physically:** discovery-card placeholder bounds
  `[70,413][1190,553]` = 1120×140px = **320×40dp**, an 8:1 horizontal oval.
  Its expected specified size was 40×40dp. The 375dp fixture separately measured
  335×40dp; those measurements are not interchangeable. Buttons remained visible.
- A short screen-off/on observation (approximately37 seconds) retained the
  interest route. It did not exercise process death or a prolonged lock.
- At18:22:40, a temporary unsaved Books selection was left in the editor before
  screen-off. At18:27:58 another app was in use, so that controlled trial was
  interrupted and not counted as a pass. The unrelated capture was removed.
- LI initially deferred phone acceptance, then confirmed the phone was connected
  and resumed the task. At18:37:10 the same PID5807 and unsaved four-choice draft
  were visible again. This is a bounded retained-draft observation across that
  mixed interval, not a clean five-minute lock test or proof of the historical
  route-reset cause. The draft was discarded through the actual confirmation;
  no interest save was sent.
- At18:42:09 My plans read **9 records: Interested1, Going2, no current
  participation6, hidden0**, with all available records loaded. These are the
  restoration baseline for any later temporary participation test.

Original Wi-Fi and mobile data were both enabled; system night mode was4
(`sleep`), animation scales1.0, UI languageEnglish. Current cloud-AI and optional
processing consent were already enabled; the audit did not enable them.

## Intermediate v80 physical observations

v80 `1.0.0-rc20261117` installed with `adb install -r` at 18:48 SGT;
the original signature/package were retained. Installer success and pulled
APK hash both matched `3f6cecd324efd584c745f1ac010d23c8586e0014150dd39bbc4a2395d588f7ab`.
PID after installation was 4624. This build became an intermediate candidate
when the edit-exit defect below was found; it must not stand in for final-v83
regression.

- Retained signed-in Home, original interests and existing friend identities were
  present. Home explicitly reported onePA unavailable without suppressing the
  saved-interest summary or the other navigation.
- Discover → discovery card → profile → Back reached the same Discover tab.
  The actual placeholder avatar was circular rather than horizontally stretched.
  A separate visual reviewer checked both list and card screenshots.
- Friends Activity, filtered to Created a Check-in, loaded an existing authorized
  item. View Profile opened the actual friend's profile with authorized
  information and truthful empty interest/event sections. Back retained the
  Activity tab and Created-a-Check-in filter while rereading content.
- Created one clearly marked **private** synthetic Check-in, without GPS/weather;
  account-level defaults were unchanged. Keyboard input was visible, Back asked
  about the unsaved draft, Keep editing retained it. Two rapid Save taps followed
  by Back showed that the request might still complete; staying produced a saved
  receipt. History showed exactly one test record; owned detail reread matched it.
- Editing that test record, then disabling Wi-Fi/data approximately 150ms after
  Save, produced an unconfirmed-outcome state requiring Reload. Save/delete were
  disabled. Back incorrectly offered ordinary Discard copy, suggesting only local
  draft loss. This is **SC-07**, a real usability defect requiring the next build.
- Wi-Fi/data were restored to their original `1/1` values in a `finally` cleanup.
  After a separate user-interaction interruption, Reload saved record explicitly
  replaced the draft with the original server value: the attempted edit had not
  committed. No automatic replay or duplicate record was observed.
- Only the synthetic test record was deleted through the UI. History again showed
  no records for today; Home also showed no saved Check-ins today. Existing records
  were not deleted. Create/delete audit history is not a byte-for-byte rollback.

A second phone-use interruption was detected before capturing another app.
One input had already been issued from the preceding ENMORI coordinates; its
cross-app effect was not established, and no further interaction with that app
was made. LI then explicitly confirmed “我暂时不使用手机，请继续验收”.
The local harness now checks that ENMORI is foreground before each input and
capture. No screenshot/account details from another app enter this evidence.

A cleanup-path observation required an extra Back through History before the old
saved receipt. The receipt had cleared the deleted note/time. Its exact cause
was not established by this observation; source review is separate from any
claim about the specific phone event.

## Intermediate v81 installation checkpoint

v81 was built from `683f0a1a41d20936ffcf524ab5cdbb436bb5bbca`, after
1,973 passing Flutter tests and clean analysis. Its signed release SHA-256 is
`92f29670486115a8b3492a31ceed9f21d76372a759044db8c5129b3213f2f548`.
The first `adb install -r` attempt at about19:15 encountered the device's ordinary
lock screen, then returned
`INSTALL_FAILED_ABORTED: User rejected permissions`. This is the installer's
reported result, not evidence that LI deliberately rejected the upgrade. No
credential or device lock was bypassed. Normal unlocking was requested; the
failed attempt log is retained separately. v80 remained installed at this
checkpoint. Final-v81 observations will be appended only after actual upgrade.

After ordinary unlocking, a second retained-data installation succeeded at19:21.
The installer showed ENMORI and the intended version; its Continue installation
action completed normally. The pulled installed APK exactly matched v81's hash.
The original signed-in account, interests and existing social data remained.
New PID30489 identifies this installation's bounded trials.

- v81 Home→New Check-in: a synthetic RC81 note was explicitly set Private,
  with no GPS/weather. Keyboard text remained visible; Save was reached after
  dismissing the keyboard. The account default remained Public.
- Two rapid Save taps followed by Back produced the truthful save-may-complete
  exit dialog. Keep editing led to the saved receipt; History showed exactly one
  RC81 record, and owned detail readback matched the note and Private setting.
  Evidence: `v81-create-save-back`, `v81-create-saved`, `v81-history-one`,
  `v81-record-detail`, captured19:22:27–19:22:52.

- At19:23:25, cutting Wi-Fi/data about150ms after the RC81 edit Save
  produced unknown outcome and disabled Save/Delete. Back now displayed the
  correct non-cancellation explanation. One Keep editing retained the draft
  and lock; Back→Leave exercised the second path. Both networks were restored
  to1/1 by the test harness. `v81-edit-cut-*`, `v81-edit-kept`.
- **New SC-10:** after Leave, Saved Check-in displayed only Return Home, with
  no content/loading/error/Reload, observed19:23:51 and19:23:57. This makes v81
  an intermediate candidate. Back→History→the same record read the original
  server note at19:24:31, so this trial's edit did not commit. Source diagnosis
  and the subsequent bounded repair are in `edit-unknown-exit-review.md`.
- Only the synthetic RC81 record was deleted through UI; History and Home
  returned to no Check-ins today at19:24:55/19:25:10. Returning once from History
  reached the old saved receipt with cleared content; no duplicate History hop
  was observed in this v81 cleanup.
- For you loading→Stop waiting showed an explicit paused state and Reload;
  Reload resumed loading, and switching to Friends remained possible.
  Discover and discovery-card placeholder avatars retained normal circular
  geometry. Opening the profile then issuing two Back actions reached outside
  the app: the first returns directly to Discover, the next exits the root.
  The guarded harness stopped; relaunch returned Home in the same PID. This is
  not an unexplained spontaneous route reset.
- **AI:** a new synthetic RC81 topic was sent with Check-in references explicitly
  off. At19:27:17 the request was pending; Home→AI retained the same pending
  operation. A source/reading-status check reported unavailable while the model
  request was still pending. By19:28:03, one user message and one AI `OK` were
  displayed as saved. These capture bounds are not exact request latency.
  Explicit Check reading status removed its error; History scrolling found the
  new topic around the ninth row, and reopening at19:29:05 read back the same
  two messages. Only this synthetic topic was deleted; the UI confirmed deletion
  at19:29:57. New topic restored today's automatic Check-in-reference default
  at19:30:06. Existing conversation content was not modified.
- History's non-chronological ordering follows the approved stable document-ID
  order and privacy-limited ID/time contract; latest-first or cross-topic previews
  would need a separate decision. Finding the item by scrolling does not test
  API pagination. The usability limitation is recorded separately.

## Intermediate v82 same-package acceptance

Installed with retained data at about19:34 SGT. Source
`e5cdb7bcca8b6fc35679badaad06638e0c77722d`; pulled installed APK matched
`9bd1e2a973c59962ed5fcd06b69c7ba5363118dabfaa915185ff16f56aa706ba`.
The observed process was PID17380. 1,978 Flutter tests, clean analysis and release
build preceded installation; the matching unchanged backend remains v78.

### Check-in create, interrupt, recover, update and delete

At19:35 a clearly marked RC82 synthetic note was explicitly set Private, with
no GPS/weather. Two rapid Save taps followed by Back showed the save-may-complete
dialog; Keep editing produced one receipt and exactly one History item. Owned
detail matched. Keyboard input and Save after keyboard dismissal were usable.

At19:36:42, Save then approximately150ms network cut produced unknown outcome,
with Save/Delete disabled. Back showed the new non-cancellation explanation;
Keep editing retained the unsaved change and lock. Back→Leave while still offline
now showed **Check-in unavailable + Reload Check-in**, not an empty detail page
(`v82-left-offline`,19:36:58). Wi-Fi/data were restored to1/1 in finally. Explicit
Reload at19:37:10 read the original server note: this interrupted edit had not
committed and was not replayed automatically.

A new deliberate online edit then saved the Confirmed suffix. Back during the
pending interval showed “Please wait while this request completes”; detail,
History and the actual month Calendar each read the updated single record.
This closes the exercised unknown-save exit and invalidated-detail recovery
branches of SC-07/SC-10 on v82. Unknown deletion, server-commit/response-loss
and Android process-death timing remain automated-only or unverified physically.

Only this synthetic record was deleted. UI confirmed deletion and Home showed
no saved Check-ins today at19:38:38. Existing records were not removed.

### Friends and profiles

Discover loaded a real suggestion; discovery card→profile→Back returned the
Discover tab and a fresh loading state. Placeholder avatars remained circular.
Friends Activity with Created a Check-in displayed an existing authorized item;
View Profile showed that friend's allowed fields and truthful empty sections.
Back retained Activity and the Created filter. Going to an event showed an
explicit empty state. The filter was restored to All. No friend request/message
was sent. Two independent real-profile reads and synthetic-photo-free visual
review do not establish actual image upload/decoding or all Activity types.

### AI and History

One RC82 synthetic message was sent with Check-in references explicitly off.
The app could switch to Events while this operation was pending. At19:42:11,
returning AI showed exactly one user message and one AI `OK`, both saved, alongside
a separate source/reading-status error and a saved-conversation read in progress.
By19:42:39, the error and its Check reading status button had disappeared through
existing automatic recovery, before the harness could tap it. Do not describe
that as a successful explicit retry. The v81 equivalent required an explicit
retry; this repeated independent-read warning remains a reliability observation.
A preserved old failure can remain visible while a fresh read starts, so repeated
warning display must not be counted as repeated HTTP failures. No request-stage
trace isolates its cause.

History first page was loaded, scrolled, and **Load more conversations** was
actually selected. The new RC82 topic appeared on the second page; reopening
at19:43:53 read the same two saved messages. Only the synthetic topic was deleted;
UI confirmed deletion at19:44:36. New topic restored automatic-today references
at19:44:41. No scheduled follow-up or notification was created. Saved-message
readback is bounded evidence, not a long-term AI availability claim.

### Activity recovery, recommendation-card Undo and plan retention

v82 For you could Stop waiting and explicitly Reload. A controlled Wi-Fi/data
cut produced Event recommendations unavailable with Retry at19:45:58 and
19:46:09. After finally restoring1/1, Retry returned real Ticketmaster cards
with an explicit **onePA temporarily unavailable** warning. Earlier v82 Home
and For you also displayed **incomplete onePA interest-search coverage**. These
are different approved states; neither is reported as a complete source range.

The retained Interested event A plan was found as a recommendation card. An
initial Ignore attempt after more than five minutes caused a recommendation
reload, but no success/Undo was captured; full My plans readback still showed
9 records, Interested1/Going2/none6/hidden0. That is **not confirmed hide success**
and not proof of a broken success-Undo path. Expiry/menu lifetime is a possible
source mechanism, not a captured causal trace.

A new read completed at19:53:28. Within about a minute, the same existing card's
menu was used again. At19:54:37, the original card was unmounted and the page
showed **Hidden from recommendations + Undo**. The harness immediately tapped
the visible Undo; at19:54:44 the page confirmed **Recommendation restored**.
The timing receipt and before/after captures are private `v82-fresh-card-*`.

At19:55:46, My plans reread all9 records with original counts and hidden0.
Filtering Interested showed the same existing event A and its original metadata,
retaining Interested; detail also loaded that metadata. Back preserved
the Interested filter. It was then reset to All records. No plan was added or
deleted. Revision/update time changed through the authorized hide/restore; this
is logical-state restoration, not byte-for-byte rollback. The original card's
immediate visual reappearance was not observed; the verified result is restored
ignored status and retained participation, plus subsequent plan readback.

A separate complete-page widget diagnostic reproduced hidden-operation failure
feedback disappearing with the reloaded card. That is being repaired for v83;
it does not establish why the first v82 attempt did not produce a write receipt.

### Language and enlarged text (intermediate v82)

At19:58–20:00, Settings switched English→Simplified Chinese immediately on
device, without submitting account/privacy preferences. System font scale2.0
kept the Settings save footer visible; Home remained navigable. Discover could
scroll to its View discovery card action, and the card's identity, privacy note
and primary actions remained visible. Independent visual review is separate.
Language was restored toEnglish and font scale1.0 by20:00:20. Official dark-theme
capability and real TalkBack are not implied by these observations.

Settings recovery was also exercised without saving account changes: Public
was temporarily selected as Private in the draft, Back prompted Leave without
saving, Stay retained that draft, and a subsequent Discard changes followed by
reopening Settings read Public again at20:02:30. The original account defaults
were preserved. A20:03:17 device-settings receipt confirmed font_scale1.0,
Wi-Fi1, mobile_data1, ui_night_mode4 and screen_off_timeout600000.

## Final v83 installation and acceptance

v83 installed with retained data at20:09 SGT. Source
`abc072adfdae57e4cdd0fd7c9de4b2bbfe21a445`; the pulled installed APK SHA-256
matched `7dd81dfdc2783a58cd6acfbf5d446000b1c35312364f25e5975d4160270fc9b8`.
The original account was retained; the observed PID was17953.
Full Flutter1984/1984 and clean analysis preceded installation. Backend selector
and mounted v78 manifest were rechecked unchanged20:12:21–20:12:32.

### Long screen-off and interest-draft recovery

At20:10:54 a controlled screen-off trial began from the interest editor with
an unsaved Books addition and search `books` (four draft selections, original
three saved). No interest save was submitted during this trial. The timing
receipt records **509.5 seconds (8 minutes 29.5 seconds)** before wake at20:19:24.
The92.3-second and356.3-second checkpoints both recorded PID17953 and keyguard
showing; the before-wake PID was also17953.

After the user normally unlocked the device, the20:19:59 capture remained on
the interest editor with all four draft selections and the search preserved.
Its UI XML is byte-identical to the20:10:54 pre-lock XML. The recorded PID
remained17953. This is a **bounded v83 pass for this single long screen-off
trial**, including route, search and unsaved selection retention.

The draft was then discarded. Reopening at20:20:38 showed the original three
saved selections, the temporary addition unchecked and the search cleared;
the20:24:14 follow-up had identical UI XML and the same PID. No persistent
interest change remains from this trial.

This observation does not identify the cause of the historical v79 Home
returns, prove all long-wait cases, or cover process death, Activity recreation,
reboot or session replacement. The historical evidence gap remains separate
from the deterministic same-connection composition fix.

Sanitized private-evidence SHA-256 receipts (raw screenshots, XML and state
metadata remain outside the repository):

| Private artifact | SHA-256 |
| --- | --- |
| `v83-long-lock-trial.json` | `b344bd587c38a716633856508a22302e0343cc41fdaaa8b16ba7e5abd89d1a43` |
| `v83-long-lock-before.png` | `64dbaa1a35b868c8d60045288a01dfd7cf5007ae38231363b4aeceb623d37331` |
| `v83-long-lock-before.xml` | `4b27770e9a4261c8d9bfe3fc838f6a2fd3af61876306e522191f418af4332b08` |
| `v83-long-lock-before-state.json` | `175ddba08561938520eacd0bc9907c6bd38ead280a74f6f74eadc04786a8040a` |
| `v83-long-lock-after.png` | `8b093bf28ed27e465725e40ceeefcf3e5bc36aa504f6b8988b18eafcd941e842` |
| `v83-long-lock-after.xml` | `4b27770e9a4261c8d9bfe3fc838f6a2fd3af61876306e522191f418af4332b08` |
| `v83-long-lock-after-state.json` | `81cf0733800ea687d97c7f029a18b79335766021feed97a3bd65fd0e0805bb8e` |
| `v83-interest-reopen.png` | `9d6d88d41e0864ffda21571b6d2687574c7e2020413931dadc16dc90cad34931` |
| `v83-interest-reopen.xml` | `61fa23ab45daf56cd58538008ee9c3dd03d4205754adbab739a5afdb03a99dda` |
| `v83-interest-reopen-state.json` | `27c2774574895aa706e8aebfe503c3c8f278ae6292d12e0cdb5d5f2fc186a4a1` |
| `v83-resumed-current.png` | `c4fdfd50c84db265d5ffb88dae3bd61e422309663be2f24214e7cf672d4cf0ca` |
| `v83-resumed-current.xml` | `61fa23ab45daf56cd58538008ee9c3dd03d4205754adbab739a5afdb03a99dda` |
| `v83-resumed-current-state.json` | `771b11ec282049aa969ca2f26b9909f0af7730822359b287bfa34d5b910dcebe` |

### Interest save and restoration

After the separate discard/reopen check, the temporary fourth interest was
explicitly saved. At20:24:49, the editor displayed four selections and
**Interests saved.** with Done available. The temporary addition was then
removed and saved again: at20:25:16, the editor displayed the original three
selections, the added option unchecked and **Interests saved.**. This verifies
the actual v83 save/acknowledgement path and restoration of the saved choices;
it is separate from the earlier unsaved lock-screen draft trial.

The20:24:59 artifact named `v83-interest-final-home` is an intermediate capture
of the four-selection saved editor, **not Home**: its XML is identical to
`v83-interest-save-complete`. The filename is not evidence of navigation.
The operator subsequently selected Done and continued to the new-record task;
that later task's outcome is recorded separately.

| Private artifact | SHA-256 |
| --- | --- |
| `v83-interest-save-complete.png` | `48a160b508c178be9a6744b449c40fd8783322d399a38d4870eba950712eaea3` |
| `v83-interest-save-complete.xml` | `1b6d005230d16d2a3fe5d405383bbe30dca442601771e1089f8cd4920cea2c7e` |
| `v83-interest-save-complete-state.json` | `d5043094eeb10b03fbd2c15bb8b1ff66dcd060b50d599e4d398a198c81f9b315` |
| `v83-interest-three-saved.png` | `7086c89a57129c27725fb4211d31b0b88ae6918801d878e64b0d093e6ea5f60c` |
| `v83-interest-three-saved.xml` | `1186f95642c0eff7ef932119795badd6da76c234f38f54db2091eb13c447125e` |
| `v83-interest-three-saved-state.json` | `b143d7c3cac9f3b93678400e7c86e9e23c576e3fbb14391cfb80c87a9b7fb45e` |
| `v83-interest-final-home.png` | `2247b8eb0897ddd22f6ea90dc8b2aa2f7f632e49e2a29e4554af17cc0b64f64c` |
| `v83-interest-final-home.xml` | `1b6d005230d16d2a3fe5d405383bbe30dca442601771e1089f8cd4920cea2c7e` |
| `v83-interest-final-home-state.json` | `844a388b4a4af728905253e48e29d3e6b779ee51d266c5d93d6d32c23732aa0d` |

### Final v83 check-in create, interrupted edit, readback and cleanup

This sequence used the same installed v83 APK and matching v78 backend stated
above. The root reviewer operated the phone; an independent reviewer checked
the saved XML/metadata, selected screenshots and private-file hashes. All
listed state captures recorded PID17953. Raw record text and account identifiers
are omitted here.

1. At20:26:09 the synthetic record composer showed Private, No GPS and Weather
   off. The operator executed two consecutive guarded taps on the actual Save
   button, then Back. At20:26:19 the existing create-save leave dialog explained
   that the save may still complete and offered Keep editing/Leave. Keeping the
   request reached saved detail by20:26:27; History at20:26:41 showed one record
   for this date. The two taps are established by the operator's execution
   record, not inferred from XML. Single-row readback is bounded duplicate
   protection evidence, not a measurement of all network dispatches.
2. The saved record was edited. After Save, the harness waited150ms then disabled
   Wi-Fi and mobile data. At20:27:07 the editor reported an unconfirmed result
   with both Save changes and Delete Check-in disabled. Back at20:27:10 showed
   the corrected explanation that leaving does not cancel or undo the request.
   One Keep editing action returned by20:27:15 with the same draft value and
   both writes still disabled.
3. Back at20:27:18 and Leave exercised the unknown-update return path. The
   artifact named `v83-left-offline` at20:27:24 still captured the leave dialog
   transition; it does **not** prove the error panel was already visible offline.
   Wi-Fi/mobile data were restored to their original1/1 values, with no
   restoration errors. At20:27:27 and20:27:38 the Saved Check-in page visibly
   showed **Check-in unavailable + Reload Check-in**, rather than the former
   empty page. These settled error captures were taken after network restoration.
4. Explicit Reload at20:27:44 read the same original note value as the initial
   saved record; the interrupted edit was not committed in this trial. The
   actual strings were compared privately. No successful write or cancellation
   was inferred from the unknown result.
5. A subsequent normal edit completed. Back during that request produced
   **Please wait while this request completes.**, visible in the20:28:10
   screenshot. That screenshot also shows the updated detail; its XML is an
   adjacent transition snapshot, so the stable final value is separately
   confirmed at20:28:20. History at20:28:36 contains one matching updated record;
   Calendar at20:28:33 shows one check-in for the tested date and the same
   updated note. No duplicate is visible in these readbacks.
6. Only this task's synthetic record was selected for cleanup. The20:28:48
   confirmation led to History reporting no check-ins for that date at20:29:10.
   Home at20:29:23 explicitly reported no saved check-ins today. Existing
   records on other dates were not selected for editing or deletion.

The observed SC-07 unknown-update wording/Keep editing/pending feedback and
SC-10 returned-detail error/explicit Reload paths therefore passed on the final
same APK. Unknown deletion, a write that commits but loses its response,
process loss and all interruption timings remain outside this physical trial.
The reported new-entry save sequence is independent of the unexecuted
`core_v83-not-executed.py` draft harness.

| Private capture basename | PNG SHA-256 | XML SHA-256 |
| --- | --- | --- |
| `v83-create-private-ready` | `dc15893d2fecae4caa7f800721221db48cd543eb521e99d68005bbd48c93c62c` | `25f4fd1c747572208a1749d7b4a421bea031e633f269314da6c42712f9b70673` |
| `v83-create-save-back` | `49ca160647880e08f03002ac9701f4a4495b6a9dec0d1529a0cd46e2881262d9` | `492011a0998cdb5afe112561cef167b6b516deac960ba8036c115ac739383731` |
| `v83-create-result` | `72846390030e4c93493f80a3f31df765dae02973f5ef98273b49fa0eaa7ff5fc` | `5edab3b595a1a0163391f4d37cfb874ee71cda969a71ac7962a02f6e6980d5df` |
| `v83-history-one` | `d1700aa3751481d360534e68d0f2f32649d656c89e6a625cf757310295a1538b` | `d932f1ef0f4922161d32d238a7299b92c51dcd44f067f25f1af35eb90df35a2d` |
| `v83-edit-before-cut-verified` | `f8e322d9af232086843ed19f4899c85a38764775859cfeab223a783f3ae71e1a` | `54fbc4eba9eeb835925e4b5ac4d6d335d0a76a15cc94c10f33eab1ad1f062bf3` |
| `v83-edit-unknown` | `631622d27586471060b978d820ddea72736985f3f2211a043690ef09d7ac08bc` | `bc931eb015cf6d79ad4d785489729af24d4eff80cc70aadccc61df3efc0ed68f` |
| `v83-edit-unknown-back` | `64f91c3c23119230c9df2573210f928b598fa1b1739fd432f2d1fa13dc845c34` | `ab71396812ea4a813dbcabfbdde301986326cf1289da0ad9771800571c1d853f` |
| `v83-edit-unknown-kept` | `631622d27586471060b978d820ddea72736985f3f2211a043690ef09d7ac08bc` | `bc931eb015cf6d79ad4d785489729af24d4eff80cc70aadccc61df3efc0ed68f` |
| `v83-edit-leave-confirm` | `64f91c3c23119230c9df2573210f928b598fa1b1739fd432f2d1fa13dc845c34` | `ab71396812ea4a813dbcabfbdde301986326cf1289da0ad9771800571c1d853f` |
| `v83-left-offline` | `ad5694f714454bf06b9a41b7d752a4c5ff1ace1cf145f6f754e80079e5d69fb4` | `ab71396812ea4a813dbcabfbdde301986326cf1289da0ad9771800571c1d853f` |
| `v83-recovered-detail` | `c09859c35b64e0900e1595559cf7e202c5349ee713899a14a7455e28ac95be54` | `249b56cb35091d9009f708fe58b9ce0b55dcf77b8092d7a79aea02c6a03b3f40` |
| `v83-recovered-detail-settled` | `129f172c2abb8f74f6f2eb38a3c9ff6b4ee39a7b339a354dc3df92c0408b7c23` | `249b56cb35091d9009f708fe58b9ce0b55dcf77b8092d7a79aea02c6a03b3f40` |
| `v83-recovered-detail-retry` | `5cde9171f66aca06aececfd66cac25a25ca68fa5629578057d93c0b06ad29d3e` | `15ca44c2513c075e14ac12b985e000be8543cc489b100fa874368fdbe663cb4e` |
| `v83-edit-online-result` | `47bf7f08cb35072e8abdd87f91a52c8d85ec0ae536303f103ca1872425d6b048` | `037ed0037cd268d2ca0850dbec0a0b7f29df63d651c8556898a05b1f184cbebb` |
| `v83-edit-confirmed` | `2cfc84d923e02b5daf4e9a01fc8a06dd85fe5562298db410508d68278c007ffa` | `fae8c11b1bd83e65888143d9253728ea48e887d15b9129b2ca0317543c731202` |
| `v83-history-updated-loaded` | `2f74704ab94ebee16c3a55e5d1e88d59719c607196a2ab27c311c136f1a56cc4` | `70dd7f8fa68cc040cdb15c6d501b07ea52653b5c37b6dc27defea882844ba93b` |
| `v83-calendar-loaded` | `df3b52e593150437797eeda8d9173ae05c2e4a62255e812df3bfa472066eaae3` | `c7ef88f002a191fcbb5c67b69baec2b09b049cab584a1abf4b60b28c7284673f` |
| `v83-delete-confirm` | `8ee8e85f7a16ee8d97fae8d84b0397fac3ed2f38db9fd640b12e513950d17573` | `8daaf8c049266cc8b00405d94f36fd78f259201c1ffc811d538651ecb7b7ae61` |
| `v83-deleted-history` | `944d10f65b8b577c87da8a33c972f42d51f461adfe5bb11ae9b2ac5a9c931c59` | `9910056887c0a4349d66b8ba8d8da2b66e039ca0820c54b77af5a2ad38685051` |
| `v83-clean-home` | `c3d5b97806db806adc266b5af0aa24bc76f5a4e53f3c7e9b85710e7982f526c5` | `f55abfd4ee05accaa74eacf43f93234ae883ba65d4ad2a97f3c58b00244f7bed` |

Network restoration receipts, stored privately:

- `v83-cut-network-original.json`: `3eb837c80bcda1d32e7b8202ec89df34daa480429482c62f10b861785f6576df`
- `v83-cut-network-restored.json`: `f012f1cd41de64ce30cb6949e744407fe0e176c3e96882c9ca63e7385cbed0be`

### New Activity after explicit exit: startup error and Retry recovery

At20:30:45 the profile capture was still showing Loading current access.
The operator then pressed Back twice, mistakenly expecting two remaining
in-app routes. The second Back exited the app. The next guarded action stopped
when ENMORI was no longer foreground; no input was delivered to the other app.
The MainActivity component was started normally at20:30:50.

The process remained PID17953, but the saved activity metadata distinguishes
the instances: the20:30:45 capture has ActivityRecord122247964/task14813;
20:30:53 and20:31:40 have ActivityRecord168238817/task14816. This is a **new
Activity/task in the same process**, not the same-Activity screen-off retention
case. The earlier long-lock before/after captures retained the original
ActivityRecord and task.

At20:30:53, the new activity showed the root **Service unavailable** page with
Retry. The20:31:18 post-Retry capture still showed that page; by20:31:40 Home
had loaded. Home explicitly reported incomplete onePA interest-search coverage.
This is observed startup-read error recovery, not proof of uninterrupted service
or a newly complete onePA source range.

Source review identifies auth observation and onboarding/account reads as gate
inputs, but the private retained logs do not identify which failed in this
request. They include the20:30:50 ActivityTaskManager Displayed event and no
PID17953 application log lines. There is no causal trace for the service error.
The normal new-root route and current-topic RAM reset must not be classified as
a same-Activity retention defect or attributed to the historical v79 incident.
Saved AI History readback is a separate acceptance step.

This remains a bounded diagnostic finding (SC-15); no lifecycle, auth, route,
backend or persistence behavior was changed. Source details and inference
limits are recorded in [the route review](route-review.md#v83-explicit-exit-and-new-activity-startup-recovery).

| Private artifact | SHA-256 |
| --- | --- |
| `v83-discovery-profile.png` | `9ae03351d71c2fdd9e2f286488f22a4e7a09428e9e58cb8c5b32758528ae5410` |
| `v83-discovery-profile.xml` | `785ef75a548044a633e1683495621d06d73ea995f7154c89e91695ec0c696873` |
| `v83-discovery-profile-state.json` | `5ef25b9ed41dda09a105ad24fa91024afaf964ac79e189eb944f466782a7bc0d` |
| `v83-social-resumed.png` | `45b860eb34f8bd40a8695561b5fe3741c517f92ede8b49051a7682209bf39d83` |
| `v83-social-resumed.xml` | `78757349f099faa03e9ca86180a3b9ff3f851a64278ebea1e05831a4d815a208` |
| `v83-social-resumed-state.json` | `1430219f333e82a7b2629ca08cd875b1184b7115f44193d72e1de702d361c374` |
| `v83-social-retry.png` | `4ccf8a50626fdccc502811a5398655f16ef0ec37bf55e2864845dc6afc9e2f8d` |
| `v83-social-retry.xml` | `78757349f099faa03e9ca86180a3b9ff3f851a64278ebea1e05831a4d815a208` |
| `v83-social-retry-state.json` | `f5be9cbf26f3be9ad2817d38818ebf5b1d35ddb171d7a0cc631c8f01599518e6` |
| `v83-social-retry-settled.png` | `18eed26cc7565eb47c595e314186d1246ae644200e72da21f1e1f12cc2d4a512` |
| `v83-social-retry-settled.xml` | `3854c05f759b9e8faa449c6ad83f1e91756a590619a7d6e0c8623f24d439f324` |
| `v83-social-retry-settled-state.json` | `d9ceb5494ddacb7cf620b21943b01e547da580cea34f318d835bc3863d78a241` |

### Final v83 AI send, History readback and cleanup

This is a bounded actual-service check on the final installed v83 candidate.
The account already had cloud-processing consent; this test did not enable that
consent or change the grant/credit configuration.

At20:29:54 the new-topic composer had Check-in references off. The capture shows
the off-state helper **You can still chat.**; the source maps this helper to
AiReferenceMode.off. The editor was still empty in this capture. The operator
then entered a synthetic test request and tapped Send once before20:30:11,
leaving for Friends afterward. The later mistaken double-Back exit and new
Activity startup/Retry are documented in the preceding section; the message
was not resent.

History loaded at20:32:05, and the20:32:21 top-of-list capture placed this new
test topic in the **first conversation row**. This actual row position differs
from the intermediate v82 sample; the older ninth-row observation must not be
applied to v83. It does not establish a new recent-first ordering rule.

Reopening at20:32:39 displayed the original synthetic request and one short
AI greeting. Both message nodes carried **Saved** semantics in XML, and the
visible screenshot agreed with the two-message content. No source/read-state
warning was visible or present in that settled XML. This confirms persisted
readback after the explicit app exit/new Activity for this conversation.
It does not close the earlier SC-12 intermittent warning without a cause.

Only the newly created test conversation was selected for deletion.
At20:33:01 the confirmation was visible; the20:33:06 artifact named
`v83-ai-deleted` still said **Deleting…** and is only pending evidence.
The deletion outcome is instead supported by the subsequently loaded History
at20:36:40 and20:36:46: the test topic was absent from its former first-row
position, while the previously second conversation became first under the same
ordering. The independent review compared these row identities privately and
did not enumerate unrelated conversations or claim a full-history audit.

The20:36:35 new-topic capture restored the normal automatic-today reference
helper (up to the latest five check-ins). No follow-up/notification was scheduled.
The final candidate's actual send, cross-Activity History readback and cleanup
passed for this one synthetic topic. Unknown-send recovery, notification
delivery, cross-device/time-zone behavior and sustained availability remain
outside this trial. **SC-04's AI authorization expiry remains a release
blocker; this successful call does not extend it.**

| Private capture basename | PNG SHA-256 | XML SHA-256 |
| --- | --- | --- |
| `v83-ai-compose` | `9cbc7344186f51784ea10931577d2fa086304a776f47c8960b0694858d398395` | `a47f4997ae3cfe98846d0219b51694949d39d0eeb8c5effbc1d6e2a415b0e0e8` |
| `v83-ai-history-top` | `fc00ba64a387fa4714e96701ebad3e7142db7c3c03bfcda5baa55b48fbcbdaf8` | `3ef596cefbbc94c87379fd4a4267b8bc506ec732e985191858633931611151f4` |
| `v83-ai-reopened-loaded` | `1b37af9f3972a07b8a168411afa44b5739c8a6cb41c2e1b5a8576abdd649fffa` | `dc605fe1b193401cbe93fcc75b1c675e443ea19ec82af5a562f07688cf8a937f` |
| `v83-ai-delete-confirm` | `5a9d884c2024ff0491f5d07b813d708b8a2e7b3476b221615bebd8bc283206c8` | `38f4a9b7674b814043128ba533c498445705cd9c7d008138038af2587c3bfd75` |
| `v83-ai-deleted` | `d7df82188994264247d00dcd1e3f494a7a6a7fd8bd5dcfb5b357c142627c4689` | `59c5e4db04579f8deaf00a36b656e4f33c97c2cf0dace6882fda8c926dee167f` |
| `v83-ai-clean-history` | `d533b1f6f4a7b673fc11c4e486a1655b47b926759b1ac64547dfcbffceffc47d` | `35aa4901f0e0efd40f9acaa5b56ef83cc445513c645c26ba57b29c5cfead2296` |
| `v83-ai-clean-history-loaded` | `d533b1f6f4a7b673fc11c4e486a1655b47b926759b1ac64547dfcbffceffc47d` | `35aa4901f0e0efd40f9acaa5b56ef83cc445513c645c26ba57b29c5cfead2296` |
| `v83-ai-clean-new-topic` | `6bb4388add699d561e0c55ea3002f2d94383a0a997193a24e24e19861b54f747` | `7cdf6aebaabbfb838afaab95f67fc2168c269c98fc946116d5891b27be1459d7` |





### v83 social content and Chinese 2x-font observations

The main operator supplied actual images from the installed v83 APK. The UI
reviewer independently inspected the listed private images without operating the
phone; detailed hashes and visible-state limits are recorded in
[the UI review](ui-task-review.md#最终候选补充v83-有限实机视觉复核)
and [its receipt](ui-verification.json).

English discovery list/card, populated Created-a-Check-in Activity and its friend
profile show circular placeholder avatars and readable identity, type/content
and controls in the captured viewports. The Activity observation concerns a
populated check-in item, not populated Going/Interested items. The profile image
shows explicit interest/event empty states. These images do not establish
photo-avatar decoding, relationship writes, all visibility cases or return-state
preservation. No private identity or check-in text is reproduced here.

The same v83 was switched to Chinese with system font_scale2.0 by the operator.
The settings image shows wrapped visible copy and the fixed Save control.
The first discovery images, including the misleadingly named
`v83-discover-zh-large-settled.png`, still show a loading bar and no cards.
Operator observation points were approximately20:34:58 loading,20:35:15 still
loading and20:35:31 content visible; these are UI observations, not precise
HTTP elapsed time. `v83-discover-zh-large-later.png` contains the result card;
`v83-discover-zh-large-actions.png` shows the card action after scrolling, which
the operator reported as reachable. `v83-card-zh-large-loaded.png` shows wrapped
identity, a circular placeholder, privacy disclosure and both actions without
observed overlap or clipping.

Known limits remain: the fixed Chinese My-friends tab fades/clips its last
character at2x; the end-of-list message precedes the first discovery card; raw
source reason remains English. No production change was added for these during
final verification. The card/header layout is improved in the observed states,
but this is not a full UI or TalkBack pass. `v83-settings-restored.png` visibly
shows English and smaller text; exact device-setting restoration values are
owned by the operator's restoration receipt, not inferred from this image.

| Private artifact | SHA-256 |
| --- | --- |
| `v83-discover-loaded.png` | `2056f2cd91ff7f23603955d59a2e3384338931170b6afe88bfb95ef7814a765d` |
| `v83-discovery-card.png` | `64f6e08732b4a543644bcad19fa7d909fa5e9195741c18043be439c4c23d5cc6` |
| `v83-activity-loaded.png` | `474e2a26511d0c0892686f54bedab60504a066e0d0eabea6a169f50e66e7fab9` |
| `v83-activity-profile-loaded.png` | `c008f2e5c62d6d6cd0583f126e577ff9450cd02005d7f97ae2b1653c6ecd59ea` |
| `v83-settings-zh-large.png` | `d3f38e98d7a3fec1776acf2812299197b6f00077b56e4a583b8db49e9f20fa24` |
| `v83-discover-zh-large-settled.png` | `7fe2c433e4db8e3d77540579a12d35919d4afac0ab18d7f98e6d55a5fd8e650b` |
| `v83-discover-zh-large-later.png` | `edf7a694b303e0843a9715cfd4e8ad6c3397d1509f128803b0b5d669e7c4e65a` |
| `v83-discover-zh-large-actions.png` | `e32ac041b57c46129b96931d716880ddf531ffcb2862cba1bd5bc880934b64ec` |
| `v83-card-zh-large-loaded.png` | `956bff80a3f48023fc80dd1248bd51b1a5a84b69b5fe85f487abd18217668819` |
| `v83-settings-restored.png` | `2af031691a02710425beaa20481278588cd1d958037841af85dd0ef18e855233` |


### v83 SC-13: failed/unknown recommendation hide feedback remains visible

During the final v83 trial, the operator disconnected the network and selected
Ignore for a recommendation with an existing Interested plan. The UI reviewer
independently inspected the resulting private screenshots without phone control.
At20:39:39 SGT/PID17953, the originating recommendation card is gone and the page
shows its recommendation error and Retry; the page-level “Change not confirmed.
Check your plans before making another change.” snackbar is fully readable above
the navigation. At20:39:43 the error remains while the transient message is gone.
This is a bounded real-phone pass for SC-13's failure-feedback visibility fix,
not a pass for the write outcome, every error mode or successful Undo.

The disconnected result remains unknown. It must not be recorded as confirmed
non-submission or confirmed hide. My plans readback and final-package successful
Hide/Undo are separate follow-up observations. This does not explain or close
the first unconfirmed v82 trial. The independent finally restoration receipt
records original/restored Wi-Fi1 and mobile-data1 with no restoration errors;
it does not by itself prove subsequent request connectivity.

See [the focused feedback report](recommendation-card-feedback-review.md#final-candidate-v83-bounded-physical-sc-13-feedback-recheck)
for the component root cause, scope and limitations. Private content is not
copied into the repository.

| Private artifact | SHA-256 |
| --- | --- |
| `v83-card-failure-immediate.png` | `f1c9bc356365300dd3132f7e75ed8030af8b73c4081f94f80027e9bba3dac4bb` |
| `v83-card-failure-immediate-state.json` | `edc6acf279b27da495a4d08ef1051f08ad5e89836a055ef76e75388226536d50` |
| `v83-card-failure-later.png` | `46015b9370f0f8df24f92ec1777c158b149f586af38ab19e20a12c8923bd7068` |
| `v83-card-failure-later-state.json` | `a1fced94f2ae10bf6932a3623b3de810b2d0a76295ba24369d5735b3b5e8d4c2` |
| `v83-card-failure-network.json` | `a52efb86bf9a548ed7b4ecfa3a48195a410ab53346a976af366ba2a053e7e8fd` |


### v83 follow-up: unconfirmed plan counts and participation check

At20:40:10, My plans showed nine loaded records and counts Interested1, Going2,
No current participation6, Hidden0. It also explicitly warned that some changes
were unconfirmed and counts used the last confirmed choices. These counts are
**not confirmation that the disconnected hide did not occur**. The20:40:22
Interested row likewise said “Change not confirmed. Open to check your plans.”
The UI reviewer independently viewed both warnings.

The operator then opened that row to check its current participation. At20:40:38,
the independently viewed detail image shows Interested selected and no longer
shows the unconfirmed-change warning; the operator reports the participation
verification completed. Event information itself remains temporarily unavailable,
with an explicit refresh instruction and copy that saved Interested/Going choice
is unchanged. This separates a participation-state verification from a failed
external event-information read. It does not establish final aggregate Hidden
counts, source recovery or a successful Undo; those observations follow
separately. Network setting restoration alone is not evidence of event-service
availability.

| Private artifact | SHA-256 |
| --- | --- |
| `v83-plans-after-failure-loaded.png` | `8bcd7c7a87a8bc21f4911da9b92f9a52054445781448df164da6d03b902be587` |
| `v83-plan-interested-after-failure.png` | `8a565461531d510804c8379ac4258ed67b736f2449f026b10781af8a8aff7458` |
| `v83-plan-check-unknown-loaded.png` | `f757fbae0988fbeb0cd1138ff3669e8f9f8e553d6b2ad151736742765ed4497e` |


### v83 final confirmed Hide/Undo and plan readback

The main operator subsequently repeated a fresh recommendation-card Ignore for
the existing Interested activity A on the same installed v83/PID17953. The
20:43:54 private image independently reviewed here shows the original card is
no longer in that captured position, while a page-level “Hidden from
recommendations” message and Undo action remain fully visible. Other
recommendation content is present, with its own participation check in progress.
The operation's source card being removed therefore did not remove its Undo.

The timing receipt records an Undo tap at20:43:54.633661 SGT after observing
`v83-fresh-card-hidden-4`. The20:44:03 capture shows “Recommendation restored.”
The reviewer independently verified both messages visually. The receipt's
`secondsAfterIgnoreToolReturned` measures time from a tool return, not snackbar
visibility or HTTP duration; it must not be used as the Undo window length.

At20:44:36, a separate My plans loaded image shows nine records, Interested1,
Going2, No current participation6 and Hidden0, with “All available records
loaded” and without the earlier unconfirmed/last-confirmed-values warning.
This is the final observed plan readback after the successful Undo, distinct
from the20:40 snapshot that still had unconfirmed changes. The latter remains
an unknown-state observation and is not retroactively treated as confirmation.

Together these are a bounded final-package pass for confirmed Hide offering
usable immediate Undo despite card removal, the restored confirmation, and the
subsequent plan readback. They do not establish immediate reinsertion of the
original card into the current recommendation snapshot, all providers/error
modes, long-term consistency, or why the first v82 attempt had no confirmed
change. The final Interested count remains1; this aggregate image alone does not
identify an individual record. No private event title, scheduled date, venue
combination or account identifier is reproduced here. Activity A is only a
sanitized test-reference alias.

| Private artifact | SHA-256 |
| --- | --- |
| `v83-fresh-card-hidden-4.png` | `8e18f70a14973712fa957ddecd4c58ce03dfcf481c675e82c7d1a88fd7c76f10` |
| `v83-fresh-card-hidden-4-state.json` | `07ad1df277ad593b944494a17053a7b5b8fb3353b41f795f1ff9a1db12a81110` |
| `v83-fresh-card-undo-timing.json` | `99afc191acd9b4b589eab16d9d17283a10e535beacb8fd2348bda5bc195d7fc8` |
| `v83-fresh-card-undo-result.png` | `d12e5c8cca0517e40b894ac1124f347113b8dcab72a1cbd5dc1a406d8bc8600b` |
| `v83-fresh-card-undo-result-state.json` | `bedb672705513528fa78b864ce73904a5cb13e6526e73b61926749b231ccd790` |
| `v83-plans-final-loaded.png` | `341f2410556459d7dea98c12bb6981010df87704b3ec9d24a0c7a4d61bd5f4e0` |
| `v83-plans-final-loaded-state.json` | `b6744490cdfdc40abe1da579bb7fcf7f4c521737b1dfdb6d7b5f7dbb52d64a86` |

### Final v83 recovery limits, background return and cleanup

The final detail recovery was **not successful**: the existing event A detail
showed explicit unavailable/refresh guidance at20:40:38, and a deliberate
Reload Event information still showed the same error at20:41:03. Participation
verification completed independently: the unknown warning disappeared and the
Interested choice remained selected. Returning to plans preserved the Interested
filter. Recommendation content subsequently returned at20:41:39, together with
an explicit incomplete onePA supplemental-range notice; interests also reloaded.
The attempted Retry interests tap found no live button because that state had
already recovered; it is not counted as a successful explicit retry. This
client result does not establish the cause/provider of the detail failure, nor
close repeated onePA failures measured separately against the real backend.
Stop-waiting attempts on v83 likewise found no live button after reads completed;
that action is covered by intermediate-v82 phone evidence and automated tests,
not claimed as a final-v83 physical pass.

At20:44:36, all available plan records loaded:9 total, Interested1, Going2,
no-current-participation6, hidden0, without the earlier unknown-count warning.
At20:44:50 the existing event A row retained Interested and original metadata;
its update time advanced after the authorized Hide/Undo. No plan record was
added or deleted. The row evidence complements the aggregate counts.

The operator then used Android Home from the Interested-filtered My plans page.
The ordinary app launch returned HOT at20:45:11, explicitly bringing the existing
task forward. My plans and the selected Interested filter remained, while its
content reloaded. Scroll position was not retained in this observation and is
not reported as a pass. This short background trial is distinct from both the
509.5-second lock trial and the earlier explicit Back-exit/new-Activity trial.
The operator reset the plan filter to All records and returned to Home.

At20:45:24, the final Home capture showed no saved Check-ins today and the original
three interests and recommendation-area mode. The one v83 synthetic private
Check-in had been deleted and its day reread empty; the one synthetic AI topic
was absent on later History rereads. New-topic reference behavior was restored.
Existing records/conversations were not removed. Create/delete audit history,
interest revisions and plan update revisions are not byte-for-byte rollbacks.

The direct20:45:01 settings receipt confirms font_scale1.0, Wi-Fi1, mobile_data1,
ui_night_mode4, screen timeout600000ms, and all three animation scales1.0.
English was separately observed in Settings, with original Public default.
No optional processing/OpenAI consent, saved global privacy default, friendship,
notification or later-contact setting was changed. The phone was released to
the user at Home after this capture; no further phone input was performed.
Private screenshots/XML/logs remain outside Git. Public evidence filenames for
existing event A use neutral aliases; the private filename mapping is outside
Git as well. `private-evidence-index.json` records hashes, not pass/fail claims.

**Final disposition:** bounded same-APK acceptance is complete, with the
explicit failures and unverified cases above. This is not full UAT or a stable
release approval. v83 is retained as the candidate; no production source or APK
changed after its1,984-test/analyze/build gate. Backend v78 was last identity-
and-grant checked at20:35:28–20:35:40. Its AI authorization still expires at
2026-11-18 00:00 SGT. Registration/verification with a genuinely new account,
real TalkBack, real photo-avatar paths, cross-device behavior, all participation
activity types, process-death draft restoration, and final successful recovery
of the failed event detail remain outside the achieved evidence.
