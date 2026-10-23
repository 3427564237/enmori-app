# Remote group APK access on the existing host

- Source ID: `S-PM-1021-LI-REMOTE-GROUP-ACCESS`.
- Authority: human LI / PM and host owner, 21 October 2026.
- Confirmed request: support group members in different locations; choose a simple,
  preferably free solution; keep AI on this host; ask when human action or payment
  is needed. This delegates the no-cost implementation choice below to LI's agent.

## Supersession

This replaces the same-Wi-Fi-only delivery target and no-public-entry restriction
in `2026-10-21-li-wireless-demo-and-local-ownership.md` for the group's authenticated
application API. It also supersedes the earlier no-public-entry boundary in
`2026-10-14-li-real-runtime-deployment-and-content-direction.md` and the loopback-only
delivery assumption in `2026-10-20-li-real-account-local-wiring.md` within that scope.
Historical local tests stay valid as local evidence. No main merge, public APK
listing, paid hosting, cloud AI, database reset, or Emulator exposure is authorized.

## Selected implementation

Reuse installed Tailscale Funnel, available on all plans including the free plan.
Use the existing host DNS name with public HTTPS port 8443, preserving the old
private Serve entry on 443. Group phones need only ENMORI and internet access,
not Tailscale membership, USB, same Wi-Fi, or an ADB handoff. The server requires
real Firebase ID tokens and existing per-operation authorization. APKs contain
client configuration only, never fixture credentials or privileged secrets.

Funnel terminates publicly trusted TLS and forwards to an explicit loopback HTTP
listener at 127.0.0.1:9382 on the same real-account runtime. Existing pinned-local
TLS 9381 remains available for prior tests. Raw Ollama, Firestore/Auth Emulators,
admin consoles and host files are never Funnel targets. This is an additive
runtime option, off by default; no blanket weakening of isolated feature guards.

Use the existing real Firebase project and existing free quotas. No billing upgrade
or card enrollment. The host must remain online for Backend and AI; this is not
an availability guarantee. Funnel is currently beta with non-configurable bandwidth
limits; verify actual group networks before relying on it for the final demo.

## Why this choice

- Private Tailscale Serve requires each phone to install/join Tailscale.
- Cloudflare Quick Tunnel needs no domain but uses a temporary URL.
- A stable Cloudflare named tunnel normally needs an existing domain; buying one
  adds cost and setup. A paid VPS adds cost and another machine to maintain.
- Funnel reuses this host's existing setup and gives the requested APK-only client.

Checked official sources on 21 October 2026:
https://tailscale.com/docs/features/tailscale-funnel
https://tailscale.com/pricing
https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/

## Delivery boundaries

First connect the existing real-account slice. Complete shared real-identity
composition for Events, social and AI separately, preserving consent and privacy.
Never relabel current Emulator feature passes as real remote acceptance. Prepare
a consistently signed APK, then verify external-network cold launch, real login,
save/readback, two-account permissions and AI. Check host restart persistence once
at the final composed checkpoint. No repeated broad test loops.

If Tailscale requires interactive enablement, the owner completes that account
action. This document records delegated selection, not a claim that Funnel is
already enabled or an APK has passed off-network verification.

## Confirmed full wiring follow-up

The owner subsequently requested completion of public access and the full real-account
composition, a privately signed APK suitable for group installation, one concentrated
verification batch and no main merge. This authorizes promoting the already approved
feature adapters through a separate, explicitly selected real-project entry. It does
not authorize treating Emulator credentials as real identities or weakening the
original isolated entry guards. Real SDK project/endpoint checks, consent, field
visibility and current relationship authorization remain mandatory. Missing account
support records may be initialized idempotently on that authenticated account's next
onboarding read, using existing saved consent; existing records are never overwritten.
No historical Check-in position/weather or Event participation time is fabricated.

The installable group candidate uses Firebase Android app `com.enmori.app.group`
and a durable private PKCS12 release key, avoiding replacement/uninstall of the
existing debug-signed account application. Both use the same real Firebase project
and Backend account records. The release key and client build files remain outside
Git. LI may operate this Backend as a systemd user service, restart on process failure,
with a graceful unbounded drain for unknown AI outcomes. Login-start is explicit;
this does not change host suspend or machine power policy.
