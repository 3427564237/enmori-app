# onePA and OpenAI proactive v64 — deployed evidence

Date: 11 November 2026. Builds and source checks are in the [reviewed candidate record](2026-11-11-onepa-proactive-v64-candidate.md). This record separates the live Backend from Android installation, paid scheduled execution and long-term operation.

## Active Backend

- Source: `ae6a1d831a616a9c26b4deaf3c3899a4d0d474d1`.
- Active package: `2026111111272164.zip`; SHA-256 `2bc82cfbffc951dff0e1c663f55437a9be1ab79bb70af7070438d31e862bd237`; 68,024,615 bytes, **8,543 entries verified individually**.
- Previous v63 package `2026111110320863.zip` retained. No dependency, host, plan, region, subscription, key or startup-script change.
- Old application container termination was positively observed at `2026-11-11T11:29:39.316488Z`, with all seven observed historical application containers accounted for and the local service inactive/disabled. The first read-only drain check occurred before termination evidence settled; a later read-only check proved completion before any activation/claim.
- The latest application's configuration event occurred at `11:36:44.7757943Z`; listening at `11:38:29.3620117Z` reported `firebaseRead:true`, `aiConfigured:true`, **`aiAvailable:true`**. The platform reported a successful startup probe after 284.085 seconds. This is one cold-start observation, not an availability guarantee.
- ARM reported Running; the active package selector matched v64 and the complete settings hash matched the intended write. Only a fresh single-use claim and the approved exact `firstFlow` tuple changed. The SDK readback verified runtime generation **82 → 83**.
- Post-start readback retained the original grant/cap, all **105 attempts / 103 reconciled attempts**, **USD0.1012267** confirmed charges and **USD0.004096** reservations. Every prior attempt and the non-owner ledger fields matched the pre-start snapshot. No model call was added by deployment or these checks.

The SCM VFS `site/wwwroot/deployment-manifest.json` lookup returned 404; this is not treated as the application's mounted-file result. A separate small app-container read initially timed out while the public-source request was running. Neither observation is evidence of a version mismatch. Package construction/activation hashes, selected package, compatible live configuration and newly available proactive routes are the verified evidence above; any later mounted-file observation is recorded separately.

## Authenticated functionality

The retained demo Admin signed in and received 200 for Profile, onboarding, Admin capability, interest tags, operations status, Event categories and operation records. The existing profile hash and all 16 interest-tag records matched the pre-update reads. Empty category/audit lists are reported as empty; no fixtures or assignments were created to manufacture coverage.

The retained friend-demo ordinary account signed in and received 200 for Profile/onboarding. All three Admin feature routes returned 403 for that account, and an unauthenticated Admin read returned 401. Ordinary access was not promoted.

The friend-demo account received 200 from proactive settings, active intents and registration. It remained **mode off, push off, zero intents, unregistered**. No consent, schedule, settings or device permission was changed for any retained account. These reads demonstrate deployed composition and management routes; they do not demonstrate a due OpenAI execution or physical FCM delivery.

## onePA through the deployed public API

One authenticated `GET /v1/event-browse` using contract v3 completed in **165.090 seconds**. Both Ticketmaster and onePA reported `available:true`; this first API page contained 25 items, including six onePA items. Following its actual opaque cursor completed in **2.518 seconds**, with both providers still available and 28 items including eight onePA items.

The two observed pages contained **53 unique items, including 14 onePA activities**. Further pagination remained available: this was a bounded two-page API observation, not an exhaustive public catalogue. Independently, the same candidate source had previously validated all five approved upstream pages/50 unique PA IDs and projected 17 future activities inside Azure; see [the retained acquisition evidence](2026-11-11-onepa-recovery/README.md). No invented fixture, partial upstream success or automatic retry was substituted.

The actual first-page time exceeded the old client deadline and fit the approved measured source 180 / aggregate 210 / affected-client 225-second budgets. Do not promise that every future first read will take this time or succeed.

## Android and remaining boundaries

The signed v64 APK is available at `/home/miku/Downloads/ENMORI-proactive-v64-release.apk`, with the package/version/hash/certificate recorded in the candidate evidence. One `adb install -r` attempt returned **`INSTALL_FAILED_ABORTED: User rejected permissions`**. Package readback at `11:34:35Z` still showed **v63**, retaining the earlier first-install/update times. No uninstall, data clearing, logout, permission bypass or automatic installation retry occurred. A user question offers manual APK installation or a newly authorized install attempt. Authenticated v64 phone UI has not been observed.

A private, reviewed synthetic protocol can verify exactly one canonical Conversation reply and one due OpenAI follow-up, with at most two generations / USD0.08192 worst-case reservation inside the original USD3.40 cap. Its local plan, syntax and protection checks passed. It has not run: the prior one-call Persona permission was already consumed, and the separate two-call question is pending. No FCM registration or physical notification is included in that protocol.

The service still uses the existing manual one-use owner claim. Automatic restart ownership and the purchased-credit successor remain proposals awaiting LI's answers. Current balance/price evidence expires **12 November 00:00 SGT**, and the retained gift credit grant expires **18 November 00:00 SGT**. Neither date was extended during deployment. This candidate is **not** an Android freeze, a two-month readiness claim, iOS work, teacher-account creation or cross-region phone acceptance.

Private operator intents, receipts, logs and protocols are retained under `/home/miku/.local/state/enmori-proactive-v64-20261111`; credentials and raw private configuration are not committed.
