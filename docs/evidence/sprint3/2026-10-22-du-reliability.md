# DU reliability checkpoint — 22 October 2026

## Scope and source

- Starting integration candidate: `986d4f895252f266c1f6bf785b7f0c24ee03643e`, the current head of `souma/li-zhou-runtime-20261020` when checked.
- Work branch: `codex/du-reliability-oct22`.
- Scope: independent backend reliability regression on the current integration candidate, with only a small, independently testable projection correction. No production account, host, release key, live service, or device was accessed.

## Functional matrix

| Flow | This checkpoint |
| --- | --- |
| Identity, consent, logout, and account isolation | Existing backend unit/transport authorization cases ran in the full suite; no Auth Emulator or client two-account journey. |
| Profile, interests, privacy, and settings persistence | Existing repository/transport cases ran against isolated in-memory adapters; no real-account write/readback. |
| Check-in create/edit/delete, history, weather, calendar/map permissions | Existing backend cases ran; Flutter, Android, weather provider, and device permission flows were not run. |
| Friend lookup/request/accept, duplicate and cross-account protection | Existing isolated multi-account tests ran, including repeated send, recipient-only accept, foreign accept refusal, and stale request rejection; not a Firebase two-account API acceptance. |
| Event status, participation, and source handling | Existing backend unit/composition cases ran; no live provider or device acceptance. |
| AI unknown-result recovery and Persona isolation | Existing lifecycle and Persona cases ran, including explicit reconciliation, retry fences, cancellation/session boundaries, draft expression validation, and no-history preview boundaries; no model request was started. |

Component/in-memory results above are not evidence of real Firebase, host, or phone behavior.

## Finding and correction

The full backend suite first exposed that `captureContext` copied only Persona presentation options and silently dropped the approved extended expression fields. The local chat transport accepts the bounded expression projection, but this capture path removed it before generation. `captureContext` now makes an allowlisted immutable copy, retaining a valid expression while continuing to discard unrelated projection fields. The regression is covered by the existing full-expression test.

Two other initial failures were stale test expectations, not implementation defects: private profiles are still eligible for a friend request through exact username lookup, and the HTTP error catalogue now includes four Event/Friend precondition statuses. The assertions were aligned to current behavior; no authorization or status behavior was loosened.

## Checks

- Node `24.19.0`; backend TypeScript compilation: passed.
- Focused lifecycle, Persona, friend lookup, and error catalogue tests after correction: `81/81` passed across the affected lifecycle/Persona run, and `28/28` across the friend/error run.
- Full backend suite on the final source: `1,206/1,206` passed, zero skipped.
- `pnpm install --frozen-lockfile` resolved the lockfile and installed packages but exited with `ERR_PNPM_IGNORED_BUILDS` for `@firebase/util`, `protobufjs`, and `re2`. No dependency build scripts were approved. Compilation and tests were invoked directly using the installed TypeScript and Node runtimes.

## Not run / remaining acceptance

- Firebase Auth/Firestore Emulator and the repository's two-account emulator/API flow: not run; Java and a local Firestore Emulator are absent.
- Flutter tests/analyze, Android Back/keyboard, real two-account privacy/revocation, final APK, live host, external Event source, real weather provider, and real model: not run. Flutter/FVM and Android tooling are absent here; live-account/device/model work remains with LI.
- No claim of whole-app acceptance, deployment, merge, release, or task closure.
