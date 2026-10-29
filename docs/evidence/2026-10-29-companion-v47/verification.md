# v47 companion entries and real scheduled notification

Date: 29 October 2026, Asia/Singapore. Scope: the approved current test account
and one vivo X200 Pro, existing host/Firebase/local Qwen. Authority:
[continuous execution and real push decision](../../decisions/2026-10-29-li-continuous-proactive-delivery.md).
This supersedes the v45 evidence of unconfigured execution/push; it does not
rewrite that earlier observation or claim availability for other accounts.

## Source and build

APK source `78099f4b`; backend deployment source `ac2c2677`. Group release now
requires `ENMORI_AI_COMPANION_FIRST_FLOW=true` at Gradle configuration time, and
the private build selects it. The explicit installation binding is included;
credentials, installation identifiers and tokens are excluded from this record.
The settings page now survives the same-session Android permission roundtrip by
clearing stale form state and reading current settings. Session replacement,
revocation, aborts and unknown-result fences remain in place.

Backend suite: 1,624 passed; real-entry tests: 5 passed. The page lifecycle
regression failed before the fix; 55 focused Flutter companion tests passed after
it. Targeted analysis reported no issues. v47 release built successfully and
was installed with `adb install -r`, preserving the logged-in account. The build
and installed APK both have SHA-256
`3db8e041c6aeef905c68495353c74439c50aa90565253a90154337becbc98631`.
Package `com.enmori.app.group`, versionCode 47. Signing certificate matches the
previous installed group builds. The overview description removal and full
in-app event details from v44 remain included.

## Runtime and actual delivery

The existing enabled user service now selects `worker.mode=service`, a one-minute
cycle and fixed-device push, with the same local model. Device registration has
a finite 30-day lease; only authorized registration/rotation renews it. The host
must remain online and its user service running. This machine has user linger
disabled, so logging out/stopping that service also stops appointment execution.
This is a service-lifetime worker, not an independently hosted cloud scheduler.

The phone owner-approved settings were enabled through app controls: on,
Asia/Singapore, quiet hours 22:00–08:00, push enabled, matching current device
registration. FCM validation-only returned HTTP 200 before the real test; that
preflight is explicitly not delivery evidence.

On the actual v47 phone, a new synthetic water-break test message and its local
AI reply were saved. The automatic today-context description and a Check-in
reference were visible. The saved user message opened “Ask me later”; the time
2026-10-29 09:36, Asia/Singapore, UTC+08:00 was verified and confirmed. The phone
showed “Scheduled once” and a read-only owner-scoped backend check found exactly
one queued occurrence. The app was backgrounded before due time. No replay,
quota reset, quiet-hour change or direct database product write was used.

At 09:37 the occurrence was published with dispatch accepted, revision 5,
message sequence 3. The conversation contained exactly three messages, of which
one was proactive; active occurrence count returned to zero. Android reported
one actual active ENMORI notification on `enmori_requested_followups` with the
generic body “Open ENMORI to view an update.” The screen was locked at inspection;
arrival is actual device evidence, separate from the FCM acknowledgement.

The real test consumes this account's rolling-24-hour allowance. No extra
appointment will be created merely to repeat acceptance.

## Completed physical checks

After the explicit service restart at 09:38, readiness returned at 09:38:48.
Subsequent reads showed the same published/accepted occurrence revision 5,
exactly three topic messages and one proactive message. The phone still had
one original notification, with no duplicate observed after recovery.

After the owner unlocked the phone, the notification shade displayed the generic
ENMORI notification. Tapping that exact notification opened the AI conversation
and highlighted “Located message”: “Did you get a chance to take a short water
break?” with “You requested this follow-up”, the original saved-message action
and reply action. Only after display, read state became revision 1 through
sequence 3. The notification was dismissed by opening. A transient earlier
source/read-status warning did not persist after this fresh authorized read.

The actual Manage later contacts page confirmed on, Asia/Singapore and current
notification registration. Home/background then returning to the same activity
preserved the page and refreshed settings, with no false sign-in requirement.
This exposed a separate duplicate legacy status label beneath the functioning
notification controls; the final presentation-only build removes that duplicate
when the real controls are present. It retains the fallback when absent.

This is one real scheduled delivery and exact-message navigation on the named
phone, not full product UAT or evidence for other accounts. No further push is
sent to retest the presentation-only correction.

Local ignored artifacts: `build/group-delivery-v47/ENMORI-group-v47-release.apk`,
`scheduled-once.png`, `notification-opened-exact-message.png` and the sanitized
notification-visible receipt. Companion test/build logs remain under `/tmp`.
The machine-readable receipt records each evidence layer separately.

## Final installed v48

The presentation-only correction was built from `0ec7df5` (48.2 seconds); all
14 proactive page tests passed. The first USB installation was aborted by the
phone installer; completing its known-source installation confirmation allowed
the authorized same-signature upgrade. VersionCode 48 is installed and its
SHA-256 matches the built APK:
`17c71be068b4b3c50ce7f510394e33b69ce08a0be06ba3fe70bf78b439a5cc48`.
Login was retained. On this exact package, Manage later contacts and its read-only
notification check showed active registration, contacts on, the confirmed zone
and quiet hours, without the contradictory legacy status line. The original
occurrence stayed published/accepted at revision 5 with one proactive message
and read-through sequence 3. No second appointment or push was sent.

The temporary USB stay-awake setting was restored to its original value and
read back. Local final artifacts: `build/group-delivery-v48/ENMORI-group-v48-release.apk`
and `confirmed-notification-status.png`. Actual push/tap proof was obtained on
v47; v48 differs only in the documented duplicate-label cleanup.
