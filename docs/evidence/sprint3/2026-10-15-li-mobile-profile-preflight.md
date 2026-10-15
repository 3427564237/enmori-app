# LI real-device mobile profile preflight correction

15 October 2026 SGT. New product **f1d884c8e4d77686b41c43c58a109fcb0768714e**, over accepted ZHOU #1147f45b0656d608fdbf2dcdaba846eeaaa0a4214cb. User connected the designated Android and authorized additional small progress increments and subagents. This correction is two operator/test files; Backend, Dart/Android target, API, dependencies and the finite one-call model policy are unchanged.

## Actual failure and root cause

The first unchanged #114 attempt on vivo V2405A/API36 exited2 with modelPosts0, no mobile credential delivery, terminal local app, cleanup confirmed, no hold and all private profiles/required ports removed. It did not install or prove the journey. Its safe report is retained locally as `li114-actual-mobile-first-failure-20261015.log`.

An independently repeated noninstalling dedicated build under the same isolated credential/toolchain environment passed. Fresh-profile Dart version emitted82 bytes valid pinned-version text. The exact Flutter `--suppress-analytics --version --machine` command exited0 but emitted1229 bytes: the611-byte JSON plus first-run consent text. Strict JSON.parse correctly refused it. Pinned Flutter/unified_analytics source confirms `_showMessage` is set for a fresh tool profile and `exitWithHooks` appends the notice. No private fixture identity is needed to reproduce.

The first hypothesis, setting `DASH__SUPPRESS_ANALYTICS=true` earlier, was insufficient: actual fresh-profile output still1229 bytes/invalid JSON. Its misleading37 green doubles were not accepted as a fix. The fixture was corrected to model this observed behavior: the notice disappears only after profile initialization, independently of the environment variable. The corrected regression fails the env-only patch. Original failure and failed hypothesis remain retained.

## Minimal correction and verification

Keep telemetry suppressed for all tool commands and run fixed `flutter_tools.snapshot --suppress-analytics --disable-analytics` once in the caller's already-owned isolated profile before strictly parsing the machine-version command. The command only opts out in that temporary HOME/config and does not build/install or restore host preferences. No JSON stripping, relaxed version/schema, reused host HOME or silent fallback is added. All package/signature/runner-hash, Auth/credential, one-generation, remote settlement and cleanup guards remain.

Actual fresh-profile initialization exit0 followed by strict version parse exit0:611 bytes, stderr0, Flutter3.47.2/Dart3.13.2. Both temporary diagnostic profiles removed. Owner regression red1/1; more accurate env-only regression red1/1; final operator37/37, zero failures/cancellations/skips/todo, exit0. Explicit artifact/process/model doubles remain doubles. A separate subagent performed read-only source review and found no blocker; that is not ZHOU's formal peer acceptance.

Command: `node --test tool/zhou_real_model_store_probe.test.mjs tool/zhou_mobile_network_fixture.test.mjs tool/zhou_mobile_fixture_credentials.test.mjs tool/controlled_qwen_followup.test.mjs`, using existing Node24.19.0. Whitespace Pass. No dependency installation or unchanged full product-suite rerun.

The corrected exact-source actual Android/model journey is running separately; no success is claimed by this preliminary report. ZHOU is requested to review the small new correction. Device/runtime results will retain the final product identity; original #114 acceptance is not rewritten. No ordinary network APK, long-lived cloud store, Event/browser, UAT/Release/Done or main-merge claim.

## Subsequent actual device observation and safe stage diagnostics

On productf1d884c8 the original preflight defect is cleared: the device built/installed the generated runner, both dedicated APK/signature inspections passed and credentials were delivered. PrebuildSHA5dcd14d85cf7eef260addf8b7dfc09cab02fb1813572375df7b7d878e5bc0981 differs from actual runner60eaf4dc704bd9d0bae8858286a4371a3ccb60356a9cc1f67ba26fa2932b09d1 as the #114 source predicted. The journey subsequently failed before any model POST/readback. Credential/fixture/local-handle cleanup all true, no hold, both profiles/ports released. Do not turn successful installation/handshake into a passed AI journey. The safe full observation is retained as `li-mobile-preflight-fixed-actual-20261015.log`.

New product **ac646162e7c21c57caf64fe24e292709f1cc77d6** adds12 fixed non-content stage markers to the integration target and double-allowlisted `mobileLastStage` output in the operator. No original stdout, dynamic identity/content, SDK errors or arbitrary marker value is emitted or retained. All original assertions, timeouts, auth/credential, model/generation and cleanup behavior remain. This diagnostic source is separately attributed from f1d884c and #114. Final operator39/39 passes, with new unknown/trailing-marker suppression and outer whitelist tests; target scoped fatal-info analysis no issues, format0 changes and whitespace Pass. Actual staged run is being recorded separately.
