# Remote group entry and signed Android candidate

Authority: `docs/decisions/2026-10-21-li-remote-group-access.md`.
The explicit remote composition connects real identities to the approved feature
modules. v15 is a privately signed distribution candidate; acceptance boundaries
are recorded in `docs/evidence/sprint3/2026-10-21-li-group-v15.md`.

## Host

Use the existing owner-only `~/.local/state/enmori-real-auth-oct19/local-backend.json`.
An optional `remotePort: 9382` adds a loopback HTTP listener to the same real Firebase
runtime. Missing `remotePort` retains the earlier local-only behavior; any other
value is rejected. The full composition additionally requires `fullFeatures: true`
and the private approved Music source configuration. The installed user service
now owns the process. Normal start/stop/status are:

```sh
systemctl --user start enmori-group.service
python3 tool/real_account_local.py status
systemctl --user stop enmori-group.service
```

The exact Node 24.19.0 and compiled backend prerequisites are unchanged. Do not
start a second runner or remove an existing ownership lock. The user service starts
on host login, restarts after failure, and does not prevent host sleep or shutdown. Stop and start this
owned runner normally when changing its config. Real Firestore data is not reset.

After local readiness and the owner's Funnel enablement, the selected command is:

```sh
tailscale funnel --bg --https=8443 http://127.0.0.1:9382
tailscale funnel status
```

The old private Serve 443 must remain unchanged. To withdraw this public entry:

```sh
tailscale funnel --https=8443 off
```

Do not use `reset`, target port 9380/9099/8088/11434, expose directories, or replace
the 443 handler. Do not substitute `https+insecure` or skip TLS verification.
Funnel provides public HTTPS; the short HTTP hop stays on the host loopback only.
Account enabling may require the owner's browser authentication. No paid upgrade.

## Android

Main entry `lib/main.dart`, real Firebase project `enmori-rmvp-controlled`:

- `ENMORI_REMOTE_GROUP=true`
- `ENMORI_AI_COMPANION_FIRST_FLOW=true` (required for existing Check-in references,
  automatic today context and follow-up entry points; group release builds fail
  when absent or false)
- `ENMORI_CONTROLLED_REAL_ACCOUNT=false`
- `ENMORI_USE_FIREBASE_AUTH_EMULATOR=false`
- `ENMORI_API_BASE_URL=https://enmori-rmvp-demo.tail29ae43.ts.net:8443`
- no `ENMORI_API_CERTIFICATE_BASE64`; use normal platform CA trust
- existing Firebase client configuration; no user password or Admin credentials

Private group files live in `~/.local/state/enmori-group-release/` (owner-only):
`dart-defines.json`, `signing.properties`, and the durable signing key. Never commit,
attach, or include the signing key/passwords in the group handoff. Preserve them
for future updates and make an owner-controlled off-host backup before relying on
this key long term. The Firebase Android registration is `com.enmori.app.group`.
This package coexists with older debug/test applications; do not uninstall them.

Build from the reviewed source with Flutter 3.47.2:

```sh
ENMORI_GROUP_RELEASE=true \
ENMORI_RELEASE_KEY_PROPERTIES="$HOME/.local/state/enmori-group-release/signing.properties" \
fvm flutter build apk --release --target lib/main.dart \
  --dart-define-from-file="$HOME/.local/state/enmori-group-release/dart-defines.json" \
  --build-number 15 --build-name 1.0.0-group20261021
```

Allow Flutter to regenerate platform plugin tooling for release; do not reuse a
test-generated Java registrant. Verify the APK package, version, non-debuggable
flag and signature before handing it over. Increment the build number for updates.
Record the effective companion flag in the build receipt. It is independent of
local/cloud model selection and does not establish a running appointment worker
or push delivery. Leave `ENMORI_AI_COMPANION_INSTALLATION_REF` absent unless the
specific device registration/push scope is authorized and configured; notification
auto-init remains off. See the [repair decision](../docs/decisions/2026-10-29-li-companion-build-repair.md).
Public host mismatch, loopback, emulator, mixed local/remote mode, private
certificate, query/fragment/path and wrong project fail closed before Firebase.

## Use and acceptance

Group members install only the APK, then register or log in through Firebase.
They do not need USB, Tailscale, developer mode, Firebase Admin credentials or a
shared password. The owner's host must stay online and awake with the service
running; otherwise features needing Backend or Ollama are unavailable. There is
no paid server or always-on cloud inference in this arrangement.

The backend initializes only absent companion documents for a completed real
account. Existing choices and business data remain authoritative. New sharing
permissions stay private/off, and old events receive no invented selection time.

Check the same signed APK on mobile data with USB and phone Tailscale disconnected,
then real save/readback and normal service restart. Two-account privacy, real model
conversation and account isolation must be observed separately. Never auto-resend
an AI request with an unknown result. No broad UAT/Done claim follows from a build.

Current Event activity uses actual selection timestamps and the provider's current
short-lived first-page projection. Cold/expired source returns unavailable; events
outside that projection are currently omitted. This coverage limit remains open.
