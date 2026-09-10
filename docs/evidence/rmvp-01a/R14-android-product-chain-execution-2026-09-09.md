# R14 Android product-chain execution packet

- **Work package:** Issue #4 / R14
- **Packet owner:** JIN ZIHAN (`@chuxi12483468`)
- **Packet status:** Published for independent review; R14 disposition is pending
- **Prepared:** 2026-09-09 (SGT)
- **Review request:** `@GGGGHOST-CN` — please review this exact packet and publish an evidence-backed R14 disposition.

This packet collates immutable execution records from the accepted R13 merge, the
LI physical product-chain run, the LI TalkBack-enabled surface run, and the
LI-accepted DU R7 predecessor. It does not claim that JIN personally operated
LI's device, and it does not self-approve JIN-authored R12–R14 work.

## 1. Exact heads, builds, devices and environments

### Accepted predecessors

| Input | Exact revision | Evidence and result |
| --- | --- | --- |
| R13 | `34d08a630d715fbe5fbdcd4ae2c00553a1ace405` | PR #11 merged; accepted R13 controlled run recorded 11/11 (`R10 7/7 + R13 4/4`). |
| DU R7 | PR #14 head `7720fb50d1d129edd74e310f049a37841506503e` | LI current-head review approved; vivo V2243A, Android 15/API 35, ADB serial `10ACC70EX7000Y8`; six-surface R7 package and sanitized UI hierarchy. |

### LI real product-chain execution

- **Evidence head:** `3a732041c79326b7ad53c52bef99cf52ab981713`
- **Code head used for the installed APK:** `c3189c5d00f583a74b287258cf42a9302a0c4e6c`
- **APK SHA-256:** `bc78ba4e74347405e9a4832a8ebf7c834075afd84db4f7754a6622dda5b6b92e`
- **Executor/device owner:** LI HOURUI
- **Device:** vivo V2405A, Android 16/API 36 (physical ADB target)
- **Execution window:** 2026-09-09 15:58–16:23 SGT (07:58–08:23 UTC)
- **Path:** Android app → Firebase Email/Password Auth → private HTTPS edge → loopback Fastify Backend → controlled Firestore
- **Preconditions:** ADB/device, same-tailnet connectivity, private HTTPS forwarding, loopback Backend, and unauthenticated `401 AUTH_REQUIRED` boundary all observed `Pass`.
- **Toolchain recorded by the evidence:** Node.js `24.19.0`, pnpm `11.19.0`, Flutter `3.47.2`, Dart `3.13.2`; no credentials or tokens are retained.

### LI TalkBack-enabled surface execution

- **Evidence head / PR #18 current head:** `266483589f61db543c2ce736765691ff49c76df2`
- **Executor/device owner:** LI HOURUI
- **Device:** vivo V2405A, Android 16/API 36
- **Execution window:** 2026-09-09 16:57–17:02 SGT
- **TalkBack service:** `com.google.android.marvin.talkback/com.google.android.marvin.talkback.TalkBackService` enabled and restored after capture
- **APK SHA-256:** `d46b031340c29903992b886b3bb04f04684416b52e4ad60c045a9984fb854fee`
- **Target:** `integration_test/r6_surface_device_evidence_test.dart`; six-surface target completed with `All tests passed`.
- **Boundary:** ADB-injected swipes were pointer input, not human audible swipe-by-swipe TalkBack traversal; that human check remains `Not Run`.

## 2. R12-to-R14 scenario mapping

The result column uses only the approved vocabulary. A `Pass` is limited to the
exact behavior observed in the linked immutable record; it does not promote a
related unit/widget check into a different scenario.

| R12 contract row / R14 application | Result | Evidence or boundary |
| --- | --- | --- |
| `R12-T01` Accept onboarding → Public | `Pass` | LI real product-chain README, Accept → Public path and capture. |
| `R12-T02` Reject onboarding → Private | `Pass` | LI real product-chain README, Reject → Private path and capture. |
| `R12-T03` incomplete onboarding recovery | `Not Run` | No physical incomplete-account execution in the supplied R14 packet. |
| `R12-T04` exact onboarding retry | `Not Run` | Not exercised by the LI physical product-chain record. |
| `R12-T05A/B/C` Username invalid/unavailable/conflict | `Not Run` | No physical execution of these R12 subcases. |
| `R12-T06A` invalid Firebase registration | `Not Run` | Registration success paths only; invalid-registration branch not exercised. |
| `R12-T06B` missing identity / `AUTH_REQUIRED` | `Pass` (missing-identity boundary only) | LI precondition check observed unauthenticated HTTPS `401 AUTH_REQUIRED`; malformed/expired branches remain `Not Run`. |
| `R12-T07` Note-only Check-in create | `Pass` | Both LI physical paths saved one synthetic Note-only Check-in. |
| `R12-T08` invalid Note validation | `Not Run` | Not exercised in the physical product-chain run. |
| `R12-T09A/B` forbidden or incomplete protected create | `Not Run` | Not exercised in the physical product-chain run. |
| `R12-T10` exact Check-in retry / changed-input conflict | `Not Run` | No physical retry/conflict execution in this packet. |
| `R12-T11` later owner read and privacy boundary | `Pass` (owner-read branch) | Both LI paths displayed the same saved Note/timestamp; one matching controlled record per path. Missing/non-owner branch remains `Not Run` for R14. |
| `R12-T12` dependency loss / cancellation reconciliation | `Not Run` | R13 emulator cancellation is a predecessor result; no physical R14 dependency-loss run. |
| Sign-in late-result success/failure cancellation correction | `Pass` (Flutter regression evidence) | PR #18 current head reports two late-completion widget cases; `fvm flutter test` 71/71. This is not human TalkBack evidence. |
| R7 six-surface Android capture (M02/M06/M07/M08/M19/M20) | `Pass` (predecessor input) | DU PR #14 accepted package and LI TalkBack-enabled package both contain six-surface captures. |
| R14 human audible TalkBack traversal | `Not Run` | Explicitly excluded by the LI TalkBack package boundary. |
| R14 UAT acceptance / Q04 completion | `Not Run` | Requires separate authority and complete UAT/Q04 evidence; not inferred here. |
| R15 / Release / Done | `Not Run` | Separate gates and inputs remain outstanding. |

## 3. Immutable evidence links

### Real registration, Initial Choice, create and later read

- [LI product-chain README](https://github.com/3427564237/enmori-app/blob/3a732041c79326b7ad53c52bef99cf52ab981713/docs/evidence/rmvp-01a/2026-09-09-li-phone-product-chain/README.md)
- [Accept → Public capture](https://github.com/3427564237/enmori-app/blob/3a732041c79326b7ad53c52bef99cf52ab981713/docs/evidence/rmvp-01a/2026-09-09-li-phone-product-chain/accept-public-later-read.png) and [sanitized hierarchy](https://github.com/3427564237/enmori-app/blob/3a732041c79326b7ad53c52bef99cf52ab981713/docs/evidence/rmvp-01a/2026-09-09-li-phone-product-chain/accept-public-later-read.xml)
- [Reject → Private capture](https://github.com/3427564237/enmori-app/blob/3a732041c79326b7ad53c52bef99cf52ab981713/docs/evidence/rmvp-01a/2026-09-09-li-phone-product-chain/reject-private-later-read.png) and [sanitized hierarchy](https://github.com/3427564237/enmori-app/blob/3a732041c79326b7ad53c52bef99cf52ab981713/docs/evidence/rmvp-01a/2026-09-09-li-phone-product-chain/reject-private-later-read.xml)

### Recovery and Android/Q04 observations

- [Sign-in late-result tests at immutable commit `9d93bde3fe4461c85c928b1ae9da5dc23f8e5ae4`](https://github.com/3427564237/enmori-app/commit/9d93bde3fe4461c85c928b1ae9da5dc23f8e5ae4), including [`recovery_flow_test.dart`](https://github.com/3427564237/enmori-app/blob/9d93bde3fe4461c85c928b1ae9da5dc23f8e5ae4/test/app/recovery_flow_test.dart) and [`fakes.dart`](https://github.com/3427564237/enmori-app/blob/9d93bde3fe4461c85c928b1ae9da5dc23f8e5ae4/test/support/fakes.dart)
- [DU independent approval closing P2 at PR #18 exact head `266483589f61db543c2ce736765691ff49c76df2`](https://github.com/3427564237/enmori-app/pull/18#pullrequestreview-5153299004)
- [LI TalkBack-enabled six-surface README](https://github.com/3427564237/enmori-app/blob/266483589f61db543c2ce736765691ff49c76df2/docs/evidence/rmvp-01a/2026-09-09-li-phone-talkback/README.md)
- [TalkBack-enabled settings capture](https://github.com/3427564237/enmori-app/blob/266483589f61db543c2ce736765691ff49c76df2/docs/evidence/rmvp-01a/2026-09-09-li-phone-talkback/talkback-enabled-settings.png)
- [M02 registration screenshot](https://github.com/3427564237/enmori-app/blob/266483589f61db543c2ce736765691ff49c76df2/docs/evidence/rmvp-01a/2026-09-09-li-phone-talkback/m02-registration.png)
- [M06 Optional data use screenshot](https://github.com/3427564237/enmori-app/blob/266483589f61db543c2ce736765691ff49c76df2/docs/evidence/rmvp-01a/2026-09-09-li-phone-talkback/m06-optional-data-use.png)
- [M07 paired Initial Choice screenshot](https://github.com/3427564237/enmori-app/blob/266483589f61db543c2ce736765691ff49c76df2/docs/evidence/rmvp-01a/2026-09-09-li-phone-talkback/m07-initial-choice.png)
- [M08 Home shell screenshot](https://github.com/3427564237/enmori-app/blob/266483589f61db543c2ce736765691ff49c76df2/docs/evidence/rmvp-01a/2026-09-09-li-phone-talkback/m08-home-shell.png)
- [M19 Note-only Check-in screenshot](https://github.com/3427564237/enmori-app/blob/266483589f61db543c2ce736765691ff49c76df2/docs/evidence/rmvp-01a/2026-09-09-li-phone-talkback/m19-note-only-check-in.png)
- [M20 saved Check-in screenshot](https://github.com/3427564237/enmori-app/blob/266483589f61db543c2ce736765691ff49c76df2/docs/evidence/rmvp-01a/2026-09-09-li-phone-talkback/m20-saved-check-in.png)
- [DU R7 accepted evidence mapping](https://github.com/3427564237/enmori-app/blob/7720fb50d1d129edd74e310f049a37841506503e/docs/evidence/r7-pr14-7e76da4-current-head-verification-2026-09-08.md)

## 4. Defects and blockers

- **P2 status:** Closed by DU's independent approval at PR #18 exact head `266483589f61db543c2ce736765691ff49c76df2`; the correction is pinned to commit `9d93bde3fe4461c85c928b1ae9da5dc23f8e5ae4` and linked above.
- **No execution blocker for the listed LI evidence:** the physical product-chain and TalkBack-enabled runs completed with the results above.
- **Not a defect claim:** human audible swipe-by-swipe TalkBack traversal was not performed; it remains `Not Run` by design.
- **Remaining gates:** unexecuted R12 rows, R14 UAT acceptance, full Q04/accessibility authority, R15, Release and Done remain separate and are not inferred.

## 5. Independent review request

`@GGGGHOST-CN`: please review this exact packet at the repository commit that
contains it and publish one disposition by 2026-09-11 12:00 SGT:

1. `Approved` for the exact packet and its scoped `Pass` rows; or
2. a focused evidence-backed defect naming the affected row, immutable source,
   reproduction/contradiction, and smallest required correction.

Do not convert `Not Run` rows into `Pass`, and do not infer UAT, Release, Done,
or R15 from this packet.
