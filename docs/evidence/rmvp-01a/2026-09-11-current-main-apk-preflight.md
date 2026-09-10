# Current-main Android APK preflight — 2026-09-11

- **Source/current-main SHA:** `8b3f3fecb373c3dceb5b813e3b464070ee24297d`
- **Artifact:** Flutter debug APK `app-debug.apk`
- **APK SHA-256:** `F00E9074874B8AECB6220A697CC2BD34578F10E476671FC927ECF272A7A31EC0`
- **Artifact size:** 167,129,882 bytes
- **Build toolchain:** Flutter `3.47.2` (framework `d3b14c8769`), Dart `3.13.2`, Android SDK configured from the approved local SDK
- **Build command:** `flutter pub get`; `flutter build apk --debug`
- **Build result:** Pass; `build/app/outputs/flutter-apk/app-debug.apk`
- **Artifact handling:** APK is delivered out-of-band to JIN for the LI-operated Android run; the binary is not committed to the repository. The local delivered copy must be verified against the SHA-256 above before installation.
- **Boundary:** This preflight proves artifact identity only. It does not prove ADB connectivity, phone-side Tailscale state, private Serve reachability, Android UAT, Release or Done.
