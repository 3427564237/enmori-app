# Issue #6 R9 verification — 2026-09-05

## Scope

- Branch: `codex/issue-6-r9-infrastructure`
- Accepted R4 `main` commit: `fcaff75349f15b298412cd105273708b6d87e913`
- R9 integration commit: `1bb13020291057ddc478779533b6e69e505f524e`
- Toolchain authority: `S-PM-0905-RMVP01A-TOOLCHAIN`
- Auth Binding ID authority: `S-PM-0905-RMVP01A-AUTHBINDING-ID`
- Controlled data only: deterministic `controlled-*` identifiers, synthetic usernames, notes and timestamps
- Reviewer path: SHI independently reviews R9 Infrastructure in R5A

This evidence covers the required integration of R9 with the accepted R4 head:
the accepted Application/Domain/Ports, Transport, OpenAPI and owner tests remain
present, while R9 adds Firebase Admin Auth Principal verification, Firestore
repositories, atomic transaction behavior and Infrastructure contract tests.
R10 controlled Emulator/environment work and R11 boundary review are not
started.

## Approved execution environment

| Item | Result |
|---|---|
| Node.js | `v24.19.0` |
| pnpm | `11.19.0` |
| Lockfile | `pnpm-lock.yaml`, frozen during verification; SHA-256 `BBB1C963E479D3785A8236E6FE056801477BAA7133FAA9BDBCE3EC166CE5069D` |
| Credentials / real data | None used |

## Reproduction

```powershell
pnpm --version
node --version
pnpm --config.ignore-scripts=true install --frozen-lockfile
pnpm --config.ignore-scripts=true run backend:verify
git diff --check
```

Result: frozen install passed; strict TypeScript compile passed; the recursive
combined R4+R9 suite passed, **76/76**, with 0 failed, skipped or todo; diff
check passed. The 76 tests comprise all 39 accepted R4 owner tests and 37 R9
Infrastructure/adapter contract tests, including the two accepted-Port
integration regressions for exact retry without a fresh creation candidate.

`ignore-scripts` is explicit because pnpm reports pending lifecycle scripts for
three transitive packages. No lifecycle script was approved or executed for R9.
The project-level allow/deny policy remains an approval question before R10.

## Contract coverage

- Firebase ID token verification requests revocation/disabled-user checking.
- Invalid, expired, revoked and disabled tokens map to stable Port results.
- Unknown Firebase/provider errors map only to `dependency_unavailable`.
- Onboarding atomically creates the approved Auth Binding, Username Reservation,
  Product Account and committed idempotency result.
- Check-in creation atomically creates the approved Check-in and committed
  idempotency result.
- Raw idempotency keys are neither persisted nor used in document paths.
- Generated IDs and times do not affect request fingerprints or exact retry.
- Exact committed retries remain recoverable when R4 cannot supply a fresh
  optional creation candidate after Clock or ID generation failure.
- Reused keys with changed member input create nothing new.
- Missing and non-owned Check-in reads produce the same privacy-safe result.
- Application-derived onboarding consent/visibility is persisted without being
  re-derived by Infrastructure.
- Infrastructure rejects a non-24-hour expiry as an invalid Port command.
- Stored Account and Check-in projections are revalidated against the approved
  Username and Note rules and fail closed when controlled corrupt data is read.
- Firestore document IDs reject malformed Unicode, reserved `__.*__` values and
  values beyond Firestore's 1,500-byte limit.
- Onboarding status covers both missing and completed Product Account records.
- Auth Binding document IDs use `uid_` plus unpadded base64url of the exact
  verified Firebase UID UTF-8 bytes for both create and lookup.
- Auth Binding ID tests cover slash, dot, double dot, reserved-looking,
  non-ASCII, exact-input determinism/collision separation and the 128-character
  boundary without adding a dependency or stored Auth Binding field.
- Persisted UTC records accept both approved no-fraction and fractional `Z`
  forms while rejecting offsets, invalid dates and non-exact forms.

## Not Run / blocker

- Firebase Auth Emulator and Firestore Emulator execution: **Not Run (R10)**.
- R10 start: **No**, until SHI independently approves this integrated R9 head
  as boundary-stable. The evidenced `ignore-scripts` posture remains unchanged.
- R11, Android, Q04, accessibility, controlled Backend integration, UAT,
  Release and Done: **Not Run**.
