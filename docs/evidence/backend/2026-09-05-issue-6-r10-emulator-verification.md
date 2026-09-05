# Issue #6 R10 controlled Firebase Emulator verification — 2026-09-05

## Scope and disposition

- Owner: ZHOU YAOYIN (`@YaoyinZhou3922`)
- Branch: `codex/issue-6-r10-emulator`
- Accepted R9 / branch base: `d8ea465bdbb22c0bb69e10b4f7dba54f2c6761d0`
- R10 implementation commit: `55c3d91e549e943e823d28a5f881973d6ddd0815`
- Contract: `S-PM-0903-RMVP01A-CONTRACT`
- Toolchain: `S-PM-0905-RMVP01A-TOOLCHAIN`
- Reviewer path: SHI ZHENGQI independently reviews R10 in R5A
- Current disposition: owner verification passed; R10 remains submitted for
  independent review and is not complete until the current head is accepted

This record covers only the reproducible local Firebase Authentication and
Cloud Firestore Emulator environment assigned to R10. It does not claim R11,
R13 cross-boundary execution, Android, controlled demonstration Backend,
accessibility, Q04, UAT, Release or Done evidence.

## Sanitized controlled environment

| Item | Recorded value |
|---|---|
| Execution time | `2026-09-05T21:19:50+08:00` |
| Executor | ZHOU YAOYIN |
| Host boundary | Sanitized local Windows x64 workstation |
| Node.js | `v24.19.0` |
| pnpm | `11.19.0` |
| Firebase CLI | `15.29.0` |
| Firestore Emulator | `cloud-firestore-emulator-v1.22.0.jar` |
| Java runtime | Microsoft OpenJDK `25.0.4.1` |
| Project identity | `demo-enmori-rmvp01a-r10` (non-real Firebase demo project) |
| Auth endpoint | loopback `127.0.0.1:9099` |
| Firestore endpoint | loopback `127.0.0.1:8080` |
| Emulator UI | disabled |
| Credentials / real data | none used |
| Fixture data | fixed `controlled-*` IDs and `.invalid` email addresses only |
| Lockfile commit | `d8ea465bdbb22c0bb69e10b4f7dba54f2c6761d0` |
| Lockfile SHA-256 | `BBB1C963E479D3785A8236E6FE056801477BAA7133FAA9BDBCE3EC166CE5069D` over repository-normalized LF bytes |

`firebase.json` contains only the local Auth/Firestore Emulator endpoints,
disabled UI and single-project consistency. No `.firebaserc`, Firebase project
alias, credential, service-account material, deployment configuration, rules
deployment, index, TTL, scheduler or cleanup mechanism is present.

The runtime guard requires all of the following before an Emulator test can
initialize Firebase Admin:

1. explicit `ENMORI_ENVIRONMENT=test` mode;
2. a `demo-` project ID shared by Firebase Admin and the Emulator CLI;
3. both Auth and Firestore Emulator variables; and
4. loopback-only endpoints with valid ports.

It fails closed for unset, development, controlled-demo or production mode,
for a real project ID, for mismatched project IDs, and for missing or remote
Emulator endpoints. The `demo-` project identity also makes any accidental
request to a non-emulated Firebase product fail instead of reaching a live
resource.

## Reproduction

```powershell
node --version
pnpm --version
pnpm exec firebase --version
java -version
pnpm --config.ignore-scripts=true install --frozen-lockfile
pnpm --config.ignore-scripts=true run backend:verify
pnpm --config.ignore-scripts=true run backend:verify:emulator
pnpm --config.ignore-scripts=true run backend:verify:emulator
git diff --check
```

Lifecycle scripts remained disabled. No package, lifecycle script or alternate
version was approved or introduced by R10.

## Results

| Check | Result |
|---|---|
| Frozen install | Pass |
| Strict TypeScript build | Pass |
| Complete recursive R4+R9 plus R10 guard suite | **84/84 Pass**, 0 failed/skipped/todo |
| Auth + Firestore Emulator run 1 | **7/7 Pass**, 0 failed/skipped/todo |
| Auth + Firestore Emulator run 2 | **7/7 Pass**, 0 failed/skipped/todo |
| Emulator startup and automatic shutdown | Pass on both runs |
| Auth and Firestore reset endpoints | Pass; fixed state cleared before every test and after the suite |
| `git diff --check` | Pass |

The Firestore Emulator reports its standard warning that no client Security
Rules file is configured. This R10 slice exercises the approved Backend-only
Firebase Admin boundary; Flutter has no direct Firestore product-data access,
and Firebase Admin bypasses client Security Rules. Adding or deploying a rules
contract is not authorized by R10, so no rules or deployment choice was
invented to suppress that warning.

## Emulator coverage

- The environment guard proves tests cannot select a live Firebase project or
  non-loopback Firebase endpoint.
- Auth state is reset through the Emulator REST reset endpoint, and Firestore
  state is reset through the Emulator-only database flush endpoint.
- A real Auth Emulator ID token maps to the exact verified Firebase principal.
- Ordinary and Admin-claimed users produce the same bounded Auth Principal;
  an unapproved Admin claim is not promoted into application authority.
- Malformed and expired identity fail closed as invalid; disabled and revoked
  identity fail closed as forbidden.
- The real Firestore Emulator transaction writes exactly the approved Auth
  Binding, Username Reservation, Product Account and 24-hour logical
  idempotency record set.
- Concurrent exact onboarding submissions commit once and recover once, with
  one record in each approved collection.
- Check-in create and exact retry produce one physical Check-in whose document
  contains only `ownerAccountId`, `note` and `createdAt`.
- Owner read succeeds while missing and non-owner reads remain
  indistinguishable and expose no protected content.

All IDs, usernames, notes, timestamps and email addresses used above are fixed
non-real fixtures. The synthetic password and tokens are generated or held
only transiently inside the test process and are not printed, persisted or
included in evidence.

## Explicitly Not Run / not claimed

- R11 boundary review and package-level closure: **Not Run**.
- R13 Flutter-to-Backend cross-boundary execution: **Not Run**.
- Controlled demonstration Backend or Firebase project: **Not Run**.
- Android device, Q04, accessibility and UAT execution: **Not Run**.
- Firestore TTL, physical cleanup, scheduler, cleanup index and deployment:
  outside scope and not implemented.
- Release and Done: **Not Run / not claimed**.
