# R2 ordinary Detail completion fence — 20 October 2026

## Source and scope

- Review input: ZHOU comment 4325494513 on PR #167, prior head `fba5a82ebd0074b875f40153381eee6c746a4772`.
- Tested product commit: `ac849740ead323d19419eaf7b3dcd3098445f411`.
- Tested tree: `7bb11f90a38f7ac01f318cb4879ffd5920f04a3b`.
- This record is a subsequent documentation-only commit. No contract, dependency, storage, Flutter or runtime configuration changed.
- Retained authority: 19 October atomic source replacement/same-generation Detail and recommendation invariant; 20 October EB2 permits real next batches but does not supersede that invariant.

## Reproduced cause and correction

The ordinary Detail first-page-miss path returned an awaited raw provider result without validating its admitted projection generation. Operator-gate validation alone did not detect page-zero refresh. The stable-ID correction remains valid but did not cover this sibling branch.

The actual Ticketmaster adapter with synthetic injected HTTP, outer controlled gate, EventBrowse and an actual signed next-page cursor reproduces: page0 A, page1 B/OLD, hold ordinary Detail B, refresh page0 B/NEW, fresh Detail B/NEW, release old B/OLD. Prior source incorrectly succeeds. A failed refresh also incorrectly authorizes that old raw success.

Ordinary Detail now captures the generation synchronously after admitting/joining firstBatch, checks it after waiting and consumes the current snapshot. Both raw Detail paths share one private generation/snapshot/pending/abort completion guard. firstBatch also validates its admitted epoch and exact published items after waiting. Cross-generation work fails closed; no automatic retry, title merge, fallback or new provider read is introduced. Legitimate unchanged-generation next-page Detail remains available.

## Actual commands and results

Environment: Windows, Node.js `24.19.0`, existing approved local TypeScript installation. No dependency installation or frozen-lockfile rerun is claimed.

```text
node node_modules/typescript/bin/tsc --project backend/tsconfig.json --pretty false
node --test backend/dist/test/event-source-generation-regression.test.js
node --test backend/dist/test/event-source-generation-regression.test.js backend/dist/test/controlled-event-projection.test.js backend/dist/test/event-browse-pagination.test.js backend/dist/test/controlled-event-browse.test.js
git diff --check
git diff 900ca6fcdefb77e9aa95d96fa80994ebf826398f --check
```

- Initial new test compile failed because the harness referenced `result.error` instead of the existing `result.failure`; corrected the test before running the product reproduction. This is not a product finding.
- Before product correction: generation file **10 Pass / 2 Fail**. The refresh and failed-refresh assertions both catch an incorrectly successful old Detail. Positive unchanged-generation Detail, disable and caller cancellation already pass.
- After correction: strict compile **Pass**; four affected suites **28/28 Pass**, zero skipped/cancelled. Includes all prior stable-ID/gate/pagination cases, five actual adapter/signed-page ordinary Detail scenarios, and a cached Detail crossing replacement during its firstBatch await. Refresh probe asserts fresh NEW, rejects late OLD, and verifies firstPageReads2/laterPageReads1/rawDetailReads1/pending0. Positive control returns later-page OLD when no replacement occurred. No assertion was relaxed.
- Working and full PR-range whitespace checks **Pass**; Git emits only its existing LF-to-CRLF notice for the test file.
- Local ignored before log: `build/shi-r2-ordinary-before.txt`, SHA-256 `83b2a8b76c7a9817702dcdf3ce2bceaaca13ef9ae2e030b0d97aff0ab5ab74f5`.
- Local ignored final log: `build/shi-r2-ordinary-final.txt`, SHA-256 `c4682a5f0b6d9ba4980695f9b76089b413c01071d18b41067e1e29c68ad6435c`.

## Disposition boundary

R1 remains independently resolved by ZHOU. R2 is **pending ZHOU exact-head independent re-review**, not self-resolved. Earlier failures and evidence records remain intact. Flutter, storage/Emulator, full Backend, provider, Android/browser, UAT and Release were not rerun for this Backend-only repair; prior counts are not transferred to this source. No shared runtime/device/data was changed, no main merge/auto-merge or Issue/Project transition was performed. PR #167 remains Draft/Open; LI retains final integration and device acceptance.
