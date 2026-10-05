# ZHOU S3 Persona and AI kickoff preparation

Prepared 2026-10-05 for [Issue #49](https://github.com/3427564237/enmori-app/issues/49). Owner: ZHOU YAOYIN. Assigned independent reviewer: JIN ZIHAN (`chuxi12483468`). Status: **preparation packet for independent review; JIN review and LI acceptance Pending**.

The [contract and operation proposal](../../planning/2026-10-05-s3-persona-ai-contract-proposal.md) is the review artifact. It retains the approved Q19/Q17/Q31/Q14 semantics, proposes physical Persona names for LI consideration, compares AI operation choices and lists the first permitted producers. It makes no implementation decision and introduces no product/API/schema/runtime/dependency changes.

## Baseline and local preparation

- Starting local main: `432f5285966a6c2705473be21a2652ca2869520a`.
- Fetched and fast-forwarded main to `adf20c8c34282263623d77724ad4e859c948926d`, including accepted SHI/JIN preparation artifacts. Earlier local decision/review records and configuration backup were preserved with unchanged hashes.
- Drafting/publication branch: `codex/issue-49-persona-ai-contract`, based on that main commit. The PR head identifies the document-only submission; the product-code baseline is unchanged.
- Issue #49 and its comments were checked before drafting: Open, no comments and no recorded independent review. These are dated observations, not a future status claim.
- Source inspection covered the current route inventory, Flutter timeout/client ownership, internal runtime lifecycle and declared integration obligations. No model or real product data was accessed.

## Issue acceptance mapping

| Issue #49 item | Local deliverable | Disposition |
| --- | --- | --- |
| Minimal physical Persona contract preserving approved lifecycle | Candidate owner identity mapping, DTOs, six operations, storage/state authority, concurrency and replay decisions | Draft prepared; LI physical-contract confirmation Pending |
| Wait/cancel/late-result proposal for 15s client versus 60s runtime | Options A/B/C, separate cancellation observations and original Application lifetime/slot obligations | Draft prepared; LI operation choice Pending |
| First allowed producer reads and consent/purpose checks | LI/DU/ZHOU responsibilities, Q17 projection and excluded cross-purpose reuse | Draft prepared; missing producer authority remains Pending |
| Owner cases and smallest later integration slice | V01-V14 planned checks and Persona-only first slice followed by separately gated AI integration | Plan prepared; new-slice tests and implementation Not Run |
| JIN independent preparation review | Reviewable proposal and evidence on the publication branch | Pending; formal request and disposition are tracked on the associated PR; local checks do not substitute for review |

## Local logical self-check follow-up

The five groups identified during the local self-check have been incorporated into the proposal, decision questions and planned cases. This completes the requested document additions, not their Pending implementation decisions or execution:

| Added boundary | Decision / planned cases | Remaining authority |
| --- | --- | --- |
| Create interruption and old replay | P03 / V02: mutation versus receipt/acknowledgment interruption in both directions; valid replay, command after receipt cleanup and explicitly new create are distinguished | LI confirms recovery, freshness, minimized retention and safe expired-command outcomes; no transaction or permanent receipt retention selected |
| Concurrent set reads | P02 / V06: interleaved create/delete/activation cannot mix incompatible items, Active pointer and state revision or fabricate empty/zero-Active success | LI confirms the read boundary/mechanism and safe failure policy |
| Persona snapshot while queued | P06 / V07: start/admission/capture ordering, queue-time edit/switch versus permanent deletion, and the original request budget | LI confirms lifetime composition; a deferred `prepare` lookup is not assumed to satisfy request-start semantics |
| Old cancellation versus a new retry | P05 / V08: A terminal, B accepted, delayed cancel for A cannot affect B | LI confirms original-operation reference, verified-owner checks and terminal/repeated-cancel responses; no new operation store selected |
| Capacity rejection and explanation fallback | P06 / V12: explicitly records Q31-B pre-acceptance rejection versus Q31-D original-deadline fallback applicability | LI clarification Pending only for that Recommendation explanation path; Persona and AI Conversation's non-content capacity failure are not blocked by this question |

All added runtime/adapter/UI scenarios remain **planned, Not Run**. No product behavior, physical contract or source supersession was approved by the local self-check. The first four Issue preparation items now have updated artifacts; JIN's named independent review remains outstanding. Unresolved P01-P08 decisions can accompany that review and do not all have to be settled before the preparation artifact is reviewed.

## Validation record

Rechecked 2026-10-05 after the five self-check additions, against the unchanged product-code baseline above:

| Check | Observed result |
| --- | --- |
| Relative document/source links | Pass: all 20 occurrences resolve to 18 distinct local files |
| Pinned Sprint 3 handoff | Pass: the exact `479619e8d124f3342458506fc145dc4bfbe3f483` Git object and referenced path exist locally |
| Both new Markdown files | Pass: no trailing whitespace or conflict markers; code fences balanced; table column counts consistent |
| Untracked-file diff checks | Pass: `git -c core.autocrlf=false diff --no-index --check` against an empty file for each new document; invocation-only configuration, no repository configuration change |
| Decision and verification coverage | Pass: P01-P09 and V01-V14 appear once each; six assigned routes/states are mapped |
| Source-scope review | Local review of the added replay/read-consistency and snapshot/cancel/fallback wording found no required corrections; decision questions and planned cases correspond. Earlier Active/no-Active and consent-limited M26 corrections remain; Q04-C is supporting evidence under Q04-D |
| Git boundary | Before publication staging, HEAD was `adf20c8c34282263623d77724ad4e859c948926d` with no tracked or staged modifications. Only these two new repository documents belong to this preparation; all three pre-existing local files retained their pre-edit SHA-256 hashes and are excluded from submission |

The follow-up checks ran successfully as an inline PowerShell command block; the latest local output is retained under ignored `build/issue49-preparation/validation.json`. During the original preparation, the first wrapper classified Git's LF-to-CRLF notice as a failure; the per-command line-ending override above isolated that notice without changing file content or Git configuration. The original saved `.ps1` entry point was blocked by the existing execution policy; that policy was not changed. Those earlier diagnostics are not failures of the updated proposal or evidence of product execution.

Runtime, provider, API, Emulator, Android and live-Qwen tests for this new slice are **Not Run**; no product code changed. Previous test executions remain separately attributed historical evidence, not results of this drafting task.

Local automated/editorial review is a drafting aid, not JIN's assigned independent review or LI's decisions. Nothing here marks Issue #49 Done, approves a physical contract, or claims Sprint/UAT/Release acceptance.

## Review handoff

The initial preparation was intentionally kept local. The owner subsequently authorized submission and a request for JIN's independent review; that authorization changes publication status only, not any Pending product or architecture decision. The Issue scope and remote main were rechecked before submission. Use the associated PR's exact head, two-file diff and formal review request as the publication record. Preserve P01-P08 for LI, address JIN's findings on the reviewed branch, and retain #49 as incomplete until its review/acceptance path is satisfied. This packet does not authorize merging, closing the Issue, or implementing the candidate contracts.
