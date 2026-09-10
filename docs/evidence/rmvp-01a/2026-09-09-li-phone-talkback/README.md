# LI Android TalkBack-enabled surface execution — 2026-09-09

## Scope and identity

- **Executor/device owner:** LI HOURUI (PM)
- **Device:** vivo V2405A, Android 16 (API 36), physical ADB target
- **Product source:** PR #18 at `3a732041c79326b7ad53c52bef99cf52ab981713`; the only persistent working-tree changes during execution were the pending Sign-in regression test and its test fake. No `lib/` product source differed from that head.
- **Execution window:** 2026-09-09 16:57–17:02 SGT
- **TalkBack service:** `com.google.android.marvin.talkback/com.google.android.marvin.talkback.TalkBackService` was enabled and bound before the run and remained enabled through the six-surface execution.
- **Evidence APK SHA-256:** `d46b031340c29903992b886b3bb04f04684416b52e4ad60c045a9984fb854fee`
- **Test target:** `integration_test/r6_surface_device_evidence_test.dart`

The run used the repository's controlled fake repositories. It is Android UI/accessibility evidence only; it does not replace the separately published real Firebase Auth -> HTTPS Backend -> Firestore product-chain evidence.

## Executed result

The existing six-surface Android evidence target completed with `All tests passed` while TalkBack was bound:

| Surface | Screenshot | Android hierarchy observation |
| --- | --- | --- |
| M02 Registration | `m02-registration.png` | `m02-registration.xml` exposes the page heading and Create account action. |
| M06 Optional data use | `m06-optional-data-use.png` | `m06-optional-data-use.xml` exposes the approved purpose copy, supporting statement and Continue action in visual order. |
| M07 paired Initial Choice | `m07-initial-choice.png` | `m07-initial-choice.xml` exposes distinct Accept — Public and Reject — Private names and consequences. |
| M08 Home shell | `m08-home-shell.png` | `m08-home-shell.xml` exposes ENMORI, Home, the bounded-shell description and New Check-in. |
| M19 Note-only Check-in | `m19-note-only-check-in.png` | `m19-note-only-check-in.xml` exposes the Note-only heading, length guidance, character count, remaining count and Save Check-in. |
| M20 saved Check-in | `m20-saved-check-in.png` | The TalkBack-bound Android target reached the confirmed state and asserted Saved Check-in confirmed and Return Home. The earlier versioned M20 Android hierarchy remains the detailed role/action record. |

`talkback-enabled-settings.png` records the physical device's TalkBack-on state used for this execution. The device's pre-run accessibility-service setting was restored after capture, the TalkBack floating-hint preference was restored, and the normal debug application replaced the temporary integration-test APK.

## Evidence boundary

This establishes a TalkBack-enabled physical Android execution of the six approved surfaces, together with reviewable Android semantic names for M02/M06/M07/M08/M19 and the executed M20 assertions. ADB-injected swipe gestures were delivered to Flutter as ordinary pointer input instead of TalkBack navigation, so a human audible swipe-by-swipe traversal check is **Not Run** and is not claimed here.

This package does not establish the real Backend product chain, every accessibility requirement, every R12 row, UAT, independent acceptance, Release or Done. The separate LI product-chain package establishes the real Backend path; all remaining gates keep their own evidence and reviewer boundaries.
