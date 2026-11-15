# Accepted friend missing from one list — 15 November 2026

Authority: [LI's bounded display/search amendment and backend update approval](../../decisions/2026-11-15-li-friend-list-name-fallback.md). Base: `b80c09cd`, retaining deployed v70's backend tree. Branch: `souma/friend-name-fix-20261115`.

## Diagnosis and correction

Read-only inspection of the two reported accounts found one accepted undirected friendship, both valid owner-list pointers, no block, eligible accounts, and a non-private sender with a null DisplayName. The recipient's actual DisplayName was present. The request presentation already permits the sender's discovery-authorized Username fallback, while My Friends discarded null-name rows. The asymmetry therefore persisted across fresh reads and app restarts.

The list and search now project the canonical Username only when the parsed Profile's optional DisplayName is null. An actual DisplayName takes precedence, including search. The private-profile check still precedes the fallback. No writes, additional fields/reads, route changes or persistent data repair were added. Existing profile parsing, eligibility, blocks, pair/pointer/reservation checks, pagination and errors are unchanged.

## Source and isolated verification

- Pinned Node 24.19.0 and locked TypeScript: strict build passed; all **1,957 backend tests passed**.
- Seven focused regression cases cover valid public/friends-only unnamed accounts, incomplete saved Profiles remaining errors, request acceptance with both list directions, protected rows, fresh rename/search behavior and malformed names. The pre-fix regression run failed on the missing-row cases. Initial fixture attempts incorrectly treated an incomplete saved Profile as a valid unset name; those expectations were corrected to preserve the existing parser, without broadening product validation.
- Actual Auth/Firestore Emulator: **13 focused Friend cases passed**, including the new authenticated send → inbox → accept → both lists → fallback search → privacy withdrawal chain. The independent-page and retry cases retained **106 reads per transaction attempt**.
- The first mixed Emulator suite reported 15/16 passed. Its unrelated Check-in test expects HTTP 400 for an explicitly supplied Check-in visibility but receives 201. Running that exact case on unchanged `b80c09cd` reproduced the same failure. It is retained as a baseline failure, not claimed fixed or included in the Friend pass count. An initial negative filter also ran the mixed suite; the final explicit Friend filter completed successfully with emulator teardown.
- The reused deployment wrapper passed **9 offline checks**; its unchanged runtime-owner baseline guard passed **9 checks**. These are operational guard checks, not product acceptance.
- Diff review confirms a single product-code change in the existing repository read projection. `git diff --check` passed. No Flutter implementation or dependency changed in this backend candidate.

## Delivery boundary

Backend package preparation, deployed identity, runtime restart and fresh connected results are recorded separately after execution. The source/Emulator results above do not by themselves claim a live fix or phone acceptance. No reported-account mutation, paid AI call or notification probe is part of this task.
