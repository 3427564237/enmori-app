# Sprint 2 controlled test identity — 2026-09-19

- **Status:** Confirmed
- **Decision owner:** LI HOURUI, ENMORI PM
- **Source ID:** S-PM-0919-S2TEST-IDENTITY
- **Scope:** DU controlled Android execution for S2-01 and S2-02 only
- **Builds on:** S-PM-0918-S2RUNTIME-HANDOFF and the fixed
  `s2-event-demo-v1` manifest

## Decision

DU will create one new synthetic test account through the existing Flutter
registration flow on the controlled Android Emulator. LI and SHI will not
create, reset, publish, or transfer a shared Firebase password.

The synthetic email address and password must be generated and retained only
by DU for this bounded execution. They must not contain a real person's data,
be reused from another service, appear in GitHub, enter screenshots or logs, or
be sent to LI or SHI. This decision does not authorize an Admin-created account,
an IAM change, a service-account key, or a reusable team credential.

After registration, DU will complete the existing onboarding flow and use only
the approved synthetic Interest Tag identifiers:

- `interest_community`
- `interest_music`

These identifiers already belong to the fixed controlled Demo manifest. This
decision does not add or change Demo records, Event records, product contracts,
or the create-only initialization boundary.

## Execution gate

DU must wait for an independently reviewed combined Backend head in which both
`GET /v1/interest-tags` and
`GET /v1/recommendations/events?view=home` return the expected unauthenticated
`401` through the existing private HTTPS edge. A PR #33-only runtime is not the
combined S2-01/S2-02 runtime because it does not contain the Interest routes.

Once that gate passes, DU may register the synthetic account, complete
onboarding, save an approved Interest selection, and execute Home and See All
against the controlled Backend. Public evidence must exclude the email,
password, tokens, private endpoint, Firebase client configuration, account
identifiers, and device identifiers.

This is a controlled integration setup decision. It is not Android execution
evidence, UAT, Release approval, merge acceptance, or Done. Account cleanup or
deletion requires a separate explicit instruction and is not implied here.
