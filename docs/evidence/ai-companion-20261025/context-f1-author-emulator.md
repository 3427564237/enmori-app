# F1a author Emulator proof — 25 October

Core source: `26dd48cae40a20a571d73731ea696fde1854259f` (includes `cf52a27`
source-proof hardening). Executed harness:
`backend/emulator-test/selected-reply-first-flow.integration.test.ts`, SHA-256
`c24080c31ffae241a21bc8c02f8aca3bd36687933068939fdfd87b8aa9e6c484`.
Pinned Node 24.19.0 / TypeScript 7.0.2 strict build succeeded.

Integration explicitly assigned the existing dedicated test window. Actual
Auth/Firestore target: `demo-enmori-companion-20261025`, loopback Auth 19099 and
Firestore 18180, with Integration's isolated credential profile. No other
service was started or stopped. The suite requires the exact demo project and
`ENMORI_F1A_EMULATOR_PROOF=true`; its default is five skipped tests, without
network activity. Only a fresh synthetic owner/Auth UID and its own documents
were used. No real model, FCM, device registration, provider or deployment call.

| Actual Emulator case | Result |
| --- | --- |
| Current mutable create/update metadata, real executor/store canonical U/A, v2 receipt and source card; no old immutable-Note flag | Pass |
| Actual Check-in edit while the fake model is pending: explicit authority-change failure, saved U preserved, zero assistant/delivery | Pass |
| History uses unselected B: conflict before new U/model; fresh prepare and explicit pair exclusion then succeeds in the same topic, retaining old history | Pass |
| Eight-day-old source: no new source grant; excluding its complete old pair permits a current source-free reply in the same topic | Pass |
| Actual selected-read SDK transaction held pending across Cancel: `io.run` remains non-idle and settlement waits for the returned promise; no model/delivery | Pass |

**5 tests / 5 pass / 0 fail / 0 skipped**, process exit 0, total 7.747 seconds.
The model is an injected deferred fake with strict structural output; the source
reads and canonical transactions use the actual Admin SDK and Emulators.
No latency or semantic model-quality claim follows from these durations.

The test cleans only its new synthetic owner, binding, Check-ins, messages,
receipts, effects and known operation fences; it removes its Auth UID. It restores
the prior runtime marker only while the marker still matches this test's own
process epoch. It never clears the project. The author explicitly released the
slot after successful cleanup; Integration retains ownership of the running
Emulator service.

Raw process log (private local evidence):
`/home/miku/.local/state/enmori-ai-companion-20261025/first-flow-emulators/context-f1-author-real.log`.
SHA-256: `2fe764f163163eb83fd3d865572e518fa8e36d51d5b4c2ac19aa0339b4dc4073`.
No token, password, registration value or source body was logged.

This is **author** evidence for the current reader/executor/store and the
tracked-transaction mechanism. The harness composes them explicitly; it does
not certify Integration's separately edited Bootstrap, HTTP allowlists, App UI,
actual process restart or independent QA. The earlier independent F0 ten-case
Emulator report applies to `14f7390`; the independent F1 source/fake review is
recorded separately by QA. Physical device, release and Done remain distinct.
