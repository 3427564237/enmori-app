# Admin v63 — Backend deployment and retained phone session

Verified on 11 November 2026, approximately 18:53 Singapore time, under [LI's explicit deployment/install decision](../../decisions/2026-11-11-li-admin-v63-deployment.md). This adds runtime and physical-phone evidence to the earlier [source/build record](README.md); it does not rewrite that earlier verification boundary.

## Backend

The existing Azure service `enmori-backend-20261029.azurewebsites.net` is running package `2026111110320863.zip`, source `b64ad02bb36aaf531be51e86ab7583ab67b63d56`. Its SHA-256 is `ab0547ed4e1d2c2694f358e64e4027db4e7bbecf08d2b1d297c808b2e2f03371`; all 8,540 entries were verified and the active selector/package were independently read back after startup. The previous v62 package remains available.

Package preparation initially exceeded the operator request timeout. Read-only reconciliation proved the original preparation completed; it was not resubmitted. Before activation, the old application containers were confirmed stopped, public HTTP returned the stopped-site response, and the local service remained inactive. A fresh single-use startup claim was captured from the then-current fence while stopped. Only that claim changed in application settings.

Azure's startup probe succeeded after 249.06 seconds. Application logs show Node 24.19.0, the armed cloud configuration, successful Firebase read, and the listening phase. Runtime generation advanced once from 81 to 82. The original grant, spending, unknown reservations and all 105 attempt records remain unchanged; no model call was added by verification. Spent amount is 101,226,700 nano-USD and reserved amount remains 4,096,000 nano-USD. This is startup/configuration evidence, not a fresh AI generation test.

Read-only checks passed:

- Existing demo administrator profile and all 16 interest tags match their pre-deployment response hashes.
- Administrator status, category and operation-record endpoints return 200. The new category catalogue and operation records are empty; no fixtures were added.
- The same three endpoints return 403 to the existing ordinary account; unauthenticated status access returns 401.
- Both existing test accounts can read their completed onboarding and profile.
- Passive status correctly leaves unobserved onePA state unknown. Reported AI readiness does not assert a live generation succeeded.

## Physical phone

The connected Vivo V2405A was updated from v62 to v63 using `adb install -r` and the original signing certificate. Package identity is `com.enmori.app.group`; the installed version reads back as 63 / `1.0.0-demo20261111`. The first-install time and data directory are unchanged.

The original account remained authenticated. After service readiness, explicit read-only refreshes showed the same account identity, avatar, profile, existing interests and previously saved Check-ins. No login prompt, credentials entry, logout, uninstall, application-data clearing, account switching or product edits were used. The phone was left on Home. Startup/service errors and cached profile errors recovered after readiness and refresh. Current-location lookup still falls back to the existing home area; location behavior was not changed or accepted by this task.

Phone screenshots contain private profile and Check-in content and remain outside Git. The [machine-readable deployment record](deployment.json) contains sanitized observations and screenshot hashes, not their contents, account identifiers or authentication material.

## Evidence limits

Deployment, APK installation, retained session/data observations and authenticated API access are verified. Real Admin mutations, physical-phone Admin journeys under an administrator account, 24-hour physical audit cleanup, complete phone UAT and Release acceptance are not claimed. No real category assignment was created, no roles were granted and no additional paid AI probe was performed. The older-APK `managedCategory` rollout constraint in the source record remains applicable. No remote-main merge or push occurred.

Rollback requires the same stopped/drained procedure and a new claim from the current fence; retaining the previous ZIP does not authorize restarting with an already consumed claim.
