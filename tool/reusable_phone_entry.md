# Reusable #135 test entry — preparation and execution contract

Authority: [S-PM-1017-LI-REUSABLE-TEST-ENTRY](../docs/decisions/2026-10-17-li-reusable-test-entry.md).
JIN owns this entry and its faults; LI owns the agreed Linux availability window;
SHI remains the independent Account/AI/Check-in operator. No reassignment.

**Current delivery boundary:** Windows private-file handling and the checks below
are executable tooling. LI has confirmed only old HTTPS Serve, with no existing
SSH/raw TCP double forward, and provided **17 October 2026, 22:27–22:57 SGT**.
The additional listener/access scope proposed below remains unresolved. No remote route,
host availability, private handoff or operational acceptance is claimed here.
Do not run a startup command merely because this document exists.

## Frozen artifact and tool identity

- Product source: `b3c8a2223bd305c65a56cbd4fc88aff13b8a1d8e`;
  tree: `df800e43374ec89b71799b6722d5364163eb68cc`.
- SHI's already installed original APK: `com.enmori.app.personatest`, code 1,
  94,273,899 bytes; SHA256
  `776bc6a640fff73ba0382d0dcfb56c685f4bc787397901961ca4839ca0cfb825`.
- Signer SHA256:
  `a6ff83fa12ff92d4b33e5efde167aee3b0f3f4590bd843def55d9584f7724dd3`.
- LI's separately signed v7 remains a different artifact. This check is bound
  to SHI's original v1, not a request to replace LI's application.
- Both parties use the same delivered script source commit. The checker emits
  `procedureSha256` over the three Python implementation files, with CRLF
  normalized. Record the commit and this digest with the result. Neither
  identifies the actual running Backend by itself.

SHI's completed receipt/install/readback is retained. Routine starts do not
reinstall, clear data or repeat signature review; local/installed hashes in
handoff remain an input-integrity check against accidental package selection.

## Selected minimal proposal — additional scope still pending

The original APK requires Backend `https://127.0.0.1:<current-port>/`, trusts only
the current handoff certificate, and uses Auth `127.0.0.1:9099`. ADB reverse on
SHI Windows points at that ADB server's side, not automatically at LI Linux.

LI's [current inventory](https://github.com/3427564237/enmori-app/issues/84#issuecomment-6235064823)
confirms only HTTPS Serve 443 to loopback 3000. It terminates TLS and does not
establish either current channel. SSH/raw TCP forwards are absent; their
existence is no longer an open inventory question.

JIN's [specific proposed extension](https://github.com/3427564237/enmori-app/issues/84#issuecomment-6235109065)
uses two native **foreground** TCP Serve sessions, at the current Backend TLS
port and Auth9099, targeting the same loopback ports. A Windows loopback-only
byte relay would connect each to that original host's private Tailscale port.
This retains the original certificate, application and existing 443 service,
and needs no SSH account, TLS termination, certificate or library. Official
[ordinary Serve TCP](https://tailscale.com/docs/reference/tailscale-cli/serve#use-a-tcp-forwarder)
supports this shape; it is not evidence that LI's current configuration has it.

The exact new listener/access scope is submitted to LI before implementation:
two new tailnet TCP listeners, two Windows loopback listeners, and access limited
to the authorized operators/test ends. Existing grants/ACL must be checked;
tailnet-only does not mean only LI/SHI can access the complete Auth emulator.
No global reset, background persistence, Funnel, Services API or ACL widening
is proposed. Exit only the owned foreground Serve sessions and verify the
original 443 remains; network exit does not establish model/Backend cleanup.
These additional mappings/relay have **not** been implemented or activated.

## LI: one-time setup and each agreed window

1. Agree explicit SGT start/end with SHI. Supply them through the usual
   coordination record. The first confirmed LI host window is
   `2026-10-17T22:27:00+08:00` to `2026-10-17T22:57:00+08:00`; it replaces the
   unconfirmed next-morning proposal, does not extend itself and is not proof
   of readiness or actual SHI participation. No tool defaults to permanent availability.
2. On the original controlled Linux host, record the runtime source/tree and
   entry-script source. Confirm the original invocation/lease outcome using
   its actual receipts. Existing status/empty ports or a copied configuration
   boolean cannot prove original settlement. A held/unknown invocation stays
   with its original owner; do not start a replacement.
3. Use the existing current private configuration, original formal9B/tokenizer,
   TLS and isolated Auth/Firestore setup. Keep host configuration, keys and
   model paths on Linux. Current startup prerequisites and stop/drain semantics
   remain in [the service handoff](../docs/evidence/sprint3/2026-10-15-jin-controlled-phone-service-handoff.md).
   `demoFeatures: true` is the existing candidate composition for the assigned
   Account/Check-in/Friend scope; do not add unknown configuration fields.
4. Only in the agreed window, after the original admission prerequisites, run
   the existing startup command in the original checkout:

   ```sh
   node tool/controlled_phone_service.mjs --live-existing-host < "$PRIVATE_CONFIG"
   ```

   This **starts the original controlled service** and performs its existing
   runtime/tokenizer preflight. It is not a read-only check. It does not generate
   a model reply, enable Event or grant authority to reuse an expired session.
   Retain its original process and output. No automatic restart is provided.
5. In another terminal, check the current session with exact agreed timestamps:

   ```sh
   python3 tool/check_reusable_phone_entry.py host-check \
     --session "$SESSION" \
     --window-start-sgt "$WINDOW_START_SGT" --window-end-sgt "$WINDOW_END_SGT"
   ```

   Timestamps have the form `YYYY-MM-DDTHH:MM:SS+08:00`. The checker reads two
   fresh private status snapshots and unchanged current handoff, rejects
   busy/held/stop/closed and expired intervals, and never starts or cleans the
   service. It does not infer original lease settlement. Event being disabled
   is not an Account/AI prerequisite; active Event work still prevents an idle
   shared-state checkpoint.
6. Once the selected route has its own actual connection evidence, privately
   transfer the current nine-field `handoff.json` and interval to SHI. It
   contains synthetic sign-in material and a public certificate, never the
   TLS key, host configuration or ADC. It is tied to this original process;
   do not copy an old session file or change the loopback fields. Endpoint
   values, user/device identifiers and secrets do not enter public receipts.

## SHI: private file and independent local checks

Use existing Python, Android SDK `adb`/`aapt`, and the confirmed existing
Tailscale connection capability. No package installation is required by the
Python tools. Keep the received private configuration outside Git in an
owner-controlled local directory. On POSIX the file must be owner mode 0600.
On Windows the opened file must belong to the current user and its DACL may
grant access only to that user, LocalSystem or local Administrators. Null/broad
DACLs, reparse/symlink paths, replacement and oversized files are refused.
The tool does not silently repair an unsafe ACL.

For a private directory you own, protect it before placing configuration there;
use Windows Security properties or an existing owner-approved ACL procedure.
Only the nine-field current handoff is read. Do not paste it into a CLI argument,
Issue, screenshot, console transcript or public diagnostic. An ACL refusal is
a JIN entry issue to resolve, not permission to remove the check.

1. Check the agreed interval, delivered script commit/digest and existing
   Tailscale status. An offline status is a connection prerequisite to report,
   not proof of wrong membership. Do not reset/logout/re-enrol the client or
   invent remote addresses. Bring up only the selected, documented existing
   route. **Its actual route command awaits LI's additional listener/access
   decision, followed by implementation and connection validation.** The
   existing-facility inventory above is complete.
2. With absolute local paths, run:

   ```powershell
   & $Python tool/check_reusable_phone_entry.py connection-check `
     --apk $Apk --handoff $PrivateHandoff `
     --window-start-sgt $WindowStartSgt --window-end-sgt $WindowEndSgt
   ```

   The check verifies the frozen local APK, then original TLS plus rejection
   of an unauthenticated Settings GET. It performs exactly one synthetic Auth
   sign-in and an authenticated **existing** Settings GET. It does not save
   settings, prepare/send AI, call a model/provider, retry or use Firestore
   directly. No response values, credentials, tokens or endpoints are printed.
   Numeric loopback is fixed; environment HTTP proxies and redirects are not
   used. A changed handoff or expired window stops subsequent work.

   `Pass` means **these workstation connections passed**. It does not establish
   remote lifecycle/admission, Android, model readiness or the reusable-entry
   acceptance. Keep the host's separate current lifecycle receipt; never turn
   a connection Pass into authority to override held/unknown service state.
3. In the same valid window, open the already installed dedicated app using
   the usual app launcher. Select the assigned authorized device and existing
   SDK tool paths; run the existing handoff:

   ```powershell
   & $Python tool/li_controlled_phone_handoff.py `
     --apk $Apk --handoff $PrivateHandoff --serial $Serial `
     --adb $Adb --aapt $Aapt
   ```

   It checks installed bytes/nonce and delivers through stdin. The helper
   itself has no window parameter; never reuse it outside the agreed interval
   or after an earlier failure. Its `CONSUMED` result proves configuration
   consumption only. JIN remains responsible for integrating the route and
   this sequence into the final repeatable entry, including actual failure
   handling; this preparatory sequence is not an operational acceptance.
4. Independently begin an assigned Account/AI/Check-in flow. Preserve explicit
   save/reread, unknown/no-blind-retry and the existing test split. Record which
   step actually began and its result. Do not relabel any fixture/checker result
   as Android or real consecutive model success.

## Stop, failure ownership and acceptance

On a failed check, retain its fixed category and source/window, stop subsequent
steps and report to JIN. Do not print raw exceptions or copy private files into
evidence. `outside_agreed_window` belongs to LI availability coordination;
route/TLS/Auth/configuration faults belong to JIN; SHI reports actual local
device observations. A service busy/held category requires the original owner,
not a new lease, repeated generate, forced process kill or directory deletion.

LI ends the service by the existing private `SESSION/stop` request in its owned
directory (empty, owner-only file), then retains closed/cleanup, worker/outer
exit and profile/port receipts. Missing or held receipts are not clean success.
Do not automate a kill at window end. Stop the tester's owned connection using
the selected route's eventual procedure; preserve mappings/resources whose
ownership or acknowledgment is unknown. Original handoff success retains ADB
mappings, so their final owned cleanup remains part of that actual route
integration, not a claim made by these checks.

Acceptance remains SHI's **actual independent start in the agreed window**:
record artifact/source, script commit/digest, SGT window, Backend/Auth/TLS and
configuration results, an assigned flow actually started, failures and Not Run.
It must work without a simultaneous three-person conversation. Until that
receipt and the selected connection exist, entry acceptance is **pending**.
