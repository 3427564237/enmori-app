# v65 Android candidate and retained installation

This extends the [verified v64 installation and two synthetic generations](2026-11-11-v64-install-and-scheduled-openai.md). It does not grant additional paid generations or establish two-month availability.

The only client delta after v64 displays the existing notification registration expiry in local time. Active and expired known registrations show their actual date; uncertain or absent registration does not fabricate a date. No registration duration, auto-renewal, notification permission, account consent or API field changed. The six focused widget cases cover English, Chinese, expired/uncertain/missing state and narrow layout with large text; targeted analysis passed. Owner/restart and paid-credit work is Backend-only.

The signed release APK was built with pinned Flutter 3.47.2 and normal dependency/plugin regeneration under the shared validation lock. Build source was `f4d1124fd9462313cfef8ede0490f9e0a1197891`; subsequent evidence/decision commits did not change the client tree.

| Property | Verified value |
| --- | --- |
| File | `ENMORI-teacher-v65-release.apk` |
| Package/version | `com.enmori.app.group`, 65, `1.0.0-demo20261111` |
| Size | 69,314,100 bytes |
| SHA-256 | `06bd0ead3c6ee74eb191512c2aff7136d44f7d922186359e817d6f84c53da090` |
| Signer SHA-256 | `0fa59aeaa9ce03a830405ce79136b4abc3d62510fbb8360c8ebf7c88a82966ee` |
| Build flags | Release, non-debuggable; existing public Backend and companion enabled |
| Android | APK min API 24, target 36; existing scheduled civil-time picker needs API 26+ |

After the concrete v65 package was ready, LI explicitly replied **“现在安装 v65，我会在手机确认”** to one additional retained-data installation. One `adb install -r` attempt returned Success at **12:39:38 UTC** on 11 November. Package readback confirmed version 65, with the original 29 October first-install timestamp unchanged. Launching the existing activity and reading its rendered screen at about 12:40 UTC showed the same signed-in account, avatar and existing Check-ins. No logout, data clear, uninstall, profile/privacy change or notification registration was performed.

The APK and private receipts are retained locally; account screenshots and personal Check-in contents are deliberately excluded from this evidence. The notification expiry widget has source test coverage; this retained home-screen observation is not a physical notification arrival or a real-device populated-expiry test. Teacher devices, networks and their own permissions remain separate from this installation.
