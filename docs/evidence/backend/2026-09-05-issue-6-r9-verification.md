# Issue #6 R9 verification — 2026-09-05

## Scope

- Branch: `codex/issue-6-r9-infrastructure`
- R9 revision commit: `25744002d61b86ec4d0f60dc824c15b6c90c3363`
- Consumed R4 Ports commit: `7593f62f12feef0e59daa6131350f0c4b483a704`
- Toolchain authority: `S-PM-0905-RMVP01A-TOOLCHAIN`
- Auth Binding ID authority: `S-PM-0905-RMVP01A-AUTHBINDING-ID`
- Controlled data only: deterministic `controlled-*` identifiers, synthetic usernames, notes and timestamps
- Reviewer path: SHI independently reviews R9 Infrastructure in R5A

This evidence covers R9 only: Firebase Admin Auth Principal verification,
Firestore repositories and atomic transaction behavior, and Infrastructure
contract tests. R10 controlled Emulator/environment work and R11 boundary review
are not started.

This is R9-only revision evidence. R4 PR #12 is still under revision, so the
required accepted-R4 rebase and combined R4+R9 suite are not claimed here.

## Approved execution environment

| Item | Result |
|---|---|
| Node.js | `v24.19.0` |
| pnpm | `11.19.0` |
| Lockfile | `pnpm-lock.yaml`, frozen during verification; SHA-256 `B0B322975FF2BDD223916DC8DBB413D5771FC90137EA18CF0190F8C578F3C84B` |
| Credentials / real data | None used |

## Reproduction

```powershell
pnpm --version
node --version
pnpm --config.ignore-scripts=true install --frozen-lockfile
pnpm --config.ignore-scripts=true run backend:test
```

Result: Backend strict TypeScript compile passed; Infrastructure contract tests
passed, **35/35**, with no failures.

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
- R10 start: **No**, until R9 is independently reviewed/stable and the pending
  accepted-R4 rebase and combined R4+R9 suite are independently approved by
  SHI. The evidenced `ignore-scripts` posture remains unchanged.
- Android, controlled Backend integration and UAT: **Not Run**.
