# LI — bounded product round integration, 23 October 2026

Status: confirmed execution delegation; no new product/data/API policy.

The human user in chat `01a15293-dbcf-75e2-b020-398d61d677cb`
(“补齐 ENMORI 核心体验”) requested six independent chats/worktrees and
explicitly selected “授权六个聊天直接协作（推荐）”. Integration read that
actual user reply on 23 October. The authorization is limited to this round's
App, Social, Journal, AI, Backend and Integration chats exchanging interface,
delivery and correction requests. It excludes main merges, deployment,
payment and real-data changes. The local launch roster records the exact IDs.

The assigned common source is `7cf12cd398eb1a613eff2e5c867af5a623428cf5`,
including v24 product source `f7cebdf4916f0a4adb818721357f54bca2813eb0`.
Use the already-created role worktrees and `souma/` branches; preserve the old
integration checkout and running services. Integration targets
`souma/li-zhou-runtime-20261020` through a Draft PR and does not merge it.

Integration owns global theme, EnmoriMotion, shell navigation and shared routes;
App owns Home content, own Profile and account/preference entrances; Social owns
shared social/Event components; Journal owns records/calendar/map; AI owns
chat/Persona; Backend owns server and normative API contracts. Integration may
make necessary local wiring and compatibility repairs without another design
approval. New product permissions, data purposes, major contracts or
infrastructure still require competent authorization.

This replaces only the earlier single-chat execution arrangement for the work
assigned to these six new chats. It preserves the requirements and supersession
trails in the 19 October core delivery, 21 October product/defaults, 22 October
UX priorities and 23 October refinement decisions. The earlier UI task's
no-new-PR instruction remains local to that historical task; this round has
explicit Draft PR delivery instructions. Historical APK/device evidence does
not establish acceptance of the next candidate.

Shared Backend/Firebase/Ollama/Tailscale, real data, signing configuration and
device state remain unchanged during module development. Integration coordinates
serialized Flutter validation and the final APK build. Runtime, source tests,
fixture previews and device observations are reported separately.

The human subsequently requested persistent Chinese/English selection in Settings
in the App chat (`01a1689b-0799-7550-a624-e44ec1aa3081`), explicitly covering the
actual application interfaces and cross-module wiring. Integration read that
user message directly. The App decision
`2026-10-23-li-app-preferences-recovery.md` retains the request and its scope.
The delegated implementation uses one device-local `en`/`zh` preference, keeps
English on devices without a prior choice, and wires both ordinary and group
application roots. Android uses private SharedPreferences; the iOS source uses
UserDefaults. Settings can change it while account reads fail; the locale changes
only after storage acknowledgement and readback. The existing Flutter SDK locale
dependency was already locked transitively and is now direct. No new third-party
package, Backend field, cross-device sync, data purpose or content translation is
introduced. This extends the interface scope only; earlier privacy and consent
decisions remain unchanged. Platform source is not evidence of device acceptance.
