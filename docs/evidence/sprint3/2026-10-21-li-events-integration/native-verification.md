# v14 native follow-up — 21 October 2026

This follows the initial no-device checkpoint in `verification.md`. Same product
source `5529f7b4d5cf91489aa0b1b4ff118ec53a7fd522`, same APK SHA256
`a16cc4dcd2d6759f96786119e6d82c624ec7cac6f3e67b7472779e9cfa1cceb4`.
ADB reconnected to the vivo V2405A. Update install succeeded. Private nonce/stdin
handoff verified APK bytes, installed-package bytes, certificate/config consumption
and port forwards. An initial handoff happened before ready-file publication and
failed before delivery; after observing the waiting screen, transfer succeeded.
No real-account app, password or real Firebase user was modified.

## Actual native checks

- Dedicated synthetic account logged in. Initial rejected-consent/empty-interest
  Home showed the approved empty state. For populated Home, only this new test
  account was changed through normal Backend APIs to accepted optional processing
  and the existing Music tag. Home then displayed two real recommendations,
  including the same first Event as Events. No invented interest mapping/content.
- Events bottom tab loaded real source cards and categories. Interested on the
  first Event was saved and displayed on its stable-ID detail. Interested/Others
  participants showed an authorized exact zero; Android Back returned to detail.
  This is not a nonempty people/profile or two-account privacy acceptance.
- External action displayed third-party disclosure. Open website reached Chrome
  and the real organiser URL using vivo's **open once**, without changing the
  default. Android Back returned to the confirmation. **No** preserved Interested.
  A second deliberate opening followed by **Yes, mark Going** saved Going and
  displayed the declaration-only success. No registration form or payment was
  submitted; this does not certify an external booking.
- Profile read Going. After scrolling to the actual row, tapping it opened the
  same Event and retained Going. An earlier tap hit the clipped section header;
  subsequent root Back exited the controlled harness, requiring its normal fresh
  nonce handoff and login. This is preserved as an interaction limitation, not
  relabeled as a successful row tap.
- Home read Going. Ignoring that recommendation preserved Going; Events explicitly
  displayed `going · recommendation ignored`. Restore recommendation cleared only
  ignored and retained Going. Fresh server reads, rather than visual inference,
  confirmed the final operations.
- With Sports selected, the list bottom exposed **Get next batch** and **Reload**.
  Next appended actual later source items, including an Event absent from the
  first batch. Reload reset to loading; its completion was not separately checked
  before navigating to Profile. Real HTTP first/next results (18/19) and root
  widget next-cursor behavior remain separate earlier evidence.
- Cancel participation on detail displayed none; Profile immediately reread none.
  A fresh normal API read confirmed the same Event at revision **7**, status none,
  ignored false. Home still returned two real Music recommendations. App was left
  on Home; the dedicated test account's Music/accepted choice is retained for
  inspection. Original synthetic settings are backed up privately.

Synthetic form automation initially lost/duplicated email characters through the
phone keyboard and received normal invalid-details feedback. Clear-and-type with
paced characters restored the exact fixture email and login succeeded. No real
password was read or copied. Google's save-password prompt was dismissed; no
password-manager save was selected. This is device automation evidence, not a
claim that production sign-in requires such input handling.

## Remaining UI/acceptance boundaries

Owner participation currently renders internal Event IDs. The row resolves to the
correct detail, but its label must become a currently authorized title, with an
explicit unavailable-content state and stable internal ID retained. Summary cards
also show raw UTC timestamps while detail uses local time; formatting should be
consistent. These findings are included in the existing team follow-up, alongside
JIN's pending full other-user profile/Home activity composition.

No additional model request, GPS/weather/check-in flow, real-account participation,
nonempty participant profile, account-switch privacy or offline/unknown-write
injection was performed on this APK. Earlier component/Backend tests are not
substitutes for those device checks. Screenshots and UI dumps stay in ignored
local build evidence; credentials/handoffs stay in the owner-private state folder.
The device follow-up does not approve all UI/UX or the entire app.
