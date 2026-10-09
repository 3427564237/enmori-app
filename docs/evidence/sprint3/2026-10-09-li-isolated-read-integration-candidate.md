# LI isolated read integration candidate

Date: 9 October 2026, Asia/Singapore. Integration operator: LI's delegated Codex agent. This publishes the concrete candidate required by the existing #44 LI integration assignment after its component gates passed. It is not a remote main merge, new product contract, independent JIN gate or Sprint acceptance.

## Immutable inputs and authority

| Input | Exact source and scoped acceptance |
| --- | --- |
| Remote main | `f46a903cb5b339365ac2024004b32b7b96b99e7c` |
| My Friends #61 | `5bdbcf8d61e0d84ba13e2146167db48704a1e7ae`; SHI Approve / [LI isolated F01–F05 acceptance](https://github.com/3427564237/enmori-app/blob/8c3775cdbf8652133aa9cd24e539d5811831858b/docs/decisions/2026-10-08-li-my-friends-isolated-component-acceptance.md) |
| History #64 | `2d2a81d85a10e0ced88199a25b373289030dbf26`; LI [formal Approve 5467346985](https://github.com/3427564237/enmori-app/pull/64#pullrequestreview-5467346985) / [isolated Backend/read-component acceptance](https://github.com/3427564237/enmori-app/blob/66825ee2d173808c92912cbb43c17a633cbccea1/docs/decisions/2026-10-09-li-history-read-component-acceptance.md) |
| Persona Backend #65 | `885dbcc87fe8574265014eb4305c49fc0950daa3`; JIN Approve / [LI P01–P03 Backend component acceptance](https://github.com/3427564237/enmori-app/blob/c19811cef912c2b094ed71469c11fc994f5dcb81/docs/decisions/2026-10-09-li-persona-backend-component-acceptance.md) |

Retain the approved feature contracts, client/Backend architecture, privacy and actual isolation conditions. History is confined to guarded Emulator composition; the old rejected controlled-runtime suggestion is not an integration instruction. Persona P08 [decision/task #68](https://github.com/3427564237/enmori-app/issues/68) is separate; no new P08 client/pages are implemented in this candidate, and its JIN #67 consistency gate remains pending.

**Tested source head:** `cef93e782cff5a952ce6176b02055d9ad8de535b`. The subsequent publication commit adds this evidence only. A manifest of **410 non-document tracked files**, `git ls-tree` blob identities excluding docs and Markdown, has SHA-256 `ae5c57135a665382a71a3e5c078e4790f86d839d5d514e2642cabb3ce322fc2e`; it is rechecked before publication. Test-head/source identity is explicit rather than inferred from a branch name.

## Actual reconciliation

Three local merge commits retain the component parent history; none merges a GitHub PR or remote main. Resolve the approved union only:

- OpenAPI: semantic three-way union, then source-format preservation. All **26 method/path operations** match a source operation exactly; the inventory has no duplicates and non-error components match their respective source definitions. Existing error catalogue includes the unchanged Persona additions. No whole-file overwrite discards another component.
- Route inventory: retain My Friends, history and all six Persona operations once, with each supplied component's statuses/key/runtime metadata.
- buildApp: retain all explicit dependencies, including isolated checkInHistory/personas, My Friends query failure mapping and history query failure mapping. The existing Persona guard stays before Fastify construction; Persona's scoped framework error adapter is preserved. Ordinary/controlled-demo registration remains absent for these new slices.
- Textually auto-merged adjacent schemas/registration and the #64 approved Temporal/index/configuration files were inspected and tested. No new dependency or live index deployment is selected.

Two integration-owned test deltas are supplied for independent review:

1. The inherited history tamper test could replace the last character with the same `A`, then incorrectly demand rejection of an unchanged cursor. First combined Backend run: **365/366 Pass, one failed assertion**. A 200-sample diagnostic found 16 unchanged commands; all 184 truly changed commands and all 200 forced byte flips were rejected. The committed test now deterministically flips one decoded ciphertext byte and re-encodes it. Runtime cursor code is unchanged; the complete Backend suite was rerun.
2. A new real Emulator case composes Friend, history and Persona together in **one guarded app**, using two fresh synthetic Auth identities, current bindings/completed Accounts and explicitly initialized private state. It checks all three reads, actual owner-filtered history, Persona create/independent reread/direct persistence, foreign-owner denial, scoped malformed-Persona errors followed by unaffected Friend/history reads, and ordinary composition omission. Every issued request is awaited, apps are closed and Auth/known scoped documents removed before ending the fixture. This is Backend/Fastify injection with actual Auth/Firestore persistence, not an Android result.

The new test initially exposed TypeScript inference errors for optional app variables. An explicitly typed isolated-app handle corrected the test-only annotations; strict compilation passed before execution. No production code was changed for this diagnostic. The first actual Emulator run had 70/70 before the additional coexistence case; the final run below includes it.

## Actual LI candidate execution

| Check | Result and head/source boundary |
| --- | --- |
| Pinned Node 24.19.0 strict TypeScript build | Pass on final code tree |
| Full Backend suite | **366/366 Pass** on cef93e782cff5a952ce6176b02055d9ad8de535b; zero failed/skipped/cancelled |
| Actual isolated Auth/Firestore Emulator suite | **71/71 Pass** on cef93e782cff5a952ce6176b02055d9ad8de535b, including the new coexistence/persistence case; zero failed/skipped/cancelled; exit 0 |
| OpenAPI/Persona transport checks after source-format preservation | **19/19 Pass**; identical semantic union |
| Full Flutter suite | **225/225 Pass** at initial combined code head `0f89282d2e902eff03ec8c4edd77bface51f442b`; later lib/test/pubspec/lock/FVM/integration_test/tool diff is empty, retaining exact client/harness source coverage |
| `fvm dart analyze --fatal-infos lib test` | No issues; same unchanged client source |
| Frozen offline Flutter package resolution | Pass; tracked manifest/lock unchanged |
| Whitespace / source-operation union / tracked checkout | Pass; temporary dependency link removed before publication |
| Actual combined Android / screenshots / accessibility / iOS | **Not Run**; adb shows no attached device; no new APK or device result is claimed |
| Independent JIN combined gate / LI review of that gate | **Not Run**; this LI preparation does not replace those independent artifacts |

Persona suite instrumentation in the final 71-case run: 208 observed transaction calls / 215 SDK attempts / seven retried calls / maximum nine logical gets / zero collection scans. This covers the existing instrumented Persona suite; the new coexistence case does not contribute to those observer counters. Eight/nine-get paths and actual SDK retries are separately asserted. These are per-attempt logical reads, not total request/billing/runtime bounds.

Existing Node 24.19.0, Flutter 3.47.2 / Dart 3.13.2, Java 25.0.4.1, Firebase CLI 15.29.0 / Admin 14.3.0 / Fastify 5.12.1 / TypeScript 7.0.2 and approved Temporal 0.5.1 were reused. No install, lifecycle-script approval, SDK or package/lock modification beyond the inherited approved #64 dependency delta. The runner/config remain unchanged. CLI uses fresh credential-filtered temporary profile, demo-enmori-rmvp01a-r10, loopback Auth 9099 / Firestore 8080 and existing cached Firestore Emulator 1.22.0; actual child environment is validated before Firebase use and passed unchanged to composition. No real/demo dataset, cloud/model/provider fallback, new account provisioning or runtime promotion. Both Emulator runs stopped services and removed the temporary profile; ports are clear. Local logs/manifest remain under `/tmp/enmori-li-integration-20261009/`.

## JIN / owner / LI handoff

JIN independently reviews the actual union/test deltas and runs the new combined gate at the **published exact head**, including affected Backend/Emulator/Flutter and applicable Android/persistence checks. Report his own execution attribution, exact tree/tools/commands and failure/Not Run history. The prior #55 gate and individual component runs cannot certify this new tree. LI then independently reviews JIN's actual gate evidence. No author self-approves; do not merge before those applicable gates.

DU's R1–R3 review work is complete for unchanged #64; no repeated contract/component review is requested. History UI/Footprint/Calendar, actual real-target/index/runtime gates and Android visual evidence remain outside its accepted read component. My Friends and Persona Backend scopes remain unchanged. New P08 pages/client work waits only for its own JIN #67 consistency gate and assigned task; it does not need to wait for this broader candidate or AI/Event prerequisites once independently released.

Keep all original implementation PRs and this candidate Draft/Open; no main merge, existing Issue/Project transition, real-account/source enablement or full module/Sprint/UAT/Release/Done acceptance. Six named bounded increments/components now have scoped acceptance (the previous five plus history read), not six complete modules/routes or an overall Sprint percentage. 11 October / 42-route / 38-state target remains; overall on-time delivery is uncommitted.
