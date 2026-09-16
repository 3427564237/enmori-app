# S2-04 Friend ranking owner evidence — 2026-09-16

- **Owner:** JIN ZIHAN (`@chuxi12483468`)
- **Issue:** #29, S2-04 bounded Friend ranking component
- **Reviewer:** SHI ZHENGQI; independent review pending
- **Branch:** `codex/s2-04-friend-ranking`
- **Base:** `31bdb78574ca04f50d42954816ad33d709f89ca4` (`main`)

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
- fails closed on duplicate Candidate identities; and
- returns only the opaque Candidate identity, score, approved factor breakdown
  and formula version.

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
117/117 Pass; 0 failed, cancelled, skipped or todo

npx --yes node@24.19.0 --test backend/dist/test/friend-recommendations/friend-ranking.test.js
7/7 Pass; 0 failed, cancelled, skipped or todo

git diff --check
Pass
```

The seven focused cases cover formula/breakdown, repeated references and
Interested/Going overlap, all applicable deterministic ties, ordering before
Top 2, empty input, zero-factor exclusion, duplicate Candidate identity,
prohibited contextual fields and caller-input immutability.

## Retained boundaries

This evidence does not claim Account eligibility, Profile Privacy,
friendship/pending-request authorization, a live candidate reader, an endpoint,
Firestore integration, production discoverability, Flutter integration,
Emulator execution, S2-06, UAT, Release or Done. SHI's independent exact-head
review remains required.
