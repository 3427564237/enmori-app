# Sprint 2 controlled runtime handoff — 2026-09-18

- **Status:** Confirmed
- **Decision owner:** LI HOURUI, ENMORI PM and controlled host owner
- **Source ID:** S-PM-0918-S2RUNTIME-HANDOFF
- **Scope:** Runtime/API prerequisite for Issues #28 and #30 only
- **Builds on:** S-PM-0901-BACKEND, the approved PR #33 head
  `7585542cc4d07817768fc4a0a74d110b2f79084e`, and the LI-controlled Demo
  initialization recorded at `60519e1bdeaa45553212fdcdc90fc7b814abd3c9`

## Decision

LI designates LI's existing controlled Linux host as the Backend runtime for
the bounded Sprint 2 integration window. This host previously exercised the
approved controlled topology and retains the owner-authorized Application
Default Credentials for the exact isolated controlled Demo project. The
credential remains local to LI's host and is not transferred to SHI or DU.

The runtime uses the already configured private tailnet HTTPS edge on port 443
to forward to the Fastify listener on `127.0.0.1:3000`. Funnel remains disabled.
Firebase ID tokens remain the Backend application authentication mechanism.
This selects the existing controlled path; it does not approve a new tunnel,
reverse proxy, certificate mechanism, DNS name, port, credential mechanism,
IAM change, deployment arrangement, or public endpoint.

LI will provide the existing private Dart define configuration to DU only
through the team's approved private channel. No private URL, Firebase client
configuration, credential, token, account identifier, or device identifier is
recorded here or in an Issue comment.

## Non-sensitive LI preflight

At PR #33 exact head `7585542cc4d07817768fc4a0a74d110b2f79084e`, LI
started the controlled Backend under Node.js `24.19.0` and pnpm `11.19.0` with
the raw listener restricted to `127.0.0.1:3000`. The bounded preflight ran from
`2026-09-17T18:29:16.139Z` to `2026-09-17T18:29:17.875Z`.

- the loopback listener was present;
- unauthenticated loopback ingress returned HTTP `401`;
- unauthenticated private HTTPS ingress returned HTTP `401`;
- HTTPS certificate validation succeeded without a custom trust bypass;
- the existing ADC completed a read-only Firestore access to one approved
  synthetic Event record; and
- the private HTTPS edge remained tailnet-only with Funnel disabled.

These checks establish the LI host runtime, credential boundary, HTTPS edge,
and authentication enforcement. They do not establish DU device/Emulator
reachability, an authenticated Event response, Android integration, UAT,
Release, merge acceptance, or Done.

## Handoff and completion boundary

DU may perform a non-sensitive device-side reachability preflight after
receiving the existing private configuration. The public result may record only
the exact source head, controlled environment class, HTTP/result class, and UTC
window. Endpoint values, credentials, tokens, Firebase client configuration,
account identifiers, and device identifiers remain private.

The runtime/API blocker is resolved on LI's host. Issue #30's real Android
Event flow remains `Not Run` until DU demonstrates device/Emulator reachability
and executes the approved flow. This decision does not require SHI to obtain or
copy LI's ADC.
