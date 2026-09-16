# S2-03 controlled validation: LI prerequisite handoff

- Source ID: S-PM-0916-S2DU-VALIDATION
- Decision owner: LI HOURUI, ENMORI PM
- Scope: clarify existing S2-03 prerequisites and a client-local failure/recovery
  procedure; no product, API, infrastructure or ownership change
- Authority: S-PM-0913-SPRINT2 and [S-PM-0916-S2DEMO-TARGET](2026-09-16-s2-demo-target-confirmation.md)
- Execution status: handoff instructions only; DU integration remains Not Run

## 1–2. Confirmed target and authority

The single approved target is `enmori-rmvp-controlled`. A fresh authenticated
Firebase project inventory again confirms that exact project is `ACTIVE`.
LI's recorded attestation confirms an isolated non-production Demo, separate
from production and from Firebase Emulator. Project existence is observed;
isolation/purpose is explicitly owner-attested, not inferred from the ID.

The complete confirmation and supersession trail are in S-PM-0916-S2DEMO-TARGET
at commit `a0727d2502d8e669feafb17ba57050906a4439c8`, published in PR #37.
The earlier manifest-only target deferral is therefore resolved. Independent
documentation review/merge of PR #37 is still pending; that is separate from
the already recorded PM target decision and is not initialization evidence.

## 3–4. Initialization evidence still outstanding from SHI

At this checkpoint, PR #33 remains at
`db40a4d234b0a9ce715467fb394bd4d6a1dc8476`. Neither its body nor Issue #28 contains
a later actual Demo initializer/execution result. Thus an initialization exact
head, execution time and created/unchanged result cannot yet be supplied.

The fixed source artifact is `s2-event-demo-v1`, six records, independently
recomputed canonical JSON SHA-256:
`d9b5191bccedcdc12544bc66559ffeaf4eae0987c29e121a4f9de9755c6c642b`.
This source head/digest identifies approved input only; it is not a claim that
initialization ran at that head. Earlier Firebase Emulator tests do not prove
cloud Demo initialization.

SHI retains the existing obligation to supply the actual executor commit,
manifest digest, UTC start/end, approved target match, create/unchanged/conflict
outcome and no-overwrite evidence. No other owner's execution is fabricated or
performed by this handoff.

## 5. Non-sensitive runtime requirements, not a connectivity claim

- Backend: existing `controlled-demo` composition; exact approved Firebase
  project; Auth/Firestore Emulator environment variables absent. Keep the
  existing loopback-only raw listener and approved HTTPS access arrangement.
- Flutter on Android Emulator: `ENMORI_FIREBASE_PROJECT_ID` is the approved Demo
  project and `ENMORI_USE_FIREBASE_AUTH_EMULATOR=false`. Supply the existing
  Firebase client configuration and `ENMORI_API_BASE_URL` through the approved
  private local configuration channel; no values other than the project ID
  belong in this public handoff. Backend access must remain HTTPS with valid
  trust; no cleartext Backend URL or permissive certificate callback.
- An Android Emulator is the client device. It does not imply Firebase Emulator
  is the data source. Do not reuse LI's separate local Firebase-Emulator test
  defines, ephemeral TLS certificate or test APK for this Demo acceptance.
- DU's integrated source must compose both actual S2-01 and S2-02 implementations:
  `GET /v1/interest-tags`, `GET /v1/me/interests`, `PUT /v1/me/interests`, and
  `GET /v1/recommendations/events?view=home|all`. Preserve existing Auth/onboarding
  requirements and Backend-derived ownership; Flutter does not access Firestore.
- SHI's runtime handoff and DU's client-specific HTTPS reachability/interface
  checks are still required. This document does not assert that a ready runtime
  route or successful combined interface access has been observed.

## 6. Permitted client-local failure/recovery procedure

For the existing safe error/retry scenario, use a temporary network interruption
on DU's dedicated test Android Emulator only:

1. Establish a successful signed-in Event read first. Record the exact integrated
   commit/APK and the Emulator's original Wi-Fi/mobile-data connectivity states.
2. Select that AVD explicitly in ADB commands; never use an implicit target.
   Disable its Wi-Fi and mobile data using `shell svc wifi disable` and
   `shell svc data disable`. Do not alter the host, VPN, firewall, DNS, shared
   Backend, Firebase service, IAM, credentials or fixture data.
3. Open See All to trigger a fresh request. Wait for the existing operation
   timeout/error state and capture the safe message and visible Retry action.
   If any alternate connection keeps the Emulator online, stop this scenario as
   Blocked rather than interrupting a shared service to force a result.
4. Restore exactly the recorded radio states in a finally/cleanup step, including
   after failed assertions. Verify connectivity, press the existing Retry button
   and record successful recovery on the same configuration.

Report this as **Emulator-local connectivity failure / explicit retry recovery**.
Record whether the observed failure occurred during Auth refresh or Backend
transport; do not mislabel it as an observed Firestore outage or Backend HTTP 503.
Server dependency/error mappings retain their owner API/Emulator test evidence.
If acceptance specifically requires a new live server-side fault, stop only that
row and request a separately scoped isolated method; this direction does not
authorize disabling a shared service.

## Remaining gate

LI target confirmation is resolved and this bounded test direction is supplied.
Actual Demo initialization and runtime handoff remain SHI-owned outstanding
evidence. DU must not mark the full prerequisite bundle Ready or its integration
Pass until those results and its own client reachability checks are available.
No Issue/Project closure, final smoke, UAT or Release is implied.
