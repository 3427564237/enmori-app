# RMVP-01A Focused Functional and Non-Accessibility Closure Packet

- **Work package:** Issue #4 / current RMVP-01A closure
- **Packet owner:** JIN ZIHAN (@chuxi12483468)
- **Prepared:** Exact preparation time not recorded; commit publication time is not used as a substitute.
- **Current-main pin used to create this packet branch:** 8b3f3fecb373c3dceb5b813e3b464070ee24297d (current `main` at branch creation)
- **Status:** Focused evidence closure packet; independent review requested
- **Sponsor boundary:** S-SPONSOR-0910-RMVP01A-A11Y-DEFER, recorded in PR #21 at exact head 20bce0a1191dafa1dee4e7d25b90e9d16ef84a0c and merged to main as 8b3f3fecb373c3dceb5b813e3b464070ee24297d

## 1. Current-stage scope

This packet covers only the focused RMVP-01A closure slice: functional bounded Android UAT anchors CORE-01.A, CORE-02.A, CORE-05.A and the affected X-01 identity boundary, plus non-accessibility Q04 provenance/traceability and ordinary-scale responsive evidence.

The Sponsor decision defers remaining accessibility-specific execution/evidence for this stage. Human audible TalkBack traversal and other accessibility-only rows remain Not Run — Deferred; they are visible for future work but are excluded from the current closure blocker set. Existing accessibility implementation, tests and evidence remain retained. This packet does not expand to the full 45-case Week 9 Release UAT and does not claim the overall Week 9 gate, Release or Project Done.

## 2. Focused UAT-anchor matrix

The evidence result below describes only behavior actually observed in immutable records. Formal bounded-UAT acceptance remains Not Run until the competent UAT authority accepts a complete focused packet.

| Anchor / boundary | Required branch | Evidence-backed result | Formal focused-UAT status | Immutable source |
|---|---|---|---|---|
| CORE-01.A | Firebase registration, valid Username, Initial Choice Accept, Public onboarding, Note-only Check-in and later owner read | Pass — LI physical product-chain path observed | Not Run — acceptance pending | [LI product-chain README](https://github.com/3427564237/enmori-app/blob/3a732041c79326b7ad53c52bef99cf52ab981713/docs/evidence/rmvp-01a/2026-09-09-li-phone-product-chain/README.md) |
| CORE-02.A | Firebase registration, valid Username, Initial Choice Reject, Private onboarding, Note-only Check-in and later owner read | Pass — LI physical product-chain path observed | Not Run — acceptance pending | [LI product-chain README](https://github.com/3427564237/enmori-app/blob/3a732041c79326b7ad53c52bef99cf52ab981713/docs/evidence/rmvp-01a/2026-09-09-li-phone-product-chain/README.md) |
| CORE-05.A | Note-only Check-in create followed by independent later owner read | Pass — both LI physical paths observed | Not Run — acceptance pending | [Accept/Public capture](https://github.com/3427564237/enmori-app/blob/3a732041c79326b7ad53c52bef99cf52ab981713/docs/evidence/rmvp-01a/2026-09-09-li-phone-product-chain/accept-public-later-read.png), [Reject/Private capture](https://github.com/3427564237/enmori-app/blob/3a732041c79326b7ad53c52bef99cf52ab981713/docs/evidence/rmvp-01a/2026-09-09-li-phone-product-chain/reject-private-later-read.png) |
| X-01 | Missing identity on protected operation | Pass — unauthenticated HTTPS 401 AUTH_REQUIRED observed by LI | Not Run — focused UAT acceptance pending | [R14 packet](https://github.com/3427564237/enmori-app/blob/8b3f3fecb373c3dceb5b813e3b464070ee24297d/docs/evidence/rmvp-01a/R14-android-product-chain-execution-2026-09-09.md) |
| X-01 | Malformed identity | Pass — JIN controlled loopback returned 401 AUTH_REQUIRED | Not Run — Android UAT pending | [JIN X-01 loopback record](2026-09-11-jin-x01-loopback.md) |
| X-01 | Expired identity | Pass — fresh synthetic expired identity returned 401 `AUTH_REQUIRED` on a protected operation with no mutation | Not Run — Android UAT acceptance pending | [JIN expired-identity evidence](2026-09-13-jin-x01-expired-identity.md) |
| X-01 | Privacy-safe negative branch where applicable (missing/non-owner content) | Pass in R13 controlled execution; not a physical Android UAT result | Not Run — Android UAT acceptance pending | [R13 controlled evidence](https://github.com/3427564237/enmori-app/blob/34d08a630d715fbe5fbdcd4ae2c00553a1ace405/docs/evidence/rmvp-01a/R13-cross-boundary-execution-2026-09-06.md) |

No unit, widget, emulator or prior platform result is promoted into the formal Android UAT status column.

## 3. R12 reconciliation against R13 and R14

The original R12 catalogue remains a design record with its initial-result column unchanged. The table below is a reconciliation of later observed evidence only.

| R12 row | R13 controlled evidence | R14 physical evidence | Current reconciliation |
|---|---|---|---|
| T01 Accept/Public | Pass | Pass | Pass for observed behavior; formal UAT acceptance pending |
| T02 Reject/Private | Pass | Pass | Pass for observed behavior; formal UAT acceptance pending |
| T03 Incomplete onboarding recovery | Not Run as exact T03 oracle | Not Run | Not Run |
| T04 Exact onboarding retry | Pass | Not Run | Pass in controlled R13 only |
| T05A Invalid Username | Pass | Not Run | Pass in controlled R13 only |
| T05B Username unavailable | Not Run | Not Run | Not Run |
| T05C Onboarding conflict | Not Run | Not Run | Not Run |
| T06A Invalid Firebase registration | Not Run | Not Run | Not Run |
| T06B AUTH_REQUIRED | Pass for missing/malformed branch; expired branch Not Run | Pass for missing-identity boundary only; malformed/expired Not Run | Partial: missing and malformed observed in controlled loopback; expired remains Not Run |
| T07 Note-only create | Pass | Pass | Pass for observed behavior; formal UAT acceptance pending |
| T08 Invalid Note validation | Not Run | Not Run | Not Run |
| T09A Forbidden identity | Not Run | Not Run | Not Run |
| T09B Incomplete protected create | Pass | Not Run | Pass in controlled R13 only |
| T10 Check-in exact retry and changed-Note conflict | Pass | Not Run | Pass in controlled R13 only |
| T11 Later owner read / privacy boundary | Pass for owner, missing and non-owner branches | Pass for owner branch only | Controlled privacy result is Pass; physical UAT negative branch remains Not Run |
| T12 Dependency loss / cancellation reconciliation | Pass | Not Run | Pass in controlled R13 only |
| T13 Evidence completeness rule | Evidence fields exist in the R13/R14 records | Formal focused-UAT acceptance not recorded | Not Run as a separate acceptance run |

Rows marked Not Run are not current-stage accessibility blockers. They remain visible and may require a separately scoped controlled run if their owning acceptance authority keeps them in scope.

## 4. Still-mandatory current-stage evidence

| Run | Current status | Planned identity and fields to record | Sanitized destination |
|---|---|---|---|
| Focused functional Android UAT: CORE-01.A / CORE-02.A | Not Run — acceptance pending | Build commit and APK SHA; named Android device/OS; executor; controlled endpoint; fixture version/reset; timestamp/timezone; numbered steps; observed output | docs/evidence/rmvp-01a/2026-09-11-focused-functional-uat/ |
| Focused functional Android UAT: CORE-05.A | Not Run — acceptance pending | Same fields; include create response, later owner read and server-time projection | docs/evidence/rmvp-01a/2026-09-11-focused-functional-uat/ |
| Focused X-01 malformed/expired branch | Pass — malformed and expired protected-operation branches evidenced | Current-main code head; controlled Auth/Backend endpoint; synthetic identity fixture; reset result; exact response code/safe message; executor and timestamp | docs/evidence/rmvp-01a/2026-09-13-jin-x01-expired-identity.md |
| Non-accessibility Q04 provenance/traceability | Not Run | Source decision IDs, immutable file/commit links, scope mapping, reviewer and timestamp; no accessibility-only rows | docs/evidence/rmvp-01a/2026-09-11-q04-non-accessibility/ |
| Ordinary-scale responsive evidence | Not Run | Current-main build/APK identity, approved ordinary-scale profile(s), device/viewport, executor, timestamp/timezone, numbered captures and sanitized logs | docs/evidence/rmvp-01a/2026-09-11-q04-non-accessibility/ |

No result is Pass until the listed identity, steps, observations and sanitized evidence fields are complete and independently reviewable.

### JIN-owned preflight for LI-operated Android run (current status)

JIN is the R14 owner and Testing Lead. JIN's available personal device is iOS, so the Android physical run is operated by LI HOURUI on the connected vivo V2405A. No private-tailnet invitation is published or used by JIN for this route; LI will revoke or expire any unused invitation outside GitHub. The Android phone's Tailscale app is the only Tailscale component to verify; the LI workstation uses ADB and does not require Tailscale CLI.

| Preflight field | Status | Recorded value / boundary |
|---|---|---|
| Current main SHA | Pass | 8b3f3fecb373c3dceb5b813e3b464070ee24297d |
| APK SHA-256 | Ready for LI verification | Current-main controlled-config debug APK SHA-256 `131D3E7B34CF95ED8D12B7840CBC31FF9C239CFF074E25DC783E9EFB0FFCA50E`; [immutable preflight record](2026-09-11-current-main-apk-preflight.md). LI must verify the delivered copy before installation. |
| Android operator/device | Ready for LI run | LI HOURUI; vivo V2405A, Android 16/API 36; device serial is intentionally omitted |
| ADB precondition | Not Run | Before every ADB action LI must verify adb get-state and adb devices -l; only state device is acceptable; local reset authorization is limited to application ID com.enmori.app |
| Tailscale on Android test device | Not Run | Verify Tailscale is online in LI's Android app after any out-of-band enrollment; the workstation needs only ADB, and no workstation Tailscale CLI is required or recorded |
| Private HTTPS Serve edge | Not Run | LI must verify that the app reaches only the private HTTPS Serve edge; record endpoint class and HTTP result without address/FQDN or credentials |
| Fixture/reset | Blocked for physical run | The committed `run-emulator-tests.mjs` procedure resets only the Auth/Firestore Emulator. An approved immutable physical Firebase/Firestore reset procedure and its responsible environment owner are still required; no physical reset is claimed. |
| Evidence destination | Ready | docs/evidence/rmvp-01a/2026-09-11-focused-functional-uat/ and docs/evidence/rmvp-01a/2026-09-11-q04-non-accessibility/ |

A sanitized unauthenticated 401 AUTH_REQUIRED observation proves only ingress/auth enforcement. It is not a product-flow result and is not a UAT Pass.
## 5. Numbered execution checklist

1. Verify that current `main` is still 8b3f3fecb373c3dceb5b813e3b464070ee24297d; if it has moved, record the exact newer main SHA and refresh this packet branch before any run.
2. Build the Android artifact from that exact SHA and record the APK SHA-256; do not reuse an unpinned artifact.
3. Generate fresh synthetic registration credentials, opaque IDs and idempotency keys per run. Never log raw credentials, tokens or keys.
4. Obtain and record the immutable physical Firebase/Firestore reset procedure from the responsible controlled-environment owner. If it is unavailable, stop the physical run and record `Blocked`; the Emulator reset script is not a physical reset procedure.
5. Execute CORE-01.A and CORE-02.A as separate Accept/Public and Reject/Private branches, then execute CORE-05.A create followed by later owner read.
6. The affected X-01 malformed and expired identity branches are evidenced with controlled protected operations in the linked JIN records. Expect the approved fail-closed response and no mutation; do not promote this loopback result to Android UAT.
7. Capture ordinary-scale responsive and non-accessibility Q04 provenance/traceability evidence only. Keep accessibility-only execution visible as Not Run — Deferred.
8. Publish immutable screenshots/logs/records under the destinations above, with executor, device/build/environment/time fields and no credentials.
9. Request independent current-head review from GGGGHOST-CN. Record only evidence-backed Pass, Fail or Blocked results; leave missing evidence Not Run.


### 5.1 Screen-by-screen LI operator scripts (JIN-owned preflight)

These scripts follow the implemented Flutter flow at current main `8b3f3fecb373c3dceb5b813e3b464070ee24297d`. LI must not invent copy, expected outcomes or evidence classifications.

**Common setup and registration (repeat for each fresh branch fixture):**

1. JIN records the exact current-main SHA, exact APK SHA-256, fixture version and reset result. Immediately before every ADB action, LI runs `adb get-state` and `adb devices -l`; only state `device` is acceptable.
2. Launch the pinned APK on the vivo V2405A. On **Create account**, enter run-scoped synthetic **Email**, **Password** and **Confirm password**, then tap **Create account**. Expected state: Firebase Email/Password registration succeeds and the app enters **Choose your Username**. Capture `core-<branch>-01-registration.png`.
3. Enter the run-scoped synthetic **Username** and tap **Continue**. Expected state: **Optional data use** appears. Capture `core-<branch>-02-username.png`.
4. Verify the approved purpose copy and supporting statement, then tap **Continue**. Expected state: **Choose your initial settings** with **Accept — Public** and **Reject — Private**. Capture `core-<branch>-03-purpose.png`.

**CORE-01.A — Accept/Public:**

5. Tap **Accept — Public**. This control submits onboarding immediately; there is no separate completion or Home step. Expected next state: **Note-only Check-in** composer. Capture `core-01-04-choice-to-composer.png`.
6. Enter synthetic note label `r14-core01-note-v1` in **Note**, then tap **Save Check-in**. Expected intermediate state: **Check-in saved.** with **Confirm saved Check-in**. Capture `core-01-05-check-in-saved.png`.
7. Tap **Confirm saved Check-in**. This performs the later backend owner read. Expected result: **Saved Check-in confirmed.** showing the same note and saved timestamp, with **Return Home**. Capture `core-01-06-later-owner-read.png`. This is the CORE-05.A later-read capture for this branch.

**CORE-02.A — Reject/Private:**

8. Repeat steps 1–4 with a fresh fixture. Tap **Reject — Private**. This control submits onboarding immediately; expected next state is **Note-only Check-in** composer. Capture `core-02-04-choice-to-composer.png`.
9. Enter synthetic note label `r14-core02-note-v1`, tap **Save Check-in**, and verify **Check-in saved.** with **Confirm saved Check-in**. Capture `core-02-05-check-in-saved.png`.
10. Tap **Confirm saved Check-in**. Expected result: **Saved Check-in confirmed.** showing the same note and saved timestamp, with **Return Home**. Capture `core-02-06-later-owner-read.png`.

**CORE-05.A — create then later owner read:**

11. Use a third fresh fixture and complete registration, Username and either approved Initial Choice branch. In the resulting composer, enter `r14-core05-note-v1`, tap **Save Check-in**, and capture **Check-in saved.** / **Confirm saved Check-in** as `core-05-01-check-in-saved.png`.
12. Tap **Confirm saved Check-in**. Expected result: backend-backed later owner read displays **Saved Check-in confirmed.**, the same Note and saved timestamp, with **Return Home**. Capture `core-05-02-later-owner-read.png`. Do not return Home or attempt to reopen a saved-item list; current Home exposes no such list.

**Controlled reset boundary (before and after every branch):**

- The immutable [`backend/scripts/run-emulator-tests.mjs` procedure](https://github.com/3427564237/enmori-app/blob/8b3f3fecb373c3dceb5b813e3b464070ee24297d/backend/scripts/run-emulator-tests.mjs) creates an isolated temporary profile and resets only the controlled Auth/Firestore Emulator. It is valid for loopback evidence, but it is not a physical Firebase/Firestore reset procedure.
- The physical LI run is blocked until the controlled-environment owner supplies an immutable physical reset procedure, responsible operator and availability confirmation. JIN must record the procedure reference, fixture version and before/after result; no physical reset is inferred from the Emulator script.
- LI may clear local data only for application ID `com.enmori.app`, after recording JIN's reset instruction, and must re-check ADB state before that action. LI does not reset unrelated packages or handle environment credentials.
- After capture, JIN records sanitized evidence paths and verifies that no credential, token, serial or private content is stored.

**LI → JIN handoff:**

LI returns one sanitized run sheet per branch through the approved project channel, containing fixture version, branch, action number, timestamp/timezone, observed copy/state, screenshot/XML filenames and any deviation. JIN commits immutable files under `docs/evidence/rmvp-01a/2026-09-11-focused-functional-uat/`, updates the result matrix and defect/retest ledger, and publishes the final evidence commit. No credential, token, device serial, tailnet address/FQDN or private content is transmitted.

## 6. Execution split and accessibility boundary

- **JIN ZIHAN:** R14 owner and Testing Lead; supplies the exact current-main build/APK preflight, numbered CORE-01.A/CORE-02.A/CORE-05.A runbook, synthetic fixtures/reset plan, result matrix, evidence collation and defect/retest ledger.
- **LI HOURUI:** physical operator of the connected vivo V2405A, Android 16/API 36, for the focused Android steps only. LI must verify adb get-state and adb devices -l before every ADB action and may reset only com.enmori.app.
- **JIN ZIHAN:** separately executes the malformed/expired X-01 branch on the controlled loopback environment.
- **SHI ZHENGQI:** independently reviews the final exact evidence head.
- **LI HOURUI:** performs later Sprint-scope acceptance only after SHI's disposition; this does not replace SHI review.

The previous JIN-device/private-tailnet route and the LI-device handoff wording are withdrawn. No private invitation is to be posted or committed for this run; LI will revoke or expire any unused invitation outside GitHub. The earlier audible TalkBack handoff is also withdrawn by the Sponsor decision. Human audible traversal and remaining accessibility-only evidence remain Not Run — Deferred, with existing implementation/tests/evidence retained.

Because this Android route does not use an invitation, LI should revoke or expire the unused invitation outside GitHub. After the evidence/review window, remove any temporary device access unless LI separately approves continued access. Do not record invitation material, auth keys, tailnet addresses/FQDNs, credentials, tokens, serials or private content.

This route correction does not waive functional Android evidence, non-accessibility Q04 provenance/traceability, ordinary-scale responsive evidence, applicable non-waivable obligations or formal assessment authority.
## 7. Concrete owner-scoped blocker report and review request

**R14 execution/evidence owner:** JIN ZIHAN (@chuxi12483468). JIN owns the functional Android UAT execution plan, evidence collation and defect/retest ledger. LI is the physical operator only; SHI independently reviews the final exact evidence head; LI performs later scope acceptance.

**Current blocker (evidence closure, not implementation):** the controlled-config current-main APK is built and its SHA-256 is recorded in the immutable preflight record, but LI must still verify the delivered copy before installation. The physical run also lacks an approved immutable Firebase/Firestore reset procedure and responsible environment owner. Remaining JIN-owned preflight items are LI's action-time ADB confirmation (`adb get-state` and `adb devices -l` showing `device`), Android-phone Tailscale-online confirmation and private HTTPS Serve-edge reachability. The local ADB check still has no attached device, but LI's connected vivo V2405A is the designated operator device.

**Exact missing input:** LI's ADB preflight confirmation (`adb get-state` and `adb devices -l` showing state `device`), Android-phone Tailscale-online confirmation, private HTTPS Serve reachability, and an immutable physical Firebase/Firestore reset procedure with a named responsible operator. The workstation needs only ADB; the current-main APK and SHA-256 are recorded in the immutable preflight record. No private invitation is requested from JIN and no device serial or tailnet data may be recorded.

**Exact required output:** one sanitized current-main evidence packet with a Pass/Fail/Blocked/Not Run result for CORE-01.A, CORE-02.A, CORE-05.A and each X-01 branch, exact APK/build identity, LI device model/OS (without serial), executor, endpoint class, fixture/reset, timestamp/timezone, numbered observations, sanitized captures/logs and SHI's independent disposition. A 401 AUTH_REQUIRED result is ingress/auth evidence only and cannot be recorded as a product-flow or UAT Pass.

**Next executable windows:** After LI's action-time ADB, phone-side Tailscale, private Serve-edge checks and the physical reset procedure are recorded, LI may run the focused Android steps on vivo V2405A / Android 16/API 36. JIN's malformed and expired X-01 loopback evidence is now complete under the pinned Node.js version; these results remain loopback evidence only and do not replace Android UAT.

Deferred accessibility-only rows remain Not Run — Deferred and are excluded from this blocker. The full 45-case Week 9 Release UAT, Release acceptance and Project Done remain not passed and are outside this focused slice.

@GGGGHOST-CN: please review the exact commit containing this packet by 2026-09-12 12:00 SGT. Approve only evidenced rows or identify focused evidence-backed defects. Do not convert Not Run — Deferred rows, formal UAT-pending rows or the full Week 9 gate into Pass.
