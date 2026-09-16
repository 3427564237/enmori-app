# S2-04 Friend ranking owner evidence — 2026-09-16

- **Owner:** JIN ZIHAN (`@chuxi12483468`)
- **Issue:** #29, S2-04 bounded Friend ranking component
- **Reviewer:** SHI ZHENGQI; independent review pending
- **Branch:** `codex/s2-04-friend-ranking`
- **Base:** `31bdb78574ca04f50d42954816ad33d709f89ca4` (`main`)
- **PR:** [#36](https://github.com/3427564237/enmori-app/pull/36)

## Controlling sources

- [Assigned Issue #29](https://github.com/3427564237/enmori-app/issues/29).
- [S-PM-0913-SPRINT2, internal Friend component](https://github.com/3427564237/enmori-app/blob/3a110132b01f2dee3605351ce123aa90a3376ccb/docs/decisions/2026-09-13-sprint2-scope-capacity-contract.md).
- [Q03 formula, deduplication and ordering](../../decisions/2026-09-01-deterministic-v1-recommendation-formulas.md).
- [Q17 purpose-specific inputs](../../decisions/2026-09-01-recommendation-ai-field-allowlists.md).
- [Q12 active Interest inputs](../../decisions/2026-09-02-interest-tag-event-category-contract.md)
  and [Q14 request-local computation](../../decisions/2026-09-02-retention-logging-audit-policy.md).

## Delivered boundary

The change adds one pure Backend Domain component and owner tests. It accepts
only explicitly typed, already-eligible and purpose-authorized Interest/Event
projections. It performs no candidate read, authorization decision, persistence,
transport registration, public DTO mapping, Qwen call or product integration.

The component:

- deduplicates authorized Interest and Interested/Going Event references;
- computes `2 × shared interests + common Events` under
  `friend_recommendation_v1`;
- excludes candidates with no positive factor;
- applies score, shared-Interest count, common-Event count and canonical opaque
  Candidate ID ordering before Home Top 2 selection;
- scores equivalent repeated Candidate projections once and excludes identities
  with conflicting projections; and
- returns only the opaque Candidate identity, score, approved factor breakdown
  and formula version.

Candidate equivalence compares the complete authorized Interest set and the
union of authorized Interested/Going Event IDs. Array order, repeated references
and Interested/Going state do not change the score. Conflicting projections are
invalid upstream input: the component neither combines their data nor selects
one based on arrival order. This guard does not establish production eligibility.

The caller must supply active/valid Interest IDs and Event associations already
authorized for this requester and purpose. Type names do not prove authorization.
The result is an internal, request-local calculation, not an API response or
stored recommendation history. No unmerged Event/Interest implementation is
required to use or test this component.

## Automated verification

Environment:

- Node.js `24.19.0`
- pnpm `11.19.0`
- no dependency or lockfile change

Commands and results:

```text
npx --yes node@24.19.0 node_modules/typescript/bin/tsc --project backend/tsconfig.json
Pass

npx --yes node@24.19.0 --test "backend/dist/test/**/*.test.js"
125/125 Pass, including 15/15 S2-04 tests;
0 failed, cancelled, skipped or todo

git diff --check
Pass
```

The fifteen focused cases cover formula/breakdown, repeated references,
equivalent and conflicting Candidate projections, all four Interested/Going
state combinations, score/shared-interest/identity ordering, ordering before
Top 2, empty requester and candidate inputs, zero-factor exclusion, zero/one
Home result, every permutation of a three-way identity tie, repeated calls,
fresh computations after reference removal, prohibited fields, output
minimization and input immutability. Throwing getters on prohibited fields prove
that neither requester nor Candidate contextual data is read.

Q03's common-Event tie-break remains implemented. Under the fixed formula,
equal score and equal shared-Interest count necessarily imply equal common-Event
count, so a fixture isolating that third tie-break cannot occur for valid input.
Tests exercise valid ties rather than manufacturing impossible factor vectors.

Historical first submission `ce7c6b7` passed 117 tests, including seven focused
cases, but incorrectly dropped even identical repeated Candidates. Two added
regression cases failed against that implementation before the correction; all
125 tests pass after it. The earlier duplicate test has been corrected, not
retained as evidence for the wrong behavior.

The initial pnpm installation/run attempt was blocked by dependency build-script
approval prompts, and the default Node.js 24.15.0 failed the existing runtime
pin test. No dependency build-script approval or runtime-pin change was made.
The successful commands above use approved Node.js 24.19.0 and the installed
locked dependencies directly; they are not a claim that `pnpm backend:verify`
itself completed successfully. The generated local pnpm policy stub was removed.

## Retained boundaries

This evidence does not claim Account eligibility, Profile Privacy,
friendship/pending-request authorization, a live candidate reader, an endpoint,
Firestore integration, production discoverability, Flutter integration,
Emulator execution, S2-06, UAT, Release or Done. SHI's independent exact-head
review remains required.
