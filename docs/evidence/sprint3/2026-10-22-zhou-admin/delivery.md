# ZHOU Admin interest catalogue delivery — 22 October 2026

## Authority and source

Implements [the PM's complete Admin task](../../../handoff/2026-10-21-parallel-completion/zhou-admin.md),
[parallel allocation](../../../decisions/2026-10-21-li-parallel-completion.md),
and [the later UI ownership clarification](../../../decisions/2026-10-21-li-product-ui-redesign-and-defaults.md).
[Q12](../../../decisions/2026-09-02-interest-tag-event-category-contract.md) and
[19Oct single creation](../../../decisions/2026-10-19-li-core-feature-delivery.md)
retain their original authority. This is not a new role system or catalogue CRUD package.

- Base: `souma/li-zhou-runtime-20261020`, exact `986d4f895252f266c1f6bf785b7f0c24ee03643e`.
- Feature branch: `codex/zhou-admin-catalogue-20261022`.
- Product/API/tests commit: `4fcd09f45cfcfb81e87233cd383f1f80149046f6`, tree `b54e1b9f8e3c83eab38736cb882037a3e90c1a90`.
- Later evidence commits change only this directory. Final PR head is reported in GitHub; no old module approval is reused as approval of this package.
- [Verification receipt](verification.json) binds all 27 changed source/contract/test blobs, commands, local raw-log SHA256 receipts, and explicitly reused boundaries.

## Delivered flow and integration seam

Profile exposes **Manage interest catalogue** only after a current server-confirmed capability. The entry refreshes on foreground resume, before navigation and after return. It captures the observed session, including same-UID replacement; an old rendered callback cannot open a new session's page.

The independent page loads the existing active catalogue, accepts one display name, creates through the existing Backend command, then separately reads the catalogue. Only an exact server ID/name readback clears the draft and displays confirmed creation. Ordinary users can refresh the existing interest editor, choose the new stable ID, save and independently reread their selection. Existing IDs and references are preserved.

409 name conflicts (including inactive reserved names), 422 validation, 401/403, network/read failure and double clicks have explicit states. Failed reads never become empty catalogues. Unknown creation blocks another submit until an explicit catalogue read; the client does not automatically resend. A matching name alone is catalogue evidence, not proof that this request created it. A successful201 with failed/mismatching readback retains its acknowledgement and permits only readback recovery. Drafts survive failures, leaving warns, and session replacement clears page/controller state and rejects late token/result/navigation callbacks.

`OwnProfilePage.adminCatalogueEntry` is the optional Widget seam; `InterestAdminEntry` supplies the gated entry. `AppRoutes.adminInterests` opens the page; direct entry has safe Back-to-Profile fallback. `BackendAdminInterestRepository` uses the existing shared client, wired in both normal bootstrap and `ControlledDemoApp`. The UI owner may style this page/entry without reimplementing its business logic. Bottom navigation and other pages are not redesigned here.

The [minimal capability contract](../../../../api/interest-admin-capability-contract.md) was written before Backend changes. The only new API is authenticated `GET /v1/me/interest-tag-admin-capability`, exact `{canCreateInterestTags:boolean}`, with `no-store` on every outcome. It uses the existing current Firebase authority. The existing POST independently checks current `enmoriAdmin === true` and enabled user on every attempt; no client role grants authority. A disablement racing after successful token verification may safely produce capability false rather than verifier403. No storage schema/index, writer, normalization, identity model, dependency, runtime environment guard or role-grant operation changed.

## Verification and preserved failures

Environment: Node24.19.0, pnpm11.19.0, existing TypeScript7.0.2; FVM Flutter3.47.2 / Dart3.13.2. Frozen dependencies/lockfiles are unchanged. No full Backend/Flutter suite was repeated.

| Check | Actual result and attribution |
| --- | --- |
| Strict Backend compile | Passed twice; second compile followed the test-only envelope assertion correction. Empty stdout, no build log file was generated. |
| Initial four-file Backend batch | 29/30 passed. The one failure was the new test reading `.interestTags` instead of the existing `.interests.interestTags` response envelope. Existing catalogue5, Firebase identity9 and OpenAPI6 all passed. |
| Only corrected capability file rerun | 10/10 passed; the other20 were reused. Thirty distinct Backend cases are covered across these runs, not a claimed new30/30 command. |
| Admin direct-route Back regression | Initial implementation failed0/1 with `There is nothing to pop`. The unchanged regression now passes in the batch below after current-session/path/gate checks and canPop/fallback repair. |
| Flutter focused five-file batch | **69/69 passed**: new Admin repository/controller/page, connected Profile→create→readback→ordinary selection, direct-route/old-callback cases, and existing affected Profile flow. Standard asset-enabled tests; no shader/asset bypass. |
| Shared BackendApiClient group | **7/7 passed**, selected from the existing repository suite; other feature groups were not run. These are distinct from the69 above. |
| Scoped Dart analysis | Initial17 files: only five lint infos, no type errors. The affected three files were reanalyzed after fixes: **0 issues**. Remaining14 files were unchanged. |
| Final non-writing Dart format | 17 files,0 changes; staged whitespace check passed. |
| Internal independent source review | Found the Back issue before final publication; final review found no remaining blocker. This collaboration-agent review is not LI/JIN's formal GitHub approval. |

After the69-test batch, four `if (...) return` statements in the Admin page/controller were wrapped in equivalent braces, and the repository test received formatting only. Independent review compared predicates, return positions and branches and confirmed no logic change; the affected product files passed analysis. **The69 tests were not rerun after this style-only cleanup, and are not labelled a fresh execution of the final tree.** Profile's equivalent null-aware collection element cleanup happened before the69 batch. Log hashes and the exact sequence remain in the receipt.

Setup-only failures are also retained in the tool record: the host default pnpm11.25.0 failed the pinned engine check, offline Flutter lacked the already locked latlong2, one FVM option name was invalid, and a Windows shell interpreted a regex filter pipe before tests started. Pinned pnpm11.19.0 and locked online package retrieval resolved setup without changing dependencies; the shared test group then ran with a plain-name filter. None of these was presented as a product test failure or pass.

## Reuse and remaining ownership

The original creation use case, Firebase Admin authority, Firestore writer, catalogue-name/Unicode rules and ordinary interest selection implementation are unchanged. Their prior bounded real isolated Emulator concurrency/ordinary/revoked evidence is retained at [LI's19Oct record](../2026-10-19-core-execution/runtime-and-validation.md), with source blob equality listed in the receipt. It is previous LI synthetic-environment evidence, not a new Emulator execution by ZHOU. Earlier whole-suite totals are not added to this delivery's results. AI/Persona/model, Events, storage persistence, indexes and unrelated UI evidence are reused only within their original scopes.

LI is the formal new-function reviewer and final integration owner; JIN supplies the scoped independent permission review after his own main delivery, as assigned by PM. This author does not approve this PR. Real Admin authorization and actual catalogue creation remain LI's local follow-up: use a deliberately authorized account and intended catalogue name, verify the entry/create/independent read/ordinary selection plus subsequent permission withdrawal on the integrated candidate. This delivery does not grant any real account a claim or mutate real user/catalogue data.

Actual Firebase/Firestore Emulator execution for the new capability, real Admin credentials, host deployment/restart, APK build/install and physical-device acceptance: **Not Run**. Current new Backend tests use Fastify injection, the actual Firebase adapter with synthetic SDK responses and an in-memory gateway; Flutter tests use fakes/stateful synthetic HTTP. No private configuration, service account, signing material or user content was read/copied/published. No main merge, release, Issue/board closure or whole-app Done claim.
