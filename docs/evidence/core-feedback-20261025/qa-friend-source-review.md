# QA — friend event-source readiness review

Date: 2026-10-25. Candidate:
`5be33c61583e41d7fafe4960455ad97f122500dd`.

QA read the two changed production files in Context's candidate and found no
blocking defect in that bounded slice. This was source review only: no test,
TypeScript build, provider or service call was executed.

- `friend-event-projection.ts` adds optional public-event readiness preparation
  and passes the captured ranking time into each subject read.
- `firestore-friend-recommendations.ts` checks the current owner and optional
  processing purpose before preparation. The provider await occurs outside the
  Firestore transaction; the full transaction then reads authority again.
- All authorized subject reads share the same new ranking `asOf`. Preparation
  and read failures use the existing failure mapping instead of silently treating
  unavailable events as zero common events. Ranking weights, privacy checks and
  existing source lifetime are unchanged in this slice.

Root's actual social/bootstrap producer adapter is outside the candidate. The
final integrated source must supply real readiness through `prepare` and honor
the fifth read argument. Four added fake cases were not run by QA; Context's
earlier 78-case today-context result does not cover this newer candidate.
