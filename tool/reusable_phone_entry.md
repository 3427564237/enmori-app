# Reusable #135 private Tailscale entry

Authority: [LI's current decision](../docs/decisions/2026-10-17-li-reusable-test-entry.md), exact supersession `f348278`. **No appointment or SGT window is required.** Prior windows remain historical evidence. JIN owns the entry and faults, LI operates Linux, and SHI independently tests Account/AI/Check-in.

## Candidate and source

Product `b3c8a2223bd305c65a56cbd4fc88aff13b8a1d8e`, tree `df800e43374ec89b71799b6722d5364163eb68cc`. SHI's installed original APK is `com.enmori.app.personatest`, code1, 94,273,899 bytes, SHA256 `776bc6a640fff73ba0382d0dcfb56c685f4bc787397901961ca4839ca0cfb825`, signer `a6ff83fa12ff92d4b33e5efde167aee3b0f3f4590bd843def55d9584f7724dd3`. Preserve this installation and the delivered ASCII filename. LI's differently signed v7 remains separate. No rebuild, reinstall, data clear or repeat signature review.

Both operators use the delivered commit and record `git rev-parse HEAD`. The checker's `procedureSha256` covers checker/handoff/private-reader only; the commit binds relay/exporter too. The route is Windows loopback -> existing private Tailscale -> Linux raw TCP Serve -> original loopback Backend TLS/Auth. TLS reaches the original certificate unchanged; old HTTPS443 remains separate.

## LI: prepare the original service once

1. Privately inspect `tailscale version`, `tailscale status --json` and `tailscale serve status --json` on the original Linux host. Preserve old HTTPS443. In the existing tailnet policy, restrict both target ports to authorized test operators/devices, including the effect of existing broad rules. Online/AllowedIPs/peer visibility are not effective ACL proof. This implements the approved scope; no repeated permission is required. Do not publish full CLI output.
2. Reuse a healthy existing original service. If it is absent, establish the original invocation/lease outcome and valid current configuration/TLS/formal9B/tokenizer. Held/unknown work or leftover data must not be reset. Follow the [existing startup/cleanup rules](../docs/evidence/sprint3/2026-10-15-jin-controlled-phone-service-handoff.md); current approved `demoFeatures: true` supplies candidate composition. When actual state permits:

   ```sh
   node node_modules/typescript/bin/tsc --project backend/tsconfig.json
   node tool/controlled_phone_service.mjs --live-existing-host < "$PRIVATE_CONFIG"
   ```

   Keep the original foreground process. Startup preflight is not a generated reply or business test.
3. Use absolute paths and existing tools. `$PRIVATE_DIRECTORY` must already be operator-owned mode0700 outside Git; the output must not exist:

   ```sh
   python3 tool/check_reusable_phone_entry.py host-check --session "$SESSION"
   python3 tool/prepare_tailscale_phone_route.py --session "$SESSION" \
     --tailscale "$TAILSCALE" --output "$PRIVATE_DIRECTORY/route.json"
   ```

   The exporter checks current status, private handoff and Tailscale state, refuses conflicting target Serve ports/Funnel, and writes new mode0600 `route.json` bound to the handoff's raw SHA256. It changes no network setting and cannot prove effective ACLs or original lease settlement. Keep the original nine-field `handoff.json` unchanged.
4. Obtain the current Backend port privately. Start the following in **separate foreground terminals**, once the access policy above is effective:

   ```sh
   BACKEND_PORT="$(python3 -c 'import sys; from pathlib import Path; sys.path.insert(0,"tool"); from li_controlled_phone_handoff import handoff; print(handoff(Path(sys.argv[1]))[1])' "$SESSION/handoff.json")"
   "$TAILSCALE" serve --tcp="$BACKEND_PORT" "tcp://127.0.0.1:$BACKEND_PORT"
   ```

   ```sh
   "$TAILSCALE" serve --tcp=9099 tcp://127.0.0.1:9099
   ```

   These are the authorized [native TCP forwards](https://tailscale.com/docs/reference/tailscale-cli/serve#use-a-tcp-forwarder). No `--bg`, Funnel, TLS termination, PROXY protocol, reset or Services API. If a port conflicts, preserve it and report the fault. If the second start fails, exit only the first session you just created.
5. Privately deliver current `handoff.json`, `route.json` and the script commit through the existing channel. Route fields are exactly schema version, numeric tailnet address and handoff digest. Handoff includes synthetic sign-in material and the public certificate; never send TLS key, host config or ADC. Reuse this pair while the original service/configuration is current. A new process/configuration needs a new matching pair, not an appointment.

## SHI: independently connect and test

Use existing Python, Tailscale and SDK tools; no package installation. Confirm the local Tailscale session is usable. Keep both private files outside Git. Windows files must belong to the current user with allow ACEs only for that user/System/Administrators; broad/null ACLs and reparse paths are refused. POSIX files must be owner0600. Do not bypass a private-file refusal.

1. Start the foreground relay with absolute private paths and keep its terminal open:

   ```powershell
   & $Python tool/tailscale_phone_relay.py --handoff $PrivateHandoff --route $PrivateRoute
   ```

   It binds only the two `127.0.0.1` ports and forwards bytes to the selected numeric private tailnet host. It has a finite connect timeout and bounded buffers, with no appointment or arbitrary idle expiry. Changing/removing either private file stops its owned connections. Listener readiness is not remote readiness.
2. In another terminal, check actual workstation exchanges:

   ```powershell
   & $Python tool/check_reusable_phone_entry.py connection-check --apk $Apk --handoff $PrivateHandoff
   ```

   This binds the original APK, verifies original TLS and unauthenticated Settings rejection, signs in once, then reads existing Settings. Each request has a real10-second deadline. Configuration is rechecked before each request and final acceptance. No model/provider call, product write, proxy, redirect or automatic retry. Pass proves these exchanges only.
3. Open the installed dedicated app normally. Privately record the existing `adb reverse --list` inventory, choose the authorized device and existing absolute SDK paths, then deliver:

   ```powershell
   & $Python tool/li_controlled_phone_handoff.py --apk $Apk --handoff $PrivateHandoff `
     --serial $Serial --adb $Adb --aapt $Aapt
   ```

   `$Apk` remains absolute. Only `aapt` uses child cwd plus relative basename, avoiding Chinese/spaced parents in its arguments. Installed bytes/nonce are checked; config travels through stdin. `CONSUMED` means delivery, not a business/model result.
4. Start the assigned Account/AI/Check-in flow. Preserve explicit save/reread, unknown/no-blind-retry and shared-state serialization. LI retains Event/Friend/candidate checks; JIN supports canonical/provenance/owned-cleanup readback. Actual independent connection and assigned-flow start establish entry acceptance.

## Failures and owned stop

Report fixed category, candidate/script source and actual stage to JIN. Never post private files, endpoints, identifiers, raw CLI output or tokens. JIN fixes entry faults; LI supplies actual host/configuration/lifecycle observations. Request deadlines, stale/held status and changed-config failures remain real checks. There is no scheduling failure or requirement to book another time.

After work settles, Ctrl+C closes only relay-owned sockets/listeners. Remove only ADB reverses newly created by the handoff, identified against the initial inventory, and only while they still match. Preserve borrowed, changed or unacknowledged mappings; never remove-all. An unknown model operation needs its original outcome readback before another Send.

LI exits only the two owned foreground Serve sessions and checks original443 remains. Stop the original service using `install -m 600 /dev/null "$SESSION/stop"`; retain closed/cleanup, worker and operator-exit/profile/port receipts. Network teardown does not settle a model operation. Held or missing cleanup stays unresolved; no forced kill or replacement makes it Pass.

Record connection, private delivery, assigned business start, failures and Not Run separately. Local fixtures/scripts do not prove real Tailscale, phone or consecutive9B success. No merge, task/board transition or overall acceptance follows from this preparation.
