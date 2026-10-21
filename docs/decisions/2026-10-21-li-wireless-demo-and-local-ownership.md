# PM decision: USB-independent local demonstration and throughput-first ownership

- Source ID: `S-PM-1021-LI-WIRELESS-DEMO-LOCAL-OWNERSHIP`.
- Authority: human LI / PM and controlled-host owner, 21 October 2026.
- Confirmed direction: the final demonstration release must operate without USB;
  fast work that LI can complete locally should be done locally, without dividing
  tasks merely to balance workloads.
- Confirmed environment answer: the Backend/Ollama host will be present and powered
  on; phone and host will use the same Wi-Fi or hotspot.

## Scope and supersession

The final-demo acceptance target supersedes the USB/ADB-only implementation
assumption in `2026-10-19-li-local-verification-entry.md` and
`2026-10-20-li-real-account-local-wiring.md` **for the final demonstration entry**.
Existing coretest/Emulator and real-account USB checkpoints remain valid historical
test tools. They must not be relabeled as a USB-independent release.

The work-allocation direction supersedes rigid feature-file ownership where
handoff would unnecessarily delay a small local fix. In particular LI takes the
owner participation label and shared EventCard time-formatting improvements back
from the 21Oct follow-up's SHI implementation request. SHI's existing Event activity
producer and JIN rereview remain active; JIN retains the pending social package.
Coordinate against actual branch state, preserve existing changes, and avoid two
writers implementing the same fix. GitHub/Draft PR handoff and different-author
review remain unchanged; this is not permission for self-approval or main merge.

## Demonstration target

- Phone reaches an authenticated Backend over the chosen local network using a
  correctly verified HTTPS endpoint. Ollama remains host-local behind Backend;
  do not expose its raw port or Firebase Emulator ports to the LAN.
- Launching and using the demonstration APK must not require an ADB connection,
  `adb reverse`, `run-as`, a per-launch USB nonce handoff or fixture credentials
  embedded in the APK. Existing identity, consent and privacy rules remain in force.
- The host must be running, and internet-dependent Firebase/Event/weather services
  still need connectivity. USB independence does not promise phone-only/offline AI.
- Use a signed release build and a stable demonstration entry/configuration.
  A release compiler flag alone does not meet networking or identity requirements.
- Final verification uses the same APK with USB physically disconnected, wireless
  debugging/ADB forwarding unavailable, cold launch, login and relevant real
  business/model flows. Current v14 native passes do not satisfy that gate.

No public internet exposure, paid/cloud hosting, permanent server deployment,
replacement AI architecture, database reset or bypass of existing emulator/real
identity guards is authorized by this local-network choice. Exact LAN/TLS/real
feature composition must be reviewed against existing boundaries before changes;
only necessary dependencies and implementation details are in scope.

## Existing retained-data evidence

This decision does not assert actual loss of particular records. The abnormal stop
at 21Oct 07:23 SGT did not confirm export; the last previously complete snapshot was
20Oct 12:25 SGT. All five Auth users from that snapshot, including the prior AI/UI
probe, are still present in the current snapshot; the sixth account is the new
Events fixture. Account presence does not prove every later profile/chat/check-in
mutation was saved. This snapshot is the isolated Emulator environment; restoring
it did not overwrite the separate real Firebase project.

Keep the original backup and failed-export evidence. Recommendation: do not spend
project effort on forensic restoration of reproducible synthetic test records
without a specifically needed missing record. This is LI's implementation advice,
not a claim that the PM ordered deletion or approved a new data-retention policy.
