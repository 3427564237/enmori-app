# v64 installation and two authorized OpenAI generations

Authority: [LI's explicit implementation and test approval](../decisions/2026-11-11-li-teacher-stability-implementation.md). Runtime: the [verified v64 deployment](2026-11-11-onepa-proactive-v64-deployment.md), source `ae6a1d831a616a9c26b4deaf3c3899a4d0d474d1`, package `2026111111272164.zip`. No server deployment/configuration change occurred during these checks.

## Retained-data Android update

The newly authorized `adb install -r` succeeded after LI handled the phone confirmation. Readback at 12:09 UTC / 20:09 SGT showed package `com.enmori.app.group`, versionCode **64**, versionName `1.0.0-demo20261111`; the original first-install time matched the pre-update record. This follows the separately retained first-attempt permission rejection; it does not erase that earlier outcome.

A read-only screenshot of the app already in the foreground showed the original main account logged in, its existing avatar/profile and prior Check-in content. No account switch, logout, uninstall, data clearing, profile edit or fabricated content was used. The screenshot remains private because it contains real account content; it is not copied into Git. This verifies the retained session on this connected Android device, not every native notification or cross-region flow.

## Live synthetic execution

Before execution, read-only checks verified the current package selector, full intended private configuration hash, active original runtime generation **83**, original grant/cap and 105 prior attempts. The dedicated script then rechecked ownership, verified prices, grant freshness through its full ten-minute bound and enough headroom for two worst-case reservations. It ran once between **12:11:13.959Z and 12:14:23.083Z** (20:11–20:14 SGT).

Only a fresh private synthetic account accepted optional processing and OpenAI disclosure v1. It sent one canonical Conversation message, then created one explicit follow-up using that real saved user-message ID. No canonical source was fabricated in Firestore and the worker was not manually ticked. There was no FCM registration or phone push in this protocol.

1. The one ordinary execute returned 200 in **34.281 seconds** and a canonical `assistant_saved` pair with OpenAI provenance. The reply did not pretend to create an appointment itself; scheduling remained the app's explicit confirmation step.
2. The one follow-up was confirmed for **12:12:43.357Z**. The existing service worker published the follow-up at **12:14:01.949Z**, about **78.6 seconds after due**, within its scan/execution window. The canonical conversation contained exactly the original user/assistant pair plus this one proactive assistant message, carrying its original occurrence ID, one Conversation source and `cloud/openai/openai_cloud_v1` provenance. The synthetic follow-up asked whether the synthetic practice task was finished and did not assume completion.

The shared ledger recorded exactly two new reconciled attempts in the separate observation windows: `test_app` charged **USD0.001334** and `proactive` charged **USD0.001432**, total **USD0.002766**. Each had the original maximum reservation USD0.04096; the combined permitted reservation bound was USD0.08192. Every prior attempt matched by canonical hash before/after both phases and final readback; there was no concurrent activity confounding these observations.

Final ledger: **107 attempts / 105 reconciled**, **USD0.1039927** confirmed spend, **USD0.004096** outstanding reservations and the unchanged **USD3.40** cap. The old unknown holds were neither released nor represented as new confirmed spend. The two-call authorization is now consumed; it is not a standing permission for further paid tests.

## Protective completion and limits

The script reverified its exact owned identity and intent, observed that its one intent was already published, turned only its own proactive mode off with push disabled, withdrew only its own optional/OpenAI consent, and read back those protective changes. The synthetic account, original canonical records and permanent dispatch markers remain private for reconciliation. No recursive deletion, budget reset, paid retry or real-user consent change occurred.

The test proves one real due OpenAI generation and canonical publication through the deployed worker. It does not prove physical FCM arrival, all semantic cases, a future pricing/balance observation, automatic restart recovery or two months of uninterrupted service. The currently approved restart/credit implementation work remains separate. Raw response bodies, credentials, images and financial snapshots stay under the private operator directory `/home/miku/.local/state/enmori-proactive-v64-20261111`.
