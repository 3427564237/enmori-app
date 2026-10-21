# Remote group entry (first account checkpoint)

Authority: `docs/decisions/2026-10-21-li-remote-group-access.md`.
This prepares real-account access; it does not yet connect the whole coretest
feature set to real identities or establish an accepted distribution APK.

## Host

Use the existing owner-only `~/.local/state/enmori-real-auth-oct19/local-backend.json`.
An optional `remotePort: 9382` adds a loopback HTTP listener to the same real Firebase
runtime. Missing `remotePort` retains the earlier local-only behavior; any other
value is rejected. Normal start/stop/status remain:

```sh
python3 tool/real_account_local.py start
python3 tool/real_account_local.py status
python3 tool/real_account_local.py stop
```

The exact Node 24.19.0 and compiled backend prerequisites are unchanged. Do not
start a second runner or remove an existing ownership lock. Stop and start this
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
- `ENMORI_CONTROLLED_REAL_ACCOUNT=false`
- `ENMORI_USE_FIREBASE_AUTH_EMULATOR=false`
- `ENMORI_API_BASE_URL=https://enmori-rmvp-demo.tail29ae43.ts.net:8443`
- no `ENMORI_API_CERTIFICATE_BASE64`; use normal platform CA trust
- existing Firebase client configuration; no user password or Admin credentials

The owner-only `remote-group-dart-defines.json` is prepared beside the original
account defines. Do not commit either file. Public host mismatch, loopback,
emulator, mixed local/remote mode, private certificate, query/fragment/path and
wrong project fail closed before Firebase initialization.

## Remaining delivery work

1. Complete the owner's Funnel approval and verify public DNS/TLS/API identity
   rejection from outside the tailnet; same-host reachability alone is insufficient.
2. Reuse approved feature adapters in a deliberate real-identity composition for
   Events, social, Check-in history/calendar/map and AI/Persona. Never remove the
   isolated test guard to make real identities enter an Emulator feature slice.
3. Configure a durable private release signing key (current Gradle release still
   uses a debug key), back it up outside Git, then build the final shared APK once.
   Existing debug-signed `com.enmori.app` cannot be replaced with a different key;
   plan installation without automatically uninstalling or deleting app data.
4. Verify two volunteer accounts and save/readback, offline recovery and host
   restart, then a phone using mobile data with USB and Tailscale disconnected.
5. Verify real AI through Backend; do not expose Ollama directly. Distributed users
   share host capacity. Report host-offline and busy failures without auto-resending
   an operation whose outcome is unknown.

No remote end-to-end, release or complete-feature claim follows from this checkpoint.
