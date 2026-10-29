# Ordinary registered accounts receive the same companion and appointment flow

Date: 29 October 2026, Asia/Singapore. Authority: LI HOURUI, PM.

LI explicitly requests that teammates and everyone who downloads this app can use
the normal registered-account AI companion and appointment notification flow,
not only the previous named test account/phone, and requests implementation and
ordinary-registration verification. LI selected a newly registered account for
the final physical test; credentials are entered by the owner on the phone.

This supersedes the fixed-owner/fixed-device audience limits in
`2026-10-29-li-continuous-proactive-delivery.md` and the corresponding candidate
limits in `2026-10-25-li-ai-companion-first-flow.md` for this existing Android app,
backend, Firebase project and local model. Preserve those historical decisions.
No automatic consent, unsolicited appointments, bulk notification, private data
exposure, quota reset, new paid service or model change is authorized/implied.
The earlier supplied accounts are not credentials or permission to impersonate
their owners. Normal verified authentication and completed onboarding remain.

## Bounded implementation of this confirmed behavior

- Owner derives from the verified caller and current auth binding, never a
  compiled allowlist or a client-supplied account ID. Existing per-account
  settings, occurrence/read records and public DTOs remain compatible.
- One shared local model lane and one service worker handle all accounts. A
  bounded metadata-only roster pages current auth bindings with a rotating
  cursor, checks pending occurrence metadata, and rechecks identity, consent,
  source, cancellation, expiry and quota before execution. Failure is not empty
  success. Recovery never replays uncertain model/send effects.
- Each Android installation creates a random local identifier, persisted in
  no-backup app storage, rather than embedding one identifier in every APK.
  Creating this identifier obtains no FCM token and grants no push permission.
- Preserve the existing one-current-notification-installation per account
  contract. Explicit enable on a different phone replaces that account's current
  registration; the UI explains the change. This is not multi-device broadcast.
- Private installation and token ownership records fence account switching and
  reused registrations. Each contains only account ID, installation ID and
  registration revision; the token index uses SHA-256, never raw tokens. Only a
  freshly authenticated explicit registration can claim these records. Dispatch
  checks both current ownership records in its atomic claim. No copied message
  content. A stale account registration cannot send to the new owner's device.
- Keep explicit push opt-in, Android permission/channel, 30-day registration
  lease, generic preview, off/pause/cancel, quiet hours, daily quota and unknown
  result readback. Existing fixed-mode synthetic tests remain supported.
- No server-side pre-enrolment of ordinary users is needed. Successful ordinary
  onboarding supplies the same account/persona/purpose initialization as login.
  Missing legacy registration ownership metadata requires explicit re-enable;
  it is never silently transferred from the formerly shared build identifier.

Validate two independent ordinary identities, cross-account denial, installation
and token transfer fencing, source/consent withdrawal, disabled/deleted identities,
bounded fair scheduling, restart/unknown no replay, and actual new registration
through the installed app to saved local reply, explicit appointment, notification
and correct-message navigation. Source/emulator, live backend, APK and device
results remain separate. Keep existing operational host limits visible; equal
eligibility does not imply unlimited local-model capacity or guaranteed FCM arrival.
