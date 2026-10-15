# JIN isolated Event browse shared integration

15 October 2026, Asia/Singapore. JIN owns this Bootstrap/OpenAPI/route-inventory increment. SHI independently reviews JIN's new shared code; LI reviews JIN evidence and bounded disposition. SHI's inherited feature code retains ZHOU's separate review path.

## Source and controlling scope

Product **`11957495d6e69bdb0f8b5f591221fe85fdca7c0c`**, tree **`ae9e8ed9324c2c7b1f00eedb96d01b2327568f46`**, on #105 `aab3bf23b8d9c76c6f830dfefa483d3f42bd2f01`. The publication above this product adds this report and its manifest only. #105's branch/head is not changed or retargeted by this separate Event increment. Its new AI R1/semantic review remains separately attributable; this Event packet does not self-clear it.

- [Human EB01–EB06 selection](https://github.com/3427564237/enmori-app/blob/73ace5b2b8f5add9acd318e96dfbc5840c8f19b9/docs/decisions/2026-10-15-li-real-event-contract-selection.md), adopting [#109 exact718da394](https://github.com/3427564237/enmori-app/blob/718da39440a6a3d67cce5ad9a3efbbb7f5acbc40/docs/planning/2026-10-15-shi-real-event-browse-contract-candidate.md), releases the isolated selected implementation. ZHOU [technical APPROVE5527108634](https://github.com/3427564237/enmori-app/pull/109#pullrequestreview-5527108634) clears that contract-review gate.
- The original EB07 copy-only choice is retained historically. [Later explicit human selection b04e06b](https://github.com/3427564237/enmori-app/blob/b04e06b649eff2c32738939fd78bf9240e6c8ee0/docs/decisions/2026-10-15-li-event-external-open-selection.md) supersedes only that choice with explicit external opening/copy fallback. This Backend increment implements neither action nor LI's platform/Home/router work; the protected returned URL contract is unchanged.
- [#110 exact82fbd0ac](https://github.com/3427564237/enmori-app/pull/110/commits/82fbd0ac94a4731ff8d12617309705a2c5353baf) supplies five byte-identical Application/Domain/Port/Transport files. These are identified producer inputs, **not an accepted #110 package**. ZHOU [Changes Requested5527108790](https://github.com/3427564237/enmori-app/pull/110#pullrequestreview-5527108790) remains: a positive upstream total plus an empty raw events array must fail, not become successful empty. SHI fixes it; ZHOU re-reviews it. The affected `ticketmaster-browse-source.ts`, its provider test and all SHI Flutter files are excluded here. No #110 ancestor was merged or PR automatically closed.

## Delivered shared behavior

`buildApp` accepts the existing `BrowseSource` only inside explicitly supplied, validated `isolatedSlices.eventBrowse`. The ordinary/controlled-demo root does not register either read. Bad mode/project/endpoint/credential/profile configurations fail before application creation/listening. There is no provider factory, credential configuration, live-source adapter import or new activation flag.

Bootstrap constructs the feature's Account gate from the existing `GetOnboarding` use case. Verified UID selects its current binding/Account; incomplete owner gives409, corrupt/missing bound Account gives503. Optional AI processing refusal is not an Event read refusal. No account schema, consent policy or source-authority substitute is introduced. Auth/Account refusals cause zero source calls. Tests use a named synthetic source and never contact Ticketmaster.

The normative contract adds only protected GET `/v1/event-browse` and `/v1/event-browse/{browseId}`:35 operations,45 component schemas; all original33 operation objects and every other top-level/component object preserved. Success schemas equal the supplied feature schemas. JIN adds explicit no-store response headers and omits the fragment's overbroad list404: the approved404 EVENT_UNAVAILABLE is Detail-only. Errors reuse the existing catalogue. No request body/query/pagination, database/cache/index/import, recommendation/participation mapping or dependency change.

Shared tests cover current identity/Account, caller spoofing, query/body rejection, minimized projection, fresh reads, unchanged persistence, valid synthetic empty versus thrown dependency failure, canonical Detail identity/absence, abort/late-result exclusion, default absence and isolation rejection. A source-owned valid empty result is not proof of the excluded provider adapter's raw-page validation. The five copied producer files remain unchanged for focused owner/reviewer reconciliation.

## Router discovery and correction

The initial product `ed220ffb9f5f961ac0a6b0a91fa41cec70b709f1` passed its11 initial injection tests but two additional probes exposed shared Bootstrap defects: a legal128-character occurrence ID produces174 public characters and received414 under Fastify's default100 limit; malformed `%ZZ` received a framework400 outside Auth, the safe envelope and no-store. Both observations are retained. The diagnostic script exited0 because it records observations; those outcomes are failures against the selected contract, not passed acceptance cases.

Pinned Fastify router source confirms both errors occur before route hooks. Only when Event isolation is requested, Bootstrap sets the router ceiling to the approved174 and installs an addressed-GET Event framework handler. Malformed/overlong Detail locators retain identity then completed-Account checks, stable404/401/403/409/503 and no-store, with zero source calls. Asynchronous callback rejection is consumed. Unrelated framework responses and any enabled Persona handler are delegated unchanged; the existing default-response helper is exported without changing its implementation. Ordinary roots retain their original router configuration. No locator is truncated or repaired.

Final13 focused tests include the174 boundary, malformed UTF-8/percent and overlong IDs, auth/account precedence, raw-path suppression and unrelated-route comparison. Six actual SDK cases include malformed-route protection with real Auth and Account reads. The focused cases overlap their respective full totals, not extra distinct coverage.

## Actual verification

Locked Node24.19.0, TypeScript7.0.2, Admin14.3.0, Firestore8.7.1, CLI15.29.0, Emulator1.22.0, Java21.0.12; existing Dart3.13.2 is supplied for the inherited HTTP client probe. No package/version selection. Commands run in the isolated product archive with existing locked dependencies;502 non-document inputs match published Git blobs after stated line normalization (35 exact working bytes,467 CRLF-equivalent). The manifest binds all13 changed inputs and the complete non-document inventory hash.

| Check | Command / actual result |
| --- | --- |
| Strict build | `node node_modules/typescript/bin/tsc --project backend/tsconfig.json` — Pass, exit0 |
| Focused shared contract/router | `node --test backend/dist/test/event-browse-composition.test.js` —13/13, exit0 |
| Full Backend | `node --test "backend/dist/test/**/*.test.js"` —895/895, fail/cancel/skip/todo0, exit0 |
| Full actual guarded SDK/Dart | `node tool/run_ai_store_emulators.mjs` —145/145, fail/cancel/skip/todo0, outerexit0 |
| Source/API/producer binding |502 normalized input bindings,13-file allowlist, five exact producer copies, old API/component/dependency/client/tool/index preservation —Pass |
| Product delta whitespace | `git diff --check aab3bf2 1195749` —Pass; inherited base raw-log exceptions are not relabelled |

Actual SDK checks use the existing validated demo-only child environment, loopback Auth/Firestore and verified cached JAR; Admin uses the current isolated project/endpoint. They verify real signed identity, disabled owner, incomplete/forged owner, current corrupt/deleted Account, both HTTP reads, unchanged Account/binding updateTime and no new collection, safe source failure and framework errors. **Source content is synthetic**, not a real provider report. The two own Account/binding documents and two Auth users are observed removed; SDK/app handles settle. Both private profiles and all five required ports are released by the existing runner. No cloud fallback is configured. Previous broader suites retain their actual attribution; this run's inherited AI model/semantic fixtures remain doubles.

Retained failures/setup: compile01 rejected an optional fake transaction delete call; the test explicitly asserts its availability before calling. The initial product's full SDK run was143/144, outerexit1: inherited Dart child emitted no valid non-content JSON. The new archive lacked `.dart_tool/package_config.json`; that fact was observed, and `flutter pub get --offline` restored the existing locked map with identical `pubspec.lock` SHA256. Original child stdout is intentionally unavailable, so no stronger raw-output diagnosis is claimed. That failed run still completed both profile/port cleanup. The final new-source run after router correction/restoration is recorded separately. Initial893/11 results do not certify the later tree. Private full logs remain local; published hashes identify attributed logs, not reviewer downloads or independent reruns.

Flutter/widget/APK/device, actual provider/permission/notice/removal operation, browser/copy/return, live Qwen and human accessibility were **Not Run** for this Backend-only increment. No existing UI/device counts are moved onto this source. No real Event content or URL was displayed/copied/opened.

## Review and next handoff

SHI reviews the new JIN Bootstrap/framework/OpenAPI/inventory/test delta; LI independently reviews this evidence and bounded disposition. ZHOU retains #110's feature/adapter review. The provider R1 is not self-resolved by synthetic success here. After SHI's corrected producer is reviewed, its separately pinned adapter can enter a later explicitly identified source with applicable checks; current provider access/use/notices/privacy/removal and controlled-activation gates remain. No key or repeated human interface choice is requested. LI's shared page/platform integration is independent owner work.

This package is delivered when published; no completed-review or15October23:59 promise is made. Keep Draft/Open, #105/#109/#110 checkpoints, main, Issues and Projects unchanged. No merge, ordinary/provider/cloud/index/model enablement, whole Event/AI/42-route38-state/Sprint/UAT/Release/Done claim.
