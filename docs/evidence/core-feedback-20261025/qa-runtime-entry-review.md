# QA — local first-flow entry review

Date: 2026-10-25. Reviewed candidate:
`193b1e3b7749fc12482792f482afe84fba193f86`, based on
`087281e11ec5a681fd012b9d64431b225ed6f8ea`.

Independent source review found no blocking defect in the two production-file
changes. This is not an independent execution of Runtime's 13 tests, a deployment
approval, or evidence that the phone's Send button is repaired. QA did not run
Node, a build, model, Firebase, emulator, service, or notification operation for
this review.

## Reviewed boundaries

- **Default off.** Missing private `firstFlow` returns undefined. The real entry
  passes that exact value into the existing fourth runtime argument. It cannot
  silently enable the feature when `fullFeatures` is false; this combination
  fails before credentials, lock acquisition, runtime creation or listeners.
- **Minimal private configuration.** The parser requires explicit owner UUID
  and Firebase UID, rejects unknown top-level/worker fields and any push/model
  override, validates UID length/control characters, and copies/freezes the
  accepted projection. No owner discovery or user settings mutation was added.
- **Push stays absent.** The parser cannot produce `configuration.push`.
  The unchanged first-flow composition therefore uses a sender returning
  `not_attempted`; no FCM sender or push credential path is selected by this
  entry. Existing in-app functionality is separate from native notification
  configuration.
- **Bounded worker.** Omitted worker means no due worker. A selected worker uses
  an absolute future expiry no more than 30 minutes away; interval values are
  bounded to valid timer integers. The existing constructor rechecks expiry.
  Startup does not extend it after model preload; expired configuration fails
  on restart instead of silently receiving another window. Worker start/ticks
  check the unchanged deadline, and its deadline timer aborts scheduling.
  This is a controlled verification window, not evidence that long-term
  background companionship or future scheduled delivery has been fulfilled.
- **Current authority.** The unchanged actor verifies the fixed Firebase user.
  Each store transaction rereads its binding, requires that owner to equal the
  configured account, and checks accepted purpose and current source state.
  A configured scope does not grant consent or create settings/intents.
- **Unknown outcomes.** No changes occurred under production `proactive`,
  `ai-conversation`, or `ai-runtime`. Existing recovery/dispatch logic and
  `stopAi`'s wait for accepted/unknown physical work remain. Configuring or
  expiring the worker is not permission to release an unresolved operation.
- **Honest startup status.** The new fields are only `configured`,
  `workerConfigured`, and `pushConfigured:false`. They describe selected
  configuration and contain no owner/source values. They do not assert current
  model health or successful feature construction; a model preload failure can
  still leave the first-flow composition absent. The author's evidence document
  states this limit explicitly.

Source anchors at the reviewed candidate:
`tool/run_real_account_local.mjs:37–40, 52–54, 101–105`;
`backend/src/bootstrap/retained-core-runtime.ts:78–103, 158–188, 270`;
unchanged `backend/src/bootstrap/first-flow-composition.ts:35–91`,
`backend/src/proactive/application/due-worker.ts:24–75`, and
`backend/src/proactive/infrastructure/firestore-first-flow-store.ts:122–141`.

## Test and operational evidence limits

QA read both new test files. The entry tests execute the actual entry module with
filesystem, credentials, Firebase, locks, listeners, runtime and network effects
replaced. The backend tests exercise the real composition/due-worker classes
against a synthetic metadata gateway and fake model transport. Their assertions
cover forwarding, rejection before effects, no default model/writes, authorised
publication, and revoked consent/binding/source rejection. Runtime reports
4 entry + 6 new backend + 3 existing bootstrap tests passing; these remain
author-provided results, not QA execution counts.

The unchanged factory starts a configured worker after building the app and
before the outer HTTPS listener begins. Therefore Root must select the actual
account and absolute window before any real launch. The evidence describes that
timing; merely reviewing or merging this source does not start a worker.
No candidate config, service unit, live endpoint, account, or phone was changed.
