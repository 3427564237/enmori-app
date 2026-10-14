# LI offline interactive APK — explicit delivery scope

- Authority: human LI HOURUI / PM, 13 October 2026, Asia/Singapore.
- Request: “先发给我一个可以部署在手机上使用的版本，内测版也可以”.
- Selected preference: “先给离线交互内测版，装好即可用”.
- Scope: local, developer-signed Android offline interactive delivery, using
  the existing explicit synthetic Home/AI entry. No real account, datastore,
  model, deployment, ordinary bootstrap or new product behavior is enabled.

The local mobile candidate combines accepted #94 bfee363 and accepted #96
67056c7. Candidate commit `2406bc88abf227c665e3b7e3e8a4d37c1ed1325c`, tree
`4588aaa2d0b60045a6771582a9116b836b8ed1f3`. No production source was edited for
packaging and no branch was merged into main. This local APK does not replace
JIN's ongoing #94 source-bound real-persistence/combination gate or declare
the new combined tree formally accepted.

Build entry is `lib/ai_home_router_harness.dart`, with the existing debug-only
`ENMORI_PERSONA_ANDROID_TEST=true` package suffix. Result package
`com.enmori.app.personatest` is separate from ordinary `com.enmori.app`.
Automatic synthetic sign-in, Home/AI navigation, scripted in-memory responses,
current-session operations and the accepted R-A client correction are available.
History and other Backend-dependent routes are not offered as usable offline
services; Settings can open but cannot save to a real Backend.

Actual candidate validation: Flutter505/505, strict analysis no issues; debug
ARM64 APK build exit0, signature verified, minSdk24, targetSdk36, testOnly false.
No USB target was attached at this delivery checkpoint; this APK has not been
manually installed on the user's phone. Earlier component device evidence is
not relabelled as this binary's execution.

Artifact: `ENMORI-Offline-Internal-20261013-arm64.apk`,89.4 MiB;
SHA256 `10576cd2e8c9a5915e2011323635dcba4a0d102a5358e3b37abac3021b9bd052`.
The APK, Chinese instructions, checksum and source/build receipt are local under
ignored `build/distributions/offline-20261013/`; binaries and signing material
are not committed or publicly uploaded. Synthetic input/data stays in memory
and is lost when the process is fully restarted. No backend configuration,
real credentials or network service is required for the offered Home/AI flow.

This is a user-selected internal interactive preview, not a full ENMORI/Sprint,
real AI/persistence, device-accessibility, UAT or Release completion claim. No
merge, task closure, Project transition or replacement deadline is authorized.
