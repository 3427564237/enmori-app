# Current-main Android APK preflight — 2026-09-11

- **Source/current-main SHA:** `8b3f3fecb373c3dceb5b813e3b464070ee24297d`
- **Artifact:** Flutter debug APK `enmori-app-controlled-backend-debug.apk`
- **APK SHA-256:** `131D3E7B34CF95ED8D12B7840CBC31FF9C239CFF074E25DC783E9EFB0FFCA50E`
- **Artifact size:** 194,780,208 bytes
- **Build toolchain:** Flutter `3.47.2` (framework `d3b14c8769`), Dart `3.13.2`, Android SDK configured from the approved local SDK
- **Build command:** `flutter pub get`; `flutter build apk --debug --dart-define-from-file=<private-local-config>/rmvp-01a.json`
- **Build result:** Pass; `build/app/outputs/flutter-apk/app-debug.apk`
- **Runtime configuration:** Approved Firebase/API values were supplied out-of-band and consumed from a private local dart-define file. No configuration values, credentials, tokens or private endpoint are retained in this record or repository.
- **Artifact handling:** APK is delivered out-of-band to LI for the LI-operated Android run; the binary is not committed to the repository. LI must verify the delivered copy against the SHA-256 above before installation.
- **Boundary:** This preflight proves artifact identity only. It does not prove ADB connectivity, phone-side Tailscale state, private Serve reachability, Android UAT, Release or Done.
