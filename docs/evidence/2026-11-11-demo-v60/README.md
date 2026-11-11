# Immediate demo v60 — 11 November 2026

Authority: [LI immediate demo and all-account decision](../../decisions/2026-11-11-li-immediate-demo.md).

Android v60 uses the existing approved Sol/OpenAI Dart defines, original package and signing identity. It was installed with `adb install -r` on the connected phone; package readback confirms versionCode 60 and 1.0.0-demo20261111. No uninstall or clear was performed. Login retention and complete user journeys were not visually reverified.

Event list/recommendation client budgets increase to 120 seconds; Azure source to 90 seconds, with bounded onePA stage limits. A public onePA diagnostic on Azure still failed at 91.733 seconds. Longer deadlines do not establish onePA availability.

Verification: Flutter 43 directed tests, 5 Event read-budget tests (including two 45-second simulated success cases without resend); complete static analysis; Backend/entry/Event 46 tests; AI/runtime/conversation 867 tests. All passed. The all-account admission test failed on the original UID-restricted composition before the repair and passed afterward. Normal authentication failures remain failures; downstream account/consent/owner checks remain.

The first release build failed after concurrent Flutter tooling regenerated an integration-test plugin registrant. A sequential rebuild succeeded. A local-processing APK build was discarded after configuration inspection; only the explicit OpenAI build was installed. Final APK metadata and hash are in apk.json.

The first Azure upload disconnected before a new deployment was received. Readback confirmed the prior active package and completed deployment; a reconciled submission of the 90-second package completed and its hash was verified. The all-account increment is tracked separately.

Current limitations: onePA is not restored; Persona/proactive OpenAI paths remain outside the implemented cloud Conversation lane; no iOS, dual-phone, full UAT, or Release acceptance is claimed. Cloud freshness uses LI's current balance/expiry report and current official pricing, within the original US$3.40 cap and original credit cycle, preserving all attempts, charges and holds.
