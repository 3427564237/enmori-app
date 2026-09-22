# S2-02 Transport and persisted Event owner evidence

- Owner: SHI ZHENGQI / `GGGGHOST-CN`; Issue [#28](https://github.com/3427564237/enmori-app/issues/28)
- Branch / PR: `codex/issue-28-s2-event-recommendations` / [Draft #33](https://github.com/3427564237/enmori-app/pull/33)
- Recorded: 2026-09-15 15:51 SGT / 07:51 UTC
- Earlier first-slice evidence remains historical, not overwritten
- PM contract: S-PM-0915-S2EVENT-MAPPING, added by LI at `fb4cf05`, confirming the proposal at `035e78b0d78bd6ab5a62242420742421ce7b8895`
- Baseline: `31bdb78574ca04f50d42954816ad33d709f89ca4`
- Independent reviewer: ZHOU YAOYIN / `YaoyinZhou3922`; no approval claimed

## Implemented boundary

The existing authenticated application can register
`GET /v1/recommendations/events?view=home|all`. The controlled composition root
constructs the real read adapter and use case. Existing R4 callers without the
optional feature dependency retain their existing routes/behavior.

The route authenticates before query validation and accepts exactly one `view`
and no unknown query fields. `REQUEST_INVALID` / 400 is emitted only for Event
query problems. A forbidden body is refused with the existing generic safe 503,
not misclassified with the query-only code. Existing endpoints' error handlers
remain unchanged. Static response serialization explicitly includes only the
approved fields and `reasonCode: interest_match`; no source spread, score,
private reason, identity binding, vendor data or document path is exposed.

OpenAPI 3.1 includes the approved Event operation and schemas. An owner test
dereferences its Event response schema and compares it exactly with the static
Fastify response schema. The global error enum gains the approved query code,
but no existing endpoint gains a new query error behavior.

The Firestore adapter first resolves the existing exact UID mapping and validates
the completed Account, then reads only that account's selection and its current
Tag records. It constructs only valid purpose-specific Event inputs. Event
records reject unapproved fields and derive identity solely from the path.
Calendar-exact Z UTC timestamps preserve up to nine fractional digits and
require `endAt > startAt`. Matching removes inactive/missing/invalid references.
Complete Event ordering precedes Top 2; title/labels are mapped after ranking.
The read capability exposes no mutation, history, cache or initialization API.
Vendor failures are normalized in Infrastructure. No new dependency, index,
general query framework, deployment setting or real-data project is introduced.

## Exact executed commands and results

Runtime: Node.js **24.19.0**, pnpm **11.19.0**, TypeScript **7.0.2**.
Firebase CLI **15.29.0**; Java **21.0.8** from the existing Android OpenJDK.
The unchanged lockfile's last-changing commit remains
`d8ea465bdbb22c0bb69e10b4f7dba54f2c6761d0`; SHA-256 remains
`906AE91BD9C959BB5B83CE0420AAC8D56ABF9C8A65A7C231D8A0038056BD1783`.

```powershell
pnpm install --frozen-lockfile --ignore-scripts --offline --store-dir '<project-root>/.pnpm-store' --config.update-notifier=false
# Pass, already up to date; no approved build scripts or lockfile changes
$env:pnpm_config_store_dir = '<project-root>/.pnpm-store'
$env:pnpm_config_verify_deps_before_run = 'error'
pnpm backend:verify
# Strict compile Pass; Backend 151/151 Pass, 0 failed/skipped/cancelled/todo
node --test 'backend/dist/test/event-recommendations/*.test.js'
# Event-focused tests 40/40 Pass
$env:PATH = 'C:\Program Files\Android\openjdk\jdk-21.0.8\bin;' + $env:PATH
$env:FIREBASE_EMULATORS_PATH = 'C:\Users\施正圻\.cache\firebase\emulators'
node backend/scripts/run-s2-event-emulators.mjs
# Actual Auth + Firestore Emulator 22/22 Pass, 0 failed/skipped/cancelled/todo
# Child script exit 0; CLI exit 0; Emulators shut down normally
git diff --check
# Pass
```

These environment assignments are process-local; no global setting was changed.
The new outer CLI wrapper strips ambient credentials using the existing
controlled-environment builder, creates an isolated temporary credential
profile, reuses the existing non-real `demo-enmori-rmvp01a-r10` test project and
loopback ports 9099/8080, and invokes the retained Node Emulator runner directly.
The retained runner creates a second isolated profile for actual tests and
enforces test mode, loopback, no ambient credentials and synthetic project.
Generated temporary profiles are removed with scoped cleanup. The jar was
reused from the existing cache, not a newly selected Emulator version.

## Coverage and observed limits

Full Backend: existing 110 baseline tests + 40 Event-focused cases + one new
exact OpenAPI/static-schema comparison = **151**. Existing R4/R9/R10 fake-gateway,
Transport, contract and configuration suites remain included.

Actual Emulator: retained seven R10 and five R13/X-01 tests + six shared Event
Port contracts + four Event API/initialization cases = **22**. The same six
Event repository contracts run against fake-gateway and real Admin/Firestore
implementations. They cover persisted full ordering, precise upcoming boundary,
own selection, invalid source/selection, deactivation/restore/rename, and reads
not changing any stored record. New real Auth API cases cover Home/All, strict
duplicate query, independent captures/re-reads, own-account isolation, missing/
malformed/expired/disabled/revoked identity, and create-only fixture races.

The initialization exercise is **test-only**, for named synthetic Emulator Tag/
Event targets. It uses protected all-read-before-create consistency, exact
repeat no-op, conflicting named-target no-write, concurrent repeat safety and
preservation of unrelated records/accounts. It is not a Demo initializer, Demo
manifest acceptance, production write or deployment evidence.

Firestore CLI warns that the existing Emulator configuration lacks client
rules and defaults to allowing client reads/writes. This unchanged test setup
proves Admin Backend behavior only, **not production/client deny rules**.

## Troubleshooting retained honestly

The initial outer CLI attempt called `pnpm backend:emulator:test` under its
isolated profile. pnpm's `runDepsStatusCheck` invoked an automatic install, which
failed with `ERR_PNPM_IGNORED_BUILDS`; no tests ran in that attempt. No build
scripts were approved. Its generated untracked `pnpm-workspace.yaml` placeholders
were inspected and removed; no such policy file is committed. Per the project
`systematic-debugging` workflow, the failure was traced to the package-manager
launch boundary rather than application/adapter logic. Calling the already
approved Node test runner directly removed that boundary and the actual full
Emulator run passed. Frozen offline installation and owner verification were
then repeated successfully. One auxiliary CLI invocation with unsupported
flags also failed before testing; the successful process-local reproduction
above is the command used for the final Backend result.

## Remaining gates

- ZHOU current-head independent review: **Not Run**; requested separately on the published head.
- Actual Demo initialization: **Not Run**. LI's isolated-demo allowlist and exact named manifest remain deferred; no Demo initializer was wired or run.
- LI/DU UI integration, JIN Event increment evidence, physical Android, Q04, accessibility, UAT and Release acceptance: **Not Run / not inferred by SHI's owner tests**.
- SHI's reviews of JIN's S2-04/S2-06 artifacts remain separate assigned outputs, not performed here.
- Issue #28 remains open; PR #33 remains Draft. No Project change, merge, closeout or Done is inferred.

Only project-local code/evidence was changed. The original `E:\COMP3851B`
checkout, its user untracked files, report artifacts and other projects were
not modified. No personal Skill or global installation was used.
