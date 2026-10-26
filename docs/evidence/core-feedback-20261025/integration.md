# Core feedback integration evidence

## Coordination and actual configuration

The six existing work sessions were reused from common source
`087281e11ec5a681fd012b9d64431b225ed6f8ea`, on separate
`souma/core-feedback-*-20261025` branches. Each resumed dispatch explicitly set
`model` and `thinking: max`; the corresponding local `turn_context` records
were checked on 2026-10-25 between 11:28 and 11:32 UTC.

| Role | Actual model | Actual effort | Session |
| --- | --- | --- | --- |
| Integration | gpt-6-astra | max | 01a1719f-a6aa-75e0-9ad4-f3724777fa95 |
| Product / UX | gpt-6-astra | max | 01a171a5-56ba-7a72-aa6a-61533992773b |
| AI Runtime / Models | gpt-6-astra | max | 01a171a5-707c-77a2-8ddc-fbda24e4c089 |
| Context / Backend | gpt-6.1-sol | max | 01a171a5-7307-7211-b98c-7225891ed085 |
| Proactive / Delivery | gpt-6.1-sol | max | 01a171a5-7c5f-7c01-b2a9-220586a26f84 |
| App / UI | gpt-6.1-sol | max | 01a171a5-7eca-7221-8a26-c7fc5fe1beb9 |
| QA / Evaluation | gpt-6-astra | max | 01a171a5-81c3-7ba0-a07b-f57440ea5e6d |

Integration owns shared composition, routes, normative API, Home, account UI,
native Android and final integration. Product owns its design/evidence packet;
Runtime owns local model/runtime plus the separately delegated avatar Backend;
Context owns selected-source Backend and recommendation investigation;
Delivery owns the event presentation vertical slice; App owns AI/today/follow-up
UI. QA reads implementation and runs independent counterexamples, and edits
only its evidence/test files. Shared Flutter/Gradle validation uses the existing
round lock with an explicitly assigned single owner. No deployment, phone
write, real push, paid service, or new Gemini call is part of these source checks.

## Home scroll regression

The actual Home composition mounted a stateful recommendation section in a
lazy list without preserving its element off screen. Returning from the bottom
recreated the section, started another request and temporarily replaced cards
with a shorter loading layout. The fix keeps the bounded section elements alive;
their existing controller expiry, authority and lifecycle clearing still apply.

`test/app/home_scroll_stability_test.dart` uses the actual Home shell and event
section at 390 × 844. It scrolls from events to the bottom and back, checks one
repository request, unchanged scroll extent/position and retained cards. The
baseline fails with two requests; the fix passes 1/1. This is widget evidence,
not a claim of independent phone verification.

Private evidence under `/home/miku/.local/state/enmori-core-feedback-20261025/`:

- `home-scroll-red.log`: SHA-256 `894a4937d928cd9a0e72f8d5f6f7299186c4f00b814bbbb70acc8a254f9471fa`.
- `home-scroll-green.log`: SHA-256 `7b172b3e40105fea97914aa496483a933ac5418e8a424eaea9dba6fc22899b9f`.

LI's report identifies installed v28 and a disabled Send button. App and QA
independently reproduced selected-reference cancellation/expiry gates. These
counterexamples do not prove which exact gate occurred on LI's phone.
