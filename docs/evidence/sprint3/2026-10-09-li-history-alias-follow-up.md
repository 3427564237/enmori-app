# LI focused history alias follow-up

Date: 9 October 2026, Asia/Singapore. DU returned #64 `5e3c3399f4f06fc3d531003e796e5a23269a23d6`, base `f46a903cb5b339365ac2024004b32b7b96b99e7c`, after LI's review of `899fa9b`. The actual delta is two Backend source/test files, eight additions and five deletions. R1 runtime isolation and R3 Note handling remain cleared; their original threads remain resolved.

[LI formal re-review 5467202701](https://github.com/3427564237/enmori-app/pull/64#pullrequestreview-5467202701) remains Changes Requested for the same R2 input-contract issue. [Focused reply in the original R2 thread](https://github.com/3427564237/enmori-app/pull/64#discussion_r4227797052) supplies the complete tested recognized-alias set. This record supersedes only the old current-head/three-example-failure observations in the [prior re-review](2026-10-09-li-history-correction-rereview.md); no new requirement is selected.

The new source adds a three-name `SINGLE_COMPONENT_IANA_ALIASES` Set: Singapore/Japan/Portugal. Those original diagnostic examples now pass, together with EST/MST/CET rejection and ordinary route exclusion. The recognized-IANA input contract did not approve a three-name exhaustive allowlist. The new code still rejects supported non-abbreviation IANA identifiers solely because they lack `/` and are absent from that Set.

## Full focused probe set and result

The [IANA backward-link source](https://data.iana.org/time-zones/tzdb/backward) supplies the following 17 non-abbreviation identifiers. For each, the test first asserts that the actual pinned Node 24.19.0 / Temporal dependency recognizes and preserves the exact supplied identifier, then executes the real ListOwnCheckInsForDate with a fake page repository, standard cursor/clock fakes, synthetic principal and date 2026-10-07.

| Result | Recognized IANA identifiers |
| --- | --- |
| Pass (3) | Japan, Portugal, Singapore |
| Fail (14) | Cuba, Egypt, Eire, Hongkong, Iceland, Iran, Israel, Jamaica, Kwajalein, Libya, Navajo, Poland, Turkey, W-SU |

All 17 recognition assertions pass. The 14 failures occur in the application's expected-success assertion; requests return REQUEST_INVALID before repository access. Including the six original valid-zone/abbreviation/exclusion controls, the focused suite is **23 cases: 9 Pass / 14 Fail**. This is coverage for the unchanged recognized-IANA contract, not a newly selected exhaustive product allowlist. Correct the original recognized-name versus forbidden-abbreviation distinction rather than adding only the next failing examples.

LI independently executed the pinned-head strict TypeScript build and full Backend suite: **323/323 Pass**, zero failed/skipped/cancelled. The new failure set and root cause were reproduced against the actual changed code. Whitespace checks passed. Product source/manifest/lock/SDKs were not changed. Local probe source and logs are retained under `/tmp/enmori-li-history-alias-20261009/`; the immutable managed checkout and approved dependency reuse were used, with the temporary node_modules link removed afterward.

LI's prior actual Emulator 39/39, Flutter 158/158, clean analysis and Note probes 5/5 at `899fa9b` retain their original head/attribution. They were not rerun for this Backend-only correction. DU's current description reports current-head Backend/Emulator/Flutter passes and attributes the identical-Flutter APK to the earlier build without a new rebuild. No current-head LI Emulator/APK/Android result is claimed. UI/device/screenshots/accessibility, real data/index/runtime, UAT and Release remain Not Run or outside this backend/read-slice PR.

## Next accountable work

DU returns one correction preserving recognized non-abbreviation IANA identifiers, rejecting abbreviations/numeric offsets/unknown zones, and retaining exact input/cursor binding. No new dependency or narrowed contract is authorized. Reuse the complete probe set and provide a focused immutable head; unchanged R1/R3, physical preparation, Flutter and Backend acceptance records do not need repeated review.

No history component acceptance or combined tree is created. #64 stays Draft/Open, original R2 remains open, and main remains unchanged. LI will supply the actual combined candidate after this remaining correction passes; JIN runs its new gate and LI independently reviews that gate. The separate [P08 full-isolated choice](../../decisions/2026-10-09-li-persona-p08-isolated-flow-approval.md) and [ZHOU task #68](https://github.com/3427564237/enmori-app/issues/68) can proceed under their own JIN consistency-review gate and accepted Persona Backend, without waiting for history.

Original 42-route/38-state/11 October target, preparation status and the five previously accepted bounded increments/components remain. This follow-up adds no accepted history numerator, overall completion percentage, merge, existing Issue/Project transition or full-module/Sprint/UAT/Release/Done claim.
