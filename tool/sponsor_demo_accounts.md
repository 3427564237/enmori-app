# Controlled Sponsor demo accounts and package

Authority: [19 October LI decision](../docs/decisions/2026-10-19-li-sponsor-demo-local-takeover.md). These are isolated process-lifetime controlled-demo capabilities; ordinary bootstrap and the older single-account handoff remain separate.

Build the dedicated debug candidate with the existing pinned Flutter and dependencies:

```sh
ENMORI_SPONSOR_DEMO=true /home/miku/fvm/versions/3.47.2/bin/flutter build apk --debug --no-pub --target lib/controlled_demo.dart
```

The package must be `com.enmori.app.sponsordemo`. Do not set either legacy isolated-package flag at the same time. Keep the original installed apps/data. The parent integration operator owns final build, actual APK identity/SHA, device install, private configuration, and acceptance; no final APK is produced by this slice.

The private host config adds exactly `demoFeatures:true` and `dualAccounts:true`. Ticketmaster key and real-model/tokenizer/TLS configuration stay in the existing private stdin configuration. The CLI uses `open_conversation_v1` for both the startup compiler probe and actual service. It does not generate a model reply at startup or enable Ticketmaster automatically.

The host's private `handoff.json` uses schemaVersion 2, retains root `email`/`password` for the reserved primary registration, and adds `secondaryAccount:{email,password}` for the precreated secondary. Existing connection/TLS/project/lifetime fields remain unchanged. These exact generated emails and passwords must be kept in the operator's private local instructions. Do not put credentials in Git, APK assets, command arguments, diagnostics or public acceptance evidence. Deliver a waiting installed candidate with the existing verified nonce/private-stdin tool:

```sh
python3 tool/li_controlled_phone_handoff.py --sponsor-demo --apk /absolute/candidate.apk --handoff /absolute/private/handoff.json --serial DEVICE_SERIAL
```

Those arguments are paths and the authorized device identifier, not credential values. The helper verifies the dedicated package and exact installed APK hash before touching its private cache. It does not install/uninstall/force-stop an app. v2 never automatically signs in; the existing app router starts registration and retains sign-in after logout. v1 keeps its original single-use automatic sign-in.

## Operator journey

1. Register the primary inside the app using its exact private reserved credentials; complete the existing Username/initial optional-processing choice flow. Select Accept for the AI demonstration, or explicitly preserve a declined-choice outcome as AI unavailable.
2. Save primary Profile display name and public visibility through the existing Profile editor before the Friend demonstration. The Friend contract needs a display name for the target presentation; initial onboarding does not invent one.
3. Open Interests, select the real `Music` tag, save, return, then sign out and sign back in. The catalogue contains exactly one approved active tag in this bounded environment; no broad catalogue maintenance API is added.
4. Sign in to the precreated secondary, view its Profile username, and record that username only in the private operator file. Its initial display name is `Demo friend`. Sign out; sign in as primary, look up the exact secondary username and send a request.
5. Sign in as secondary, accept the primary request in the existing incoming-requests surface, then return to primary and read My Friends again. Re-read both lists; record identity isolation, not only button feedback.
6. Create controlled Check-ins through the existing approved create-only route/UI. Use at least 21 short owned records in the selected local date for a 20+1 paging rehearsal. Keep notes short enough for the approved AI source/token budget; existing context selection remains capped at five eligible Notes. Verify next-page failure preserves the previous page/cursor and retries that cursor (the inherited #157 controller fix remains in place).
7. Use Persona and open chat, with at least three real-model sends and readback/re-entry. The service joins the authorized two-pair history implementation; fake-model integration results do not satisfy the real-model or phone acceptance gate.

## Exact cleanup and failure recovery

Only an explicit stop request closes admission and begins drain. While any model/compiler/SDK/operation outcome remains unknown, preserve the ORIGINAL owned process and data; never start a replacement fixture or clear the whole environment. A held status is not successful cleanup.

After quiescence and current-epoch CLOSED-fence verification, cleanup is limited to the two generated Account roots/subcollections, their own Check-ins, idempotency scopes (Account IDs and bound Firebase UIDs), username reservations bound to those Account IDs, exact Auth-binding documents, exact Friend access/list/inbox roots and the one pair initialized for those owners, and the exact catalogue record created by this run. The primary may register without ever making a Backend request; cleanup checks only its exact initially absent reserved email in that case. Once a UID is bound, a replacement UID cannot reuse that email's authority or be silently swept as the old identity.

Shared runtime fence removal retains the existing matching-epoch/generation checks and failed-sweep checkpoint hold. Unrelated Auth identities/documents are preserved, with actual Emulator regression coverage. The process does not clear a global Firebase collection, reassign a pending AI operation, fabricate cleanup, or erase historical failed acceptance results.
