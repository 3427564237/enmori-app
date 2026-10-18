# Persona/composer Android HCI candidate

This packet consumes approved #135 -> #140 -> #147 -> #148 without changing
their feature code. The new entry `lib/hci_offline_harness.dart` reuses the
offline social router, real Persona/AI pages and controllers, and existing
`SyntheticAiTransport.dependency`. Auth, Persona and AI are memory fixtures.
No private handoff, Backend, model, Tailscale, ADB reverse or real credentials
are required. Closing the process clears this fixture's edits. The original
connected `.personatest` APK and its data are separate and remain untouched.

## Identify before installing

Use the accompanying receipt for exact source/tree, bytes, SHA256 and signer.
The debug fixture must be `com.enmori.app.hcitest`, display name
`ENMORI HCI (offline)`, version code 1. It must show the persistent banner
`HCI FIXTURE · AI/Persona in memory · no model`. Stop if any identity differs.
The normal connected candidate, if also supplied, is **not** this fixture;
do not launch it to create a Retry state. Real model recovery remains blocked.

On SHI's already authorized Android, select the device explicitly. Keep its
serial private. Verify the received APK SHA256 and `apksigner verify
--print-certs` before installation. For Windows aapt, run in the APK directory
and pass its relative basename, preserving the reviewed Chinese-path fix.

1. Read `adb -s DEVICE shell pm path com.enmori.app.hcitest`. If absent, install
   the verified fixture normally. If present, inspect the existing package,
   version and signer before deciding an update. Stop on an unknown/different
   signer; do not uninstall, clear data or overwrite another test without the
   device owner's disposition.
2. After installation, independently read the installed package/version and
   pull its `base.apk` from the returned package path. Its hash must match the
   supplied artifact. Open only **ENMORI HCI (offline)** and confirm the banner.
3. Record candidate identity, text size, orientation and actual observations;
   do not publish device identifiers, private content or credentials.

## SHI manual procedure (synthetic text only)

Persona: AI tab -> Manage Personas icon -> Create. With large Android text,
test portrait and landscape. Read the full Name guidance; Save with an empty
Name and check the complete correction, Name focus and TalkBack association.
Scroll to Save/Back. No invalid record should appear. A harmless valid sample
can be saved in fixture memory, opened for editing, then returned from. Preserve
existing discard confirmation; note actual keyboard/action reachability.

Composer Send state: AI tab, enter four invented lines. Open/close keyboard,
rotate and change text size. Check draft, selection, focus and Send reachability.
Resizing must not submit. Keep history and status independently reachable.

Safe Retry setup: **only in the HCI fixture**, explicitly press Send once with
the four invented lines. The scripted dependency failure is expected. Use the
AppBar Conversation actions menu -> Check result; this reads fixture memory
and reveals the existing user message with no assistant plus the permitted
Retry. Do not use a real runtime to manufacture this state. Repeat keyboard,
multiline, selection, focus, orientation and large-text checks in Retry state.
An optional explicit Retry stays inside the same failure fixture; Check result
again will show the same user-only result. This is never model success.

When an external keyboard is available, focus an AppBar control and PageDown:
only history should move. If the short fixture has insufficient history to
scroll, record that subcase Not Run; do not infer a pass. Existing #148 host
widget coverage of long history is separately attributed.

Stop on wrong package/banner, unexpected network/private configuration prompt,
unresolved state lacking permitted Retry, crash/overflow or unintended action.
Preserve the failure and remaining Not Run steps; never compensate with a
real Send/Retry or a reset of the original candidate. Device results and
TalkBack remain SHI's independent work; iOS and real AI are not covered here.

## Reproduce the artifact

Use pinned Flutter 3.47.2/Dart 3.13.2 and existing dependencies. On Windows,
export the frozen Git source to a new ASCII-only directory to avoid the known
Gradle non-ASCII checkout restriction; never overwrite an earlier export.
Set `ENMORI_HCI_ANDROID_TEST=true`, leave `ENMORI_PERSONA_ANDROID_TEST` unset,
then `flutter build apk --debug --no-pub --target lib/hci_offline_harness.dart
--target-platform android-arm64 --build-number 1`. Run offline pub resolution
first if the export has no generated package configuration. No dependency or
SDK upgrade is part of this packet. Check the output with aapt and apksigner.

For the distinct future connected artifact from the same tree, use the existing
`lib/controlled_demo.dart` target, `ENMORI_PERSONA_ANDROID_TEST=true`, HCI flag
unset, and a separately recorded version/file/hash. It still requires current
authorized runtime/capture and original-invocation disposition; building does
not authorize launching a model request. Never claim fixture behavior as that
connected artifact's device result.
