# Startup and explicit Retry: v85 deployment acceptance boundary

Prepared17 November2026 SGT before this round's emulator evidence. Source review
baseline: `a2ae6b9f8f92a7410277b9372e994fe07d4c30f8`.

Authority: [LI's v85 deployment decision](../../decisions/2026-11-17-li-v85-deployment.md).
This is a bounded verification plan for existing behavior, not a new product
rule or a release-readiness claim. Root alone deploys and operates the emulator.
The independent reviewer reads source and resulting private evidence only.

## Required version correlation

- Approved backend archive SHA-256:
  `7b2ffcccbf6c129ccaa839de1fced57125e2c41e33a5f746dc444189fcbe4140`,
  source `9fb0e7c9bfc27ca860da66c83e39d9f6245564f4`.
- Unchanged v84 release APK SHA-256:
  `b544dde5ba9060b5fb20ce822ec19a6f44e6e96c9c268e3664122afed0a581d0`.
- [Installed APK receipt](installed-apk-receipt.json): Android API 36, x86_64,
  read-only AVD session. Independent hashing of the retained installed APK
  matches the v84 SHA-256 above. [Deployment receipt](deployment-receipt.json)
  records the approved v85 archive, source and mounted-manifest identity.
  These are this round's bindings; prior v78 recovery is separate evidence.
- Use the existing dedicated test identity, preserve its account and product
  state, and restore temporary network settings. No physical-phone operation,
  AI send, grant renewal or unrelated product mutation is part of this flow.

## Predeclared observable checks

No new latency SLA is invented. Distinguish awaiting a result, a terminal error,
and a recovered page; capture intervals are not HTTP timings.

| Check | Controlled procedure and required observation | Current bounded status |
| --- | --- | --- |
| S1 Online startup | With the retained dedicated identity, launch the matched APK against v85 and observe authenticated Home with New Check-in. No generic startup error remains. Record whether launch is cold, force-stop/relaunch or a new Activity after Back. | Passed: recorded COLD launch; Opening at 22:16:07, Home/New Check-in at 22:16:40 SGT |
| S2 Offline error | Disable emulator Wi-Fi/data, then perform the selected startup trial. Observe explicit Service unavailable and Retry; do not interpret the generic text as evidence of backend503 or a historical cause. | Passed in both controlled force-stop/relaunch cycles; offline Retry also returned the explicit error |
| S3 Explicit Retry waiting | While the selected retry remains pending, show Opening your space with the existing progress indicator and no active Retry/error panel. If the operation settles too quickly to capture, mark waiting **not observed**, not failed or passed by filename. | Passed: visually checked maintenance and both network-restored immediate Retry frames; waiting during the offline-only retries was not captured |
| S4 Recovery | Restore the original network settings, select explicit Retry, and observe Home/New Check-in with the generic error gone. Do not silently infer successful recovery from the waiting frame. | Passed: maintenance recovery and both controlled network-restored cycles; Home at 22:26:09 and 22:26:23 SGT |
| S5 Repeat and normal re-entry | Repeat the bounded offline/recovery cycle and separately Back-exit/reopen online. Keep separate timings and results; new Activity initialization is not a same-Activity state-loss defect. | Passed: two cycles, then Back to launcher and online reopen; Opening recorded at 22:26:28 and Home at 22:26:32 SGT |
| S6 Cleanup and identity | Confirm network restoration, retained account, unchanged installed APK/backend identity and absence of a physical-phone/AI operation. Report only observed product-state preservation. | Passed within the recorded scope: exact package/backend binding; cleanup receipt at 22:33:03 SGT records both network settings enabled, app stopped, owned dump removed and read-only emulator closed; no account reset, phone operation or AI call reported |

The repeated-activation read-count guards have source/widget evidence in the
[v84 startup repair](../2026-11-17-stable-followup/startup-review.md). Seeing Retry
disappear on an emulator does not prove an exact number of HTTP dispatches.
No new request logger is authorized for this deployment.

## Verified maintenance-recovery checkpoint

The root operator supplied the first post-deployment evidence. This independent
review read the local XML/receipt and visually inspected the immediate Retry
screenshot; it did not operate the emulator or phone.

- `mounted-after-ready.log` reports a successful **actual application-container
  mounted-manifest** check, from22:07:49 to22:07:58 SGT: demoVersion85, source
  `9fb0e7c9bfc27ca860da66c83e39d9f6245564f4`, manifest SHA-256
  `b3a07766fb2cfbbc011683f0d1fd2b909ab609ab48b82aa8225912ba75bc4246`.
  The mounted source matches the approved backend package's source. The full
  archive/selector and installed-APK identity receipts are linked above;
  they are not inferred from a screenshot.
- The emulator maintenance-start XML shows **Service unavailable** and Retry,
  with no Home. This is a maintenance-window observation, not this round's
  controlled-offline test and not attribution of the old SC-15 incident.
- After the API was ready, the immediate Retry screenshot visibly shows
  **Opening your space…** and a spinner, with no Retry or error panel.
- The recovered XML contains Home and New Check-in, with no generic startup
  error, waiting text or Retry. The operation receipt identifies v84 Android
  emulator recovery and records Home observed by22:07:58 SGT.
- The receipt records that ENMORI was then stopped before the independent
  HTTP expiry window. That window, later cold starts, two offline cycles,
  Back/reopen and final cleanup are not counted as completed by this checkpoint.

This verifies visible waiting and successful explicit recovery against the
mounted v85 service for this maintenance sequence. It does not establish
continuous availability or close either historical SC-15/SC-09 cause.

| Private artifact | SHA-256 |
| --- | --- |
| `mounted-after-ready.log` | `19caa644d31f5848dd0de4d3562213dda84f8b25721c30f002da0cc53f913bbe` |
| `emulator-maintenance-start.png` | `603b847d12603489603d449d1516fe40c523264311fb690639c6814b8075f664` |
| `emulator-maintenance-start.xml` | `c0d805429aa8d754aed0337a98a124c00acf7fe9b7881083b0a12bcff99a3ae0` |
| `emulator-maintenance-retry-immediate.png` | `7961e19559cf8b7ceea7947c26462a55032c93d26001f3efca40bde643e9b7ec` |
| `emulator-maintenance-recovered.png` | `a1382b03126175951ba70118a3a2c23ffef739a533e3cd564d3f22ccf090d20b` |
| `emulator-maintenance-recovered.xml` | `1a96e334b097709b63ba9cb8eed5557664884aaf838934c5e2b1aa1c20553f00` |
| `emulator-maintenance-recovery.json` | `e832eed7b2938f170dbe08ff763e6596b3ef4ac2d8a7daed6b246481173febba` |

## Verified cold start, two offline cycles and Back/reopen

The independent reviewer read the resulting XML, timing/operation receipts and
the local automation source without running it, and visually inspected both
network-restored immediate Retry images. All observations below use the same
v84 APK with the mounted v85 backend on the API 36 emulator. They are not
physical-phone or real-user observations.

- The cold-launch command receipt reports `LaunchState: COLD`. At 22:16:07 SGT
  the XML shows Opening your space; at 22:16:40 it shows the selected Home tab
  and New Check-in, without Service unavailable or Retry. The roughly 33-second
  capture gap is not a measured startup or HTTP duration.
- Cycle one: Wi-Fi and mobile data were disabled before force-stop/relaunch.
  At 22:25:58 the XML shows Service unavailable and Retry. Explicit Retry while
  still offline is again at that terminal state by 22:26:01. After network
  restoration, the immediate image visibly shows Opening your space and the
  progress indicator, without the error panel or Retry. By 22:26:09 the XML
  confirms selected Home and New Check-in, without startup error or waiting.
- Cycle two repeats the same procedure: terminal offline error at 22:26:13,
  terminal error after the offline Retry at 22:26:16, a visibly correct waiting
  frame after the network-restored Retry, and Home/New Check-in at 22:26:23.
  Neither offline-only Retry capture records its intermediate waiting state;
  these fast terminal captures do not demonstrate a waiting-state regression.
- After two Back activations, the retained activity dump identifies the launcher
  as resumed. The operation receipt then records Opening at 22:26:28 and Home
  at 22:26:32 after reopening ENMORI. The final XML independently confirms Home.
  PID 5919 remained the same across this exit/re-entry; that does not establish
  the same Activity or Flutter engine. Normal re-entry is separate from SC-09's
  historical unexplained Home return.
- The cycle receipt records `passed: true`, network restoration in its final
  block and no physical-phone operation. The retained script shows both network
  settings enabled in that final block. The final cleanup receipt below closes
  the remaining selected cleanup checks; neither receipt is a broader
  product-state integrity audit.

The selected S1–S5 procedures passed under these conditions. Both historical
SC-15 causation and SC-09 causation remain unresolved; repeated recovery does
not establish continuous availability or resolve an earlier untraced incident.

| Private artifact | SHA-256 |
| --- | --- |
| `emulator-startup-regression.json` | `364719d1a09763c59083fd6d101cc37071cc8c20140c40072c29189d83e20b89` |
| `emulator-cold-start.txt` | `ace8e34d89a73e93effddfc13169fbe3d412fea97c9273d9e0fcd6d2acbf9e73` |
| `emulator-cold-first-time.json` | `0ac1ce006973b4ef2a2b65a632255d430f3d9dce472f7fc6d094af4e8811a07c` |
| `emulator-cold-home-time.json` | `4fdc04b502fe37094265a90296b2d0173e7463fd0d7f438a4b54fec96b06daa4` |
| `emulator-cold-first.xml` | `55119e4f115e085de39469a3aa4aa90d6f84b85d1471b5d0f024e9ae69a15b9c` |
| `emulator-cold-home.xml` | `4f0ac4da1b4f12772b777e55d91ee369b17b9222612d0155897c044c25db5145` |
| `startup-offline-1.xml`, `startup-offline-retry-1.xml`, `startup-offline-2.xml`, `startup-offline-retry-2.xml` (identical XML) | `d80e9f1c93db71dc59e01946ee935933c73396c1918589a0898dbf058bee3a14` |
| `startup-online-retry-immediate-1.png` | `fdd0d94880561b08b890e3cc09fcdae6df791b534d9956af9efe7ca9a7c3086d` |
| `startup-online-retry-immediate-2.png` | `9ff6001d98cb1be134cbf5079cac10dfaa99976aacd06c99e78d40d86018ce35` |
| `startup-recovered-1.xml` | `8d667302f46b0e91eb9fa7dd4803ddc8ebde4c9e707058e1d62e4c49c2da76d1` |
| `startup-recovered-2.xml`, `startup-back-reopened.xml` (identical XML) | `4f0ac4da1b4f12772b777e55d91ee369b17b9222612d0155897c044c25db5145` |
| `startup-after-double-back-activity.txt` | `7e3495312baa9f247b31eb5e3bdf0aa5c0c445cb257552861ec9cf4d5545e05d` |

## Final cleanup receipt

The independent reviewer read root's `emulator-cleanup.json`, recorded at
22:33:03 SGT (14:33:03 UTC), without running a device command. The receipt
records emulator identity confirmation before actions, Wi-Fi and mobile data
enabled before close, ENMORI force-stopped, the operator-owned UI dump removed,
and the owned read-only AVD closed. Its explicit emulator connection check
then confirmed that device was no longer connected.

The receipt also records no physical-phone operation, no account deletion or
reset, no participation/profile mutation, no AI grant renewal and zero model
calls. Authenticated Home was observed with the retained dedicated identity;
this is not an audit of all account data. Any before/after API body-hash match
elsewhere in this deployment's evidence establishes only the corresponding
responses in that observed window, not universal data integrity.

S6 is complete for the stated emulator/network/owned-artifact cleanup and
version-binding scope. Raw device evidence remains private. This does not add
physical-phone acceptance or close the historical startup-cause gaps.

| Private artifact | SHA-256 |
| --- | --- |
| `emulator-cleanup.json` | `68b73cd1edc413e02cc9c6007f2b17b6c74ee2b6c6f9ff00dc0bc0ea3d02fb3a` |

## Independent review of the additional account-support transaction

The remote GET /v1/me/onboarding path remains:

1. Verify the Firebase identity, including the existing revocation check.
2. Read binding/account using GetOnboarding and FirestoreOnboardingRepository.
3. For a completed remote account, await `initializeOwner(uid)` in
   [retained-core-runtime.ts](../../../backend/src/bootstrap/retained-core-runtime.ts).
4. Serialize the completed account result for the client's existing parser/gate.

The third step initializes **account-support records**, not the AI service-owner
lease. [The ordinary-account decision](../../decisions/2026-10-29-li-ordinary-account-companion.md)
explicitly requires the same account/persona/purpose initialization during
ordinary onboarding and login. It is not a new side effect of v85.

The callback reads the binding, account and five support documents before any
`set`/`create`. Missing documents are collected first. Existing support documents
are left intact; the account is set only when its purpose-revocation generation
is absent, preserving the other observed account fields. The
[Firestore gateway](../../../backend/src/shared/infrastructure/firebase/firestore-gateway.ts)
delegates this callback to the SDK transaction. This inspection found no read
after write ordering error or unconditional overwrite of those existing records.
It does not prove that every real transaction succeeds or that the incident
account had every expected record at20:30.

A failed extra transaction still prevents the GET from completing and is safely
mapped to503 by the existing framework handler. This is a possible failure
stage, **not a reproduced implementation defect**. Moving, dropping or making
this prerequisite best-effort would change established initialization semantics
and is not justified by the available evidence. No production/test/logger change
was made by this review, and the already-run offline diagnostic matrix was not
rerun merely to increase test counts.

## What further existing read evidence can establish

| Evidence | Narrow conclusion and limit |
| --- | --- |
| Authenticated onboarding200 with `status: completed` | That particular request passed identity verification, the account lookup, the awaited account-support initialization and response serialization. It does not reveal whether missing records were created or prove the historical request did the same. A200 `required` response does not exercise the support-initialization branch. |
| Profile200 before/after | Establishes those profile requests succeeded. Profile does not exercise the same awaited account-support step; separate requests cannot exclude an intermittent token/dependency failure in the onboarding request. |
| Emulator Home after fresh startup | Establishes the visible authenticated path recovered. It is not a transaction-stage receipt or a global data-integrity audit. |
| Generic Service unavailable | Still compatible with auth observation/token/native transport failure, a backend dependency failure or an invalid response. The same text is not unique to a backend503. |
| Later successful response and its offline replay | Excludes a persistent parser mismatch with that specific successful payload. It does not exclude a different malformed incident response. |
| No incident-window restart in retained operational logs | No matching restart is recorded; request-level completeness or dependency health is not established. |

The prior [source/Android/Azure investigation and eight offline cases](../2026-11-17-backend-expiry/startup-diagnosis.md)
remain applicable. No available20:30 client/server request-stage correlation
identifies the original SC-15 cause. onePA/detail projection and AI monetary
grant are not direct dependencies of this account chain; shared host/network
failures remain independent possibilities. The v85 expiry repair cannot itself
close SC-15 or SC-09.

## Result handling

Append only independently checked outcomes and sanitized hashes after root
finishes this round. Keep UI, HTTP, source/widget, Android emulator and physical
phone evidence distinct. Private screenshots/XML/logs remain under
`/home/miku/.local/state/enmori-v85-deploy-20261117/` and do not enter Git.

A passing selected flow demonstrates v84/v85 recovery under its recorded
conditions. It does not establish sustained availability, the initial SC-15
root cause, historical v79 Home-return causation, physical-phone acceptance or
overall release readiness. AI renewal remains deferred.
