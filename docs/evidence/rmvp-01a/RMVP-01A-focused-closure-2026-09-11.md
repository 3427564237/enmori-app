# RMVP-01A Focused Functional and Non-Accessibility Closure Packet

- **Work package:** Issue #4 / current RMVP-01A closure
- **Packet owner:** JIN ZIHAN (@chuxi12483468)
- **Prepared:** 2026-09-11 17:45:58 +08:00 (SGT)
- **Current main at preparation:** 8b3f3fecb373c3dceb5b813e3b464070ee24297d
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
| X-01 | Malformed or expired identity | Not Run | Not Run | No immutable physical execution record exists |
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
| T06B AUTH_REQUIRED | Pass for missing/malformed branch; expired branch Not Run | Pass for missing-identity boundary only; malformed/expired Not Run | Partial: missing branch observed; expired remains Not Run |
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
| Focused X-01 malformed/expired branch | Not Run | Current-main code head; controlled Auth/Backend endpoint; synthetic identity fixture; reset result; exact response code/safe message; executor and timestamp | docs/evidence/rmvp-01a/2026-09-11-focused-functional-uat/ |
| Non-accessibility Q04 provenance/traceability | Not Run | Source decision IDs, immutable file/commit links, scope mapping, reviewer and timestamp; no accessibility-only rows | docs/evidence/rmvp-01a/2026-09-11-q04-non-accessibility/ |
| Ordinary-scale responsive evidence | Not Run | Current-main build/APK identity, approved ordinary-scale profile(s), device/viewport, executor, timestamp/timezone, numbered captures and sanitized logs | docs/evidence/rmvp-01a/2026-09-11-q04-non-accessibility/ |

No result is Pass until the listed identity, steps, observations and sanitized evidence fields are complete and independently reviewable.

## 5. Numbered execution checklist

1. Freeze current main at 8b3f3fecb373c3dceb5b813e3b464070ee24297d or record the exact newer main SHA immediately before a run.
2. Build the Android artifact from that exact SHA and record the APK SHA-256; do not reuse an unpinned artifact.
3. Generate fresh synthetic registration credentials, opaque IDs and idempotency keys per run. Never log raw credentials, tokens or keys.
4. Reset the controlled Auth/Firestore state before each scenario and after the suite; record the reset result and sanitized fixture version.
5. Execute CORE-01.A and CORE-02.A as separate Accept/Public and Reject/Private branches, then execute CORE-05.A create followed by later owner read.
6. Execute the affected X-01 malformed/expired identity branch with a controlled protected operation; expect the approved fail-closed response and no mutation.
7. Capture ordinary-scale responsive and non-accessibility Q04 provenance/traceability evidence only. Keep accessibility-only execution visible as Not Run — Deferred.
8. Publish immutable screenshots/logs/records under the destinations above, with executor, device/build/environment/time fields and no credentials.
9. Request independent current-head review from GGGGHOST-CN. Record only evidence-backed Pass, Fail or Blocked results; leave missing evidence Not Run.

## 6. LI-device handoff and accessibility boundary

The prior request for an LI-device audible TalkBack handoff is withdrawn by the Sponsor scope correction. No human audible TalkBack handoff window is required for this current-stage packet. Human audible traversal and remaining accessibility-only evidence remain Not Run — Deferred, with existing implementation/tests/evidence retained for future work.

This withdrawal does not waive functional Android evidence, non-accessibility Q04 provenance/traceability, ordinary-scale responsive evidence, applicable non-waivable obligations, or formal assessment authority.

## 7. Blockers and review request

Current closure blockers are limited to the still-mandatory functional UAT acceptance, non-accessibility Q04 provenance/traceability, ordinary-scale responsive evidence, and independent review of this exact packet. Deferred accessibility rows are excluded from this blocker set.

The full 45-case Week 9 Release UAT, Release acceptance and Project Done remain not passed and are outside this focused slice.

@GGGGHOST-CN: please review the exact commit containing this packet by 2026-09-12 12:00 SGT. Approve only evidenced rows or identify focused evidence-backed defects. Do not convert Not Run — Deferred rows, formal UAT-pending rows or the full Week 9 gate into Pass.
