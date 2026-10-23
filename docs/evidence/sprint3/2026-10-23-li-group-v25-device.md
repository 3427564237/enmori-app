# v25 same-device update and bounded Android verification

Date: 2026-10-23, Asia/Singapore. Authority: LI explicitly requested updating v25
on their phone while preserving data, then verifying language persistence, new
features and real AI conversation. This is a PM-controlled device observation,
not full UAT, Release or Done.

## Frozen candidate and preserved data

- Installed the existing signed v25 with `adb install -r` on the connected
  V2405A. Package: `com.enmori.app.group`; version code 24 → 25;
  version name `1.0.0-group20261023`. No rebuild, uninstall, data clear or signout.
- Product source remains `fe56d5ffa7a72f07f1b389c6824f772137f81c68`.
  Installed base APK SHA-256 is
  `e0ee6242f72774a43d1ab8dbe91089cb4f42dbe01d7c3bde0bbf4f15c5222f69`, exactly
  matching the frozen artifact. Certificate verification matches v24, as recorded
  in [the candidate evidence](2026-10-23-li-group-v25.md).
- Android app ID, data directory and original first-install time were unchanged.
  The existing authenticated account opened after update and process restarts.
- Read-only Firestore snapshots immediately before and after installation matched
  for all 48 scoped original documents: account, auth binding, seven Check-ins,
  five participation records, six conversations and their 28 messages.
- After feature verification, all 48 original document hashes still matched;
  none were missing. The only additions in this scope were one explicitly marked
  private test Check-in, one new test conversation and four messages (two complete
  user/assistant pairs). Final totals: eight Check-ins, five participation records,
  seven conversations and 32 messages. Account/settings hash remained unchanged.

## Observed results

| Flow | Actual phone and service observation |
| --- | --- |
| Device language | English → 简体中文 changed Settings immediately. After `am force-stop` and launching the ordinary release entry again, Home and Settings remained Chinese. Chinese → English passed the same process restart check. A later Chinese restart also passed after real AI work. Final language was restored to the original English and rechecked after another process restart. |
| Native presentation | Chinese Settings, Home, Profile, AI and Persona headings/body rendered on this phone without the missing heading glyph seen in the earlier widget fixture. Date/time labels followed the interface language. Existing user labels and model text were preserved. Keyboard entry was exercised with synthetic ASCII input. |
| Profile and Settings | The profile's History, Footprint and Persona entry points opened; language remained usable during a Settings read. Existing privacy/account preferences were not saved or changed. Conflict/unknown-save recovery was not forced against the real account. |
| Check-in custom fields | Created one `V25 device verification` record with custom Mood, Activity and place label. Removed the draft's acquired location before saving. UI showed Private / No GPS / Weather off. Durable readback confirmed the exact custom values, private visibility, and absent location/weather. The new record appeared in today's History. |
| History | Selected 21 October using the date picker, read existing records and opened the selected saved record. Today's new test record was independently read back. There were too few records to exercise multi-page History. |
| Footprint | Selected the first existing point/row, inspected its time and authorized record summary, moved to the next point and observed the seven-minute gap, then opened the matching saved Check-in. No map/record data was edited. |
| My plans | Opened the saved participation list, filtered Interested, opened an unavailable-source event's retained plan, and returned to the retained filter. Going and Hidden showed their corresponding empty states; Hidden explained that participation is kept separately. No participation was changed. |
| Small plan → real chat | Entered a synthetic goal and limits, inspected the full review, used the unsent draft, then explicitly sent it. The helper did not dispatch on review/use. The actual Qwen `qwen3.5:9b` service returned a Chinese response; a second message received an English response and recalled `Cedar25` from the first message without repeating that marker in the second request. |
| Pending chat continuity | While the first real request was pending, navigated AI → Home → AI, then Home → Settings → language change → AI. The pending request continued and completed. Final durable history has one user message per explicit Send, with sequences 1–4 for the two pairs. After a later process restart, selecting the new conversation from History read the replies back on the phone. |
| Persona draft preview | Created an unsaved test draft, received a real preview, returned to editing, changed format from plain text to bullets, reopened preview with the same input retained, and received a bulleted response. Native Back returned to the still-unsaved editor. Discarded only this test draft. Readback showed one existing Persona, no active Persona, state revision 7, and no saved test Persona. Preview added no formal chat messages. |

The first chat reply misinterpreted the device-verification label as part of the
goal and suggested checking devices. After clarification, the second response
recalled the marker and supplied three five-minute steps, though its first step
still included reviewing notes. Transport, persistence and multi-round context
passed this bounded check; plan relevance remains a model-quality finding.

## Unresolved calendar defect

The month calendar returned “Calendar unavailable. Retry” on initial load and
one explicit retry. History's recorded-day navigation was therefore unavailable,
although reading a chosen day's records worked. Backend observations included
HTTP 503.

Root-cause reproduction used only read operations with the existing authorized
account and the same `ownerAccountId` / `createdAt` range as the adapter:

1. The current aggregate count outside a transaction failed with Firestore
   `9 FAILED_PRECONDITION: The query requires an index`.
2. The same count inside a transaction, after the binding/account reads, failed
   with the same missing-index error.
3. Adding `orderBy('createdAt', 'desc')` to that read-only control query succeeded
   with four records for 21 October. The checked-in history index already uses
   descending `createdAt`; the calendar adapter's count omits that ordering.

This identifies a query/index mismatch, not proof that a new index is necessary.
Aligning the count query with the existing history ordering is a bounded repair
candidate. No product source, deployed runtime or Firestore index was changed in
this verification session. Month counts, recorded-day stepping and the complete
calendar-return flow remain **not passed** on this candidate/runtime combination.

## Evidence handling and remaining scope

Raw UI XML/screenshots, package metadata, read-only probes and per-document hash
snapshots are retained only in the owner-private local directory
`~/.local/state/enmori-v25-device-20261023/`. They include real account material and
are not committed or published. No token, credential, raw identity, coordinates
or original private message content is included in this report.

No shared Backend/Firebase/Ollama/Tailscale configuration or deployment was
changed, and no service was restarted. Historical unknown operations were not
retried, replaced or reset. This session does not resolve the historical
intermittent initial AI Settings-read finding.

Not run: full phone power-cycle/reboot, TalkBack, Chinese keyboard input,
two-account revocation/isolation, actual Settings/Profile conflict recovery,
participation writes, multi-page History, launcher recovery after host reboot,
iOS, full regression/UAT or release approval. “Restart” evidence above means
Android process termination and fresh application launch, not a phone reboot.

## Later calendar repair verification

The [24 October connected-phone follow-up](2026-10-24-li-calendar-phone-follow-up.md)
retains this exact installed v25 and verifies the calendar repair deployed to
the existing backend. Month counts and recorded-day navigation now pass that
bounded phone check. This does not rewrite the original failure above or resolve
AI small-plan relevance.
