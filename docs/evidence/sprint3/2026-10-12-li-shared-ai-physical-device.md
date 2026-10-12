# LI #85 — actual shared AI flow on the connected physical Android device

12 October 2026, Asia/Singapore. The human LI connected the phone and authorized
continuing the assigned tests. This supersedes only the earlier local device
Not Run observation in [the shared composition checkpoint](2026-10-12-li-issue85-ai-shared-composition.md).
It is LI owner execution evidence, not DU independent review or JIN's full new
gate. All preceding failure/source/attribution records remain.

## Exact source and actual execution

Tested published head `02a7d27e040f5b1d4a31b1ce7c3694e8505f5af6`; executable
shared implementation `31a3baadafe0fb828231b3e18b9ac3e4cf927eba` and device
wrapper `0105f580e74ec70a15318d67a5db3ad044401ee1`. Later commits are evidence only.
The actual command was pinned Flutter 3.47.2 / Dart 3.13.2:

```text
ENMORI_PERSONA_ANDROID_TEST=true fvm flutter test --no-pub --reporter expanded integration_test/ai_shared_router_flow_test.dart -d <connected-test-device>
```

Before execution, the standalone integration target built successfully (31.9s).
The actual Flutter test invocation rebuilt successfully (29.5s), installed its
APK (18.3s) and ran all **7/7 cases Pass**, reporting `All tests passed` after
31s of device tests. Full outer process exit **0** was separately recorded.
Existing Kotlin/SDK warnings remain, with no plugin/dependency upgrade.

Physical device: **vivo V2405A, Android 16/API 36**, 1260×2800 pixels, font scale
1.0. adb reported one authorized physical device; preflight observed awake and
no keyguard. No serial, debug-service URL/token, account data or raw log is
published. The device test runs the actual Home/router, page/controller and wire
mapper with the explicitly labelled synthetic Auth/transport; no actual
Backend/Firestore/context/model or provider is composed.

Cases reuse the exact seven widget assertions: real AI builder from Home with
independently absent History/null real Backend URL; synthetic Send and authorized
reread after Back; actual existing Settings route and return; Stay or request-
cancel-and-leave before System Back/Settings during pending execute; unknown
protection without automatic resend; same-UID replacement and observed logout
remove old input/view and do not resume the old attempt. System Back is the
integration binding pop-route callback, not a physical hardware-key/audio test.
These are seven actual device executions of the same seven logical cases,
not additional cases added to the earlier 478-unit/widget numerator.

## Package isolation and settled readback

The phone already had `com.enmori.app`. Its versionCode/versionName/lastUpdateTime
were privately checkpointed before testing. The existing repository debug-only
`ENMORI_PERSONA_ANDROID_TEST=true` suffix was reused without an Android source or
configuration edit; aapt guarded **`com.enmori.app.personatest`** before install.
That package was absent beforehand. This identifier hosts an AI fixture in this
run; no Persona PC13 result is claimed. No ordinary package replace/uninstall or
app-data clear command was issued.

At the **20:33 SGT** post-run readback, the dedicated test package was already
absent; no explicit uninstall was needed. Existing ENMORI version/name/update
checkpoint matched byte for byte and font scale remained 1.0. This confirms the
observed installation metadata, not an inspection of private app data. No new
Auth/Firestore process/profile was started by this synthetic fixture and no
broad adb/process/port cleanup was performed.

The installed test APK could not be independently reread/hashed because its
package was already absent at that checkpoint. Do not represent local APK
fingerprints as an independent installed-binary hash. The pre-install guard
build and Flutter-test output APK differ; keep their identities separate:

| Local artifact | Identity |
| --- | --- |
| Pre-install guard build APK | SHA-256 `a264b754514d63bc7ffb39083fcb3585504cdae9b198c74d9b93361427fbf548`, 167,036,088 bytes |
| Actual Flutter-test output APK | SHA-256 `282eb94db30af47578d3a0789f3ec9bd47b5cc3dd22bbb18e7453254fe32eed3`, 167,035,943 bytes |
| device-tests.log | SHA-256 `65d416a538db5ce52f97fc34e9ab2284a5f9eb4ae3c5b56fa273c7d61dc969d2` |
| device-test-build.log | SHA-256 `20490cca99787ddab29fc1deb08dd51c1f581ee8f9e95375218458278cb56271` |
| device-completion.json | SHA-256 `48cdbc2ce7041e6089c2fbc59d5e0d56409fd6da9c1f8199f8ec41fd5ca43aa5` |

Actual device output APK is retained locally under ignored
`build/li85-device/shared-ai-device-test-02a7d27.apk`; the earlier standalone
shared harness APK is separately retained as `shared-ai-harness-31a3baa.apk`.
Raw artifacts and private checkpoints stay local. This run had no new failed
product/device check; prior widget timing failures remain in the earlier packet.

## Remaining scope

DU independent review of LI shared code, DU History delivery/binding and JIN's
applicable full changed-candidate gate remain separate pending work. This actual
phone result does not close them, certify real persistence/model/unknown recovery,
complete source cleanup, font-2.0/TalkBack/global accessibility, whole M26/Sprint,
UAT or Release. Keep Draft/Open; no merge, Issue closure or Project transition.
