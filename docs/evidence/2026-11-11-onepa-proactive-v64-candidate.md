# onePA and OpenAI proactive v64 — reviewed candidate

Date: 11 November 2026. This is candidate evidence, not a deployed-service, phone UI, paid-model, notification-delivery or two-month acceptance record.

The candidate includes the already deployed Admin v63 changes, the approved minimal OpenAI proactive integration, and the measured onePA repair. Runtime source through `420adfd9` was compiled with the pinned Node 24.19.0/TypeScript toolchain. `3ce6ea31` adds only the successful onePA evidence; it changes no runtime source. The current source tree was clean before packaging.

## Validation

- Full compiled Backend suite: **1,906 passed, zero failed/skipped**. Azure entry/configuration suite with its required experimental module-mock flag: **6 passed**.
- Proactive Flutter implementation: **140 focused tests passed**, including its withdrawal/recovery paths. The subsequently changed source-wait clients have **13 passing focused tests**, including a response after the old timeout and a late response rejected after the new deadline without resending.
- Final `flutter analyze`: no issues. Signed release APK build: passed. The build uses the existing group-signing identity and existing Firebase configuration, with the approved companion flow enabled. A stale Android guard that rejected the combination of cloud AI and the native companion was removed; exact group host/native-Firebase checks remain.
- The Backend's five real Firebase Admin SDK tests passed in the guarded temporary emulator, including consent withdrawal, lost publication acknowledgement, replacement epoch and protective push-off. See [proactive evidence](2026-11-11-openai-proactive-integration.md).
- Independent final source review confirmed the optional exact `firstFlow` tuple, claim-before-composition order, one shared AI/quota/monetary owner, original per-account consent generation, unknown-outcome preservation and compatibility with the current manual v63 claim procedure. No blocking source issue remained.
- The corrected onePA candidate completed a real read inside the current Azure container in **135.901 seconds**, yielding five pages, 50 unique PA IDs and 17 projected future events. It correctly ignored a late identical first-page response, matched the subsequent DOM pages and left zero of its 17 owned processes. The old 90-second failure is retained alongside this evidence. See [onePA acquisition evidence](2026-11-11-onepa-recovery/README.md).

The measured wait budgets are source 180 seconds, aggregate 210 seconds and affected clients 225 seconds. Ordinary reads/writes, AI execution limits and Check-in-only Friend Activity retain their existing limits. A single successful acquisition is not repeated-load or uptime evidence.

## Signed Android artifact

- File: `/home/miku/Downloads/ENMORI-proactive-v64-release.apk`
- Package: `com.enmori.app.group`; versionCode **64**; versionName `1.0.0-demo20261111`.
- SHA-256: `3f6f85b8e9f647e5eb4cca6f994c80c91c2ad0340142c7671200c46581e3d64c`.
- Signer SHA-256: `0fa59aeaa9ce03a830405ce79136b4abc3d62510fbb8360c8ebf7c88a82966ee`, matching the existing installed group app.
- Native Firebase messaging resources are present. Presence does not establish permission, registration or physical delivery.

## Same-host deployment packet and scope

The user's existing instruction is to deliver the repaired usable demo; the subsequent “按最小方案实施” selects the exact proactive contract. The proposal requires a final reviewed candidate and operational confirmation before deployment. Its implementation-only record's initial exclusion of production arm is a staging boundary, not a separate user instruction cancelling the requested working repair. This paragraph records the operator interpretation; it is not a new PM quote or an approval of unrelated infrastructure. Complete the reviewed candidate and concrete operational checks before applying that existing deployment scope.

Use the current v63 package `2026111110320863.zip`, source `b64ad02bb36aaf531be51e86ab7583ab67b63d56`, SHA-256 `ab0547ed4e1d2c2694f358e64e4027db4e7bbecf08d2b1d297c808b2e2f03371` as the preserved rollback source. Build a new package, verify every entry, then prove complete platform/local stop and drain before capturing a fresh one-use claim from the then-current fence. Never reuse the consumed v63 claim.

The private configuration change is limited to that fresh claim and the approved exact `firstFlow` tuple. Preserve the existing API key, Firebase identity, model/rate configuration, grant, original US$3.40 cap, freshness/expiry, all charges, reservations and attempts. Compare the complete ledger and attempt inventory before arm/start, and verify preservation after the new owner starts. Keep the previous package and every intent/receipt. An uncertain network result is reconciled read-only before any further mutation.

APK update uses `adb install -r` after package/signature checks, without uninstall, data clearing, logout or changing the main user's profile/consent. Installation and retained data must be reported separately from an observed authenticated phone UI.

No per-account proactive switch, consent, schedule or notification permission is enabled on behalf of the main, friend or Admin account. No paid model test is authorized by this packet. Automatic restart ownership and purchased-credit successor proposals remain unapproved, and current evidence/credit expiry is not extended. Physical notification arrival, Singapore/Australia teacher use, actual funding after recharge and two-month operation remain unverified.
