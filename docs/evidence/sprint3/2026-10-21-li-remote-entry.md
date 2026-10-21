# Remote real-account entry preparation

Date: 21 October 2026. Base: `658b074`, Draft PR #165. Scope: real-account
network entry, not the complete integrated feature set.

## Observed

- Existing Tailscale 1.104.1 is running. Private Serve 443 maps to loopback 3000;
  this handler was not changed. No Funnel capability was present at preflight.
- Selected free-plan Funnel after checking official docs; its beta and bandwidth
  limitations are recorded in the decision and operating instructions.
- Added optional loopback HTTP 9382 to the existing real Firebase runtime, retaining
  local pinned HTTPS 9381. No new dependency or public feature API was introduced.
- Existing private runtime config backed up before adding `remotePort`; sanitized
  client-only remote build defines prepared outside Git. No account/data mutation.
- Runtime ready at `2026-10-21T03:26:49.187Z`: real Firebase Auth and Firestore reads
  succeeded, verified user's binding exists, both local listeners started.
- HTTP 9382 `/v1/me/onboarding` and `/v1/me/settings` each rejected an unauthenticated
  request with 401. Existing HTTPS 9381 identity gate remained healthy.
- `tailscale funnel --bg --https=8443 http://127.0.0.1:9382` requested human account
  enablement. No successful public exposure has been reported at this checkpoint.

## Concentrated checks

- Node syntax check for `tool/run_real_account_local.mjs`: passed.
- TypeScript strict build: passed (unchanged backend source).
- Flutter `test/app/controlled_account_configuration_test.dart`: 4/4 passed,
  covering real/local/remote identity and endpoint isolation including malformed
  URLs, emulator projects, mixed modes and pinned local certificates.
- Flutter analyze on the two changed Dart files: no issues.
- `git diff --check`: passed.

## Pending

Owner Funnel enablement; external-network reachability; real authenticated remote
save/readback; real feature composition; release signing/build; off-USB device
verification. Existing v14 tests do not establish any of these. AI was not called
and no broad regression suite or duplicate APK build was run for this checkpoint.
