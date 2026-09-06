# PR #14 APK and Device Smoke Evidence

Timestamp: 2026-09-06 20:36 +08:00
Executor: @397781783dk-prog / DU
Branch: `du/r6-rmvp01a-ui-widget-first-pass`
Previous evidence head: `1d85d8ff855cf496192221f78247f5ea5f4261fb`

## APK Build

Command:

```powershell
flutter build apk --debug
```

Run context:

- Flutter: `C:\Users\lenovo\Documents\ChatGPT\3851B\enmori-work\toolchains\flutter-3.47.2\flutter\bin\flutter.bat`
- JDK: `C:\Users\lenovo\Documents\ChatGPT\3851B\enmori-work\toolchains\jdk21\jdk-21.0.12.1+1`
- Android SDK: `C:\Users\lenovo\Documents\ChatGPT\3851B\enmori-work\toolchains\android-sdk`
- Gradle home: `C:\Users\lenovo\Documents\ChatGPT\3851B\enmori-work\gradle-home-pr14-unsandboxed`
- `JAVA_TOOL_OPTIONS=-Dsun.zip.disableMemoryMapping=true`

Result:

```text
Running Gradle task 'assembleDebug'...                            297.2s
√ Built build\app\outputs\flutter-apk\app-debug.apk
```

APK artifact:

```text
Path=build\app\outputs\flutter-apk\app-debug.apk
Length=190613883
LastWriteTime=2026-09-06 20:34:49 +08:00
```

## Device Install / Launch Smoke

Device:

```text
10ACC70EX7000Y8        device product:PD2243 model:V2243A device:PD2243 transport_id:1
```

Properties:

- Manufacturer: vivo
- Model: V2243A
- Android release: 15
- SDK/API: 35

Install:

```text
adb install -r -g build\app\outputs\flutter-apk\app-debug.apk
Performing Streamed Install
Success
```

Launch:

```text
adb shell monkey -p com.enmori.app -c android.intent.category.LAUNCHER 1
Events injected: 1
```

Foreground confirmation:

```text
mCurrentFocus=Window{8b1e634 u0 com.enmori.app/com.enmori.app.MainActivity type=1 }
mFocusedApp=ActivityRecord{fb28cf2 u0 com.enmori.app/.MainActivity t132 d0}
pidof com.enmori.app -> 21721
```

## Boundary

This clears the previous APK build blocker and provides a bounded device smoke check. It is not Q04, not accessibility validation, not UAT, and not controlled backend integration evidence.