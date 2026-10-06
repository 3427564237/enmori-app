# JIN combined gate for the isolated Sprint 3 candidate

Gate owner: JIN ZIHAN (`chuxi12483468`). Independent evidence reviewer: LI HOURUI. Recorded 6 October 2026, Asia/Singapore. Assignment: the [existing #54 handoff and PM addendum](https://github.com/3427564237/enmori-app/pull/54#issuecomment-6016149731), within [#44](https://github.com/3427564237/enmori-app/issues/44).

**Disposition: Blocked for closeout.** The exact composition checks below pass and the published LI execution supports the bounded isolated Check-in/Friend/Event candidate. DU's #43/#45 disposition and LI's independent review of this JIN record remain Pending. No new combined-tree defect was identified by the source/evidence checks recorded here. This is an evidence assessment using explicitly attributed execution, not a claim that JIN reran LI's tests or that the 42-route Sprint target is complete.

## Exact candidate and authority

| Role | Pinned commit |
|---|---|
| Main included in the candidate | `281c16b07a64633dea083808f9b8a3a567d7e6c4` |
| #42 planning predecessor | `479619e8d124f3342458506fc145dc4bfbe3f483` |
| #43 navigation predecessor | `27b899fe93066298bd36d4d5dadf0f90a374a50d` |
| #50 Profile/Settings and Check-in repair | `ec59a166f8901932bf9453ee49d7b51e671d32e4` |
| #54 isolated Friend/Event | `9cfb9a9e23d4a589e59c40cde78cceadd617cd70` |
| Executed combined product | `e029f51cf0db6bca7064634ebe351470e878a804` |
| Initial LI execution evidence delivery | `e97ca58ca2d125287fc2a30c9085c56c5a8bd3cb` |
| Subsequent PM evidence delivery | `3466a718383672422815243571a1dca3caccac24` |

The [approved three-increment contract](https://github.com/3427564237/enmori-app/blob/e029f51cf0db6bca7064634ebe351470e878a804/docs/decisions/2026-10-05-li-blocker-implementation-approval.md) authorizes new Check-in visibility snapshots and the specified isolated Friend requests and synthetic Event Detail. It preserves Note-only commands, legacy omissions, owner-only Check-in reads, existing recommendation fields/order and default-disabled Friend/Event entries. It does not enable real-user eligibility, real-provider acquisition, participation disclosure, Friend recommendations or Activity. Earlier #46 preparation gaps are resolved only to the extent of this explicit isolated contract.

The [PM closeout packet](https://github.com/3427564237/enmori-app/blob/3466a718383672422815243571a1dca3caccac24/docs/planning/2026-10-06-li-pm-closeout-preview.md) permits reuse of recorded execution while the executable tree is identical and requires actual and reused results to be distinguished. Its later conditional LI actions are not actions performed or authorized by this JIN record.

## Checks actually performed by JIN

These checks used local Git objects and authenticated GitHub reads on Windows/PowerShell. No product runtime, dependency installation, device or provider was started.

| Check | Actual result |
|---|---|
| `git merge-base --is-ancestor` for main, #50 and #54 against the product candidate | Pass for all three exact source commits |
| `git diff --name-only 9cfb9a9 e029f51`, excluding only `docs/` | Pass: exactly the three files below; no additional product/runtime/configuration/test delta |
| Compare each changed file's Git blob with reviewed #50 | Pass for all three; values below |
| `git rev-parse e029f51^{tree}` | `227d8992b984fd5e7c9bcb908d238b6afd241e12`, equal to LI's stated final rehearsal tree; JIN did not rerun the merge rehearsal or merge anything |
| `git diff --name-only e029f51 3466a71` | Six files, all under `docs/`; evidence/PM publication contains no executable changes |
| `git diff --check` for #54 to candidate and candidate to PM delivery | Pass for both ranges |
| Source and result consistency | Inspected the committed test assertions, runner, LI result manifest, isolated activation guards and current scoped GitHub reviews; coverage and limits are recorded below |
| This evidence change | One Markdown file; all 11 pinned file links resolve as Git objects; staged whitespace check passes |

| File differing from #54 | Identical blob in #50 and the candidate |
|---|---|
| `lib/features/check_in/presentation/check_in_controller.dart` | `92265df2d305d0a67a7771a03d38e6f62c95cec5` |
| `lib/features/check_in/presentation/check_in_page.dart` | `a7f261335db7e2bff1a4280832b1ed41560a00e9` |
| `test/features/check_in_pending_recovery_test.dart` | `129c116752ab1b3667b4d53545ca0c02b3cfb693` |

Consequently Friend/Event/shared routing/auth/network, Backend, OpenAPI, runner, remaining tests and dependency configuration match the reviewed #54 blobs. This establishes composition identity; it does not silently expand either reviewer's scope or turn a component approval into approval of the combined commit.

## Execution reused from LI

Source: [LI joint execution record](https://github.com/3427564237/enmori-app/blob/e97ca58ca2d125287fc2a30c9085c56c5a8bd3cb/docs/evidence/sprint3/2026-10-06-li-joint-validation.md) and [sanitized result manifest](https://github.com/3427564237/enmori-app/blob/e97ca58ca2d125287fc2a30c9085c56c5a8bd3cb/docs/evidence/sprint3/2026-10-06-li-joint-results.json), both inspected. Every result in this table belongs to `e029f51`, executed by **LI/Codex**, not by this JIN audit.

| Command or check | LI recorded result | JIN execution this turn |
|---|---|---|
| `pnpm backend:verify` | Pass, 313/313, zero failures, exit 0 | Not Run; reused |
| `fvm flutter analyze` | Pass, zero issues, exit 0 | Not Run; reused |
| `fvm flutter test --reporter expanded` | Pass, 155/155, zero failures, exit 0 | Not Run; reused |
| `pnpm backend:verify:emulator` | Pass, 37/37, actual Auth/Firestore Emulators, exit 0 | Not Run; reused |
| `node tool/run_s3_blocker_emulators.mjs emulator-5554` | Pass, 1/1 Android integration plus host persistence assertions, exit 0 | Not Run; reused |

LI's environment was Node 24.19.0, pnpm 11.19.0, Flutter 3.47.2/Dart 3.13.2, `demo-enmori-rmvp01a-r10`, serial Auth 9099/Firestore 8080 runs and the isolated API 36 `enmori_s2_api36` Android Emulator with software graphics. Android completed around 19:46 Singapore time. The recorded APK SHA-256 is `365da73cf73a3dd80d67f43cf0106ab5ae40b20f5e5f45fde330e76e38c036ca`; the APK contains ephemeral fixture credentials, remains ignored locally and is not a distributable artifact.

The raw Linux logs and device were not accessed from this Windows audit. JIN relies on the pinned sanitized records for observed runtime outcomes, and on the committed assertions for their meaning. No additional independent execution claim is made. SHI's earlier shader failures remain historical failures; SHI's subsequent actual clean 150/150 run resolved that review gap at #54, while LI's separate 155/155 result covers the combined candidate with the five Check-in regression cases.

## Covered cases and evidence limits

The following are source-to-result mappings, not additional test runs or additional test totals. Android covers the principal combined flow; protection and race cases also rely on the unit/Transport and actual Firestore Emulator suites.

| Boundary | Assertions inspected at the candidate | Evidence used |
|---|---|---|
| Check-in settings and saved snapshots | Three visibility settings create corresponding snapshots; later settings edits leave earlier records unchanged; independent reread and replay preserve the original value; legacy omission and owner identity remain protected | Combined Android test/host checks, Emulator snapshot/overlapping-save cases, existing Backend contracts |
| Friend main chain | Account A sends, B declines, A sends a new reference, B accepts; A independently rereads Already friends; host asserts one friendship, no pending and empty recipient inbox | Android `S3_FRIEND_TWO_ACCOUNT_DECLINE_ACCEPT_REREAD` plus host compatibility marker |
| Friend protected state and races | Canonical exact lookup, recipient-only actions, uniform unavailable errors, missing authority/DisplayName, bounded filtered continuation, isolated rate limits, duplicate/opposite sends, accept/decline and block/delete races, expiry, temporary ineligibility and stale replacement references | [Unit/Transport assertions](https://github.com/3427564237/enmori-app/blob/e029f51cf0db6bca7064634ebe351470e878a804/backend/test/isolated-slices.test.ts), [real Emulator assertions](https://github.com/3427564237/enmori-app/blob/e029f51cf0db6bca7064634ebe351470e878a804/backend/emulator-test/blocker-slices.integration.test.ts); these are not all Android cases |
| Event and recommendation compatibility | Home and See All open the same fixture occurrence's Detail; absent location displays Not provided; explicit copy action reports success; host asserts exactly the existing six recommendation fields | Android `S3_EVENT_HOME_ALL_DETAIL_COPY` and host compatibility marker; no external launch/registration/provider result inferred |
| Event rejection and missing data | Wrong identity/unknown fields, unsafe address, invalid scalar/time data and expired Detail fail safely; missing-end Detail can be directly read without becoming a recommendation; Unicode remediation and nanosecond ordering retained | Backend/Emulator and Flutter parser/widget suites included in the combined totals |
| Shared lifecycle and return navigation | Home/See All recomputation and stale-response exclusion; expired session keeps sign-in; Friend/Event old-account replies ignored; Check-in pending exit/reopen and replacement-page ownership guarded | Existing [navigation tests](https://github.com/3427564237/enmori-app/blob/e029f51cf0db6bca7064634ebe351470e878a804/test/app/home_event_navigation_test.dart), [feature cases](https://github.com/3427564237/enmori-app/blob/e029f51cf0db6bca7064634ebe351470e878a804/test/features/blocker_slices_test.dart) and five [Pending recovery cases](https://github.com/3427564237/enmori-app/blob/e029f51cf0db6bca7064634ebe351470e878a804/test/features/check_in_pending_recovery_test.dart); their pass does not supply DU's separate #43 review |

JIN inspected the [real-Backend Android test](https://github.com/3427564237/enmori-app/blob/e029f51cf0db6bca7064634ebe351470e878a804/integration_test/s3_blocker_real_backend_test.dart) and [host runner](https://github.com/3427564237/enmori-app/blob/e029f51cf0db6bca7064634ebe351470e878a804/tool/run_s3_blocker_emulators.mjs). The test uses real application repositories/router with isolated configuration; the runner asserts stored settings revision, three snapshot values/owner, friendship/pending/inbox state and unchanged Event fields. UI copy confirmation is narrower than independent clipboard-content inspection or an external provider navigation test.

The runner filters credentials at the Emulator boundary, uses temporary test TLS trust and synthetic fixture accounts, and contains cleanup for servers, temporary configuration and Auth users. LI reports the fixture directory removed, Emulators stopped, no Firestore export and the owned Android AVD stopped. These cleanup outcomes are reused LI evidence, not a fresh inspection of LI's host. The gate record contains no credentials, private raw logs, real account data or provider payloads.

## Review and unresolved gate disposition

| Gate | Current disposition and evidence |
|---|---|
| #42 planning review | SHI **Approved** the exact `479619e` in [review 5429005560](https://github.com/3427564237/enmori-app/pull/42#pullrequestreview-5429005560). This later human review updates the older unverified observation in LI's manifest; Copilot's quota comment supplies no approval. PM acceptance/merge remains separate |
| #43 predecessor and #45 preparation | **Pending DU**. #43 remains Draft at `27b899f` over `479619e`, with DU requested and no submitted review at this readback. The [existing follow-up](https://github.com/3427564237/enmori-app/pull/43#issuecomment-6016151639) includes the five #45 preparation criteria. JIN authored #43 and cannot supply its independent approval |
| #50 component | Retain DU's [approval 5427310306](https://github.com/3427564237/enmori-app/pull/50#pullrequestreview-5427310306) at `ec59a16`, limited to its reviewed repair and stated scope; no blanket #45/#43 acceptance inferred |
| #54 components | Retain SHI's [Friend approval 5427129989](https://github.com/3427564237/enmori-app/pull/54#pullrequestreview-5427129989) and ZHOU's [Event approval 5425205340](https://github.com/3427564237/enmori-app/pull/54#pullrequestreview-5425205340) at `9cfb9a9`; no repeated unchanged component review requested |
| JIN evidence assessment | Composition/source checks Pass; bounded execution results reused and attributed above. Overall closeout remains Blocked by the missing independent gates |
| LI independent review of this record | **Pending**; JIN cannot self-satisfy this review |
| Merge, #45 acceptance and project changes | **Not Run by JIN**; existing heads/bases/Draft settings unchanged. LI must separately verify then-current heads, review scope and trees before any authorized action |

Real-account Friend eligibility, third-party Profile/recommendation/Activity disclosures, real Event provider rights/acquisition/exact mapping rows and physical-device/cloud verification remain outside this isolated acceptance boundary. Missing-end Detail has no new browsing entry. The five prototype-only behaviors (`verify`, `forgot-password`, `going-people`, `checkin-edit`, `ai-safety`) and remaining module work retain their own decisions and evidence gates. Persona/AI runtime integration and live Qwen are not covered by this candidate. Neither full module completion nor the 42-route/38-state-group target, Sprint acceptance, UAT or Release is asserted.

Any changed source head, reviewed executable blob, candidate composition or runtime environment must be assessed before reusing the corresponding evidence. Publication of this record does not turn an unresolved or Not Run case into Pass. The next gate is LI's independent disposition of this record alongside DU's outstanding conclusions.
