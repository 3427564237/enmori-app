# JIN controlled X-01 expired-identity execution — 2026-09-13

- **Work package:** Issue #4 / R14 affected X-01
- **Executor:** JIN ZIHAN (`@chuxi12483468`)
- **Product/current-main SHA:** `8b3f3fecb373c3dceb5b813e3b464070ee24297d`
- **Test-harness head:** recorded in the commit containing this evidence and the focused integration test
- **Execution timestamp:** 2026-09-13 10:44:33 +08:00 (SGT; command completed)
- **Controlled environment:** Firebase Auth + Firestore Emulator, demo project `demo-enmori-rmvp01a-r10`, loopback only
- **Toolchain:** Node.js `24.19.0`, pnpm `11.19.0`, Firebase CLI `15.29.0`, Java `21.0.12.1`
- **Fixture/reset:** isolated temporary profile; synthetic expired JWT claims generated at runtime with `exp` one hour before execution; Auth and Firestore reset before and after the run; no credentials, tokens, raw identifiers or private content retained

## Approved command

```text
pnpm run backend:verify:emulator
```

The command builds the Backend, starts only the loopback Auth and Firestore Emulator for
`demo-enmori-rmvp01a-r10`, and runs the serialized R10/R13/X-01 integration suite.

## Observed result

The focused protected-operation test sent a synthetic expired identity to
`PUT /v1/me/onboarding` with a fresh synthetic idempotency key and onboarding payload.

| Check | Observed result |
|---|---|
| HTTP status | `401` |
| Stable error code | `AUTH_REQUIRED` |
| Safe message | `Your session has expired. Sign in again.` |
| Mutation check | No Auth or Firestore records created; before/after controlled collections remained empty |
| Test suite | `12/12` passed, `0` failed/skipped/todo |

The run also retained the existing malformed/missing/privacy-safe/incomplete checks. The
expired branch now has a direct protected-operation result rather than verifier-only
coverage.

## Boundary

This is controlled loopback evidence for the affected X-01 branch. It is not physical
Android evidence, focused UAT acceptance, Release or Project Done. No Android, Q04,
TalkBack or accessibility result is inferred.
