# QA — shared local lane and F0 serialization

25 October 2026. Independent source/fake review of Runtime
`e2f092ed5b23d60fdca3bbe5954e6fb553216aab`, with the old production serializer
from `24f913dd26afa9af82f7c31ac9eefcf543b64140`. No real model, provider,
database or notification call was made. Existing local24 semantic results remain
**12 Pass / 12 Fail**; this checkpoint does not change them.

## Executed boundary checks

QA compiled the exact Runtime checkout with the existing pinned Node 24.19.0 /
TypeScript 7.0.2 toolchain into a private output directory, exit 0. No package
installation or author build-output change occurred. With a throwing global
fetch guard, QA independently ran
`compiled/test/ai-runtime/local-first-flow-transport.test.js`: **18/18 passed**.
This is the focused new-file suite, not a second run of the author's full baseline.

The checks cover shared chat/F0/preload contention; actual Persona preview
application admission and cancelled delivery; expired/invalid budgets; matching
completion followed by a new consumer; and quarantine after HTTP 503, socket
loss, partial/absent body, done false, wrong model, duplicate or escaped-duplicate
done keys, malformed UTF-8, oversized response and broken reader. Cancellation
withdraws delivery authority while physical receipt remains owned. Matching
model `done:true` releases the lane even if message content is unusable; an
unknown physical outcome keeps every consumer blocked without retry.

`LocalModelLane` is injectable and the focused tests share one instance across
consumers. Actual application composition, startup/shutdown and integrated
worker ownership remain separate Integration checks; accepting a class or a
per-application boolean does not establish one physical lane in the host.

## Old production request compatibility

QA extracted the actual old `LocalChatTransport` source from `24f913d` and
transpiled it privately with Node's TypeScript transform. Its two runtime imports
(semantic policy and result helper) were source-compared and unchanged between
the two commits. QA invoked both old and new production transports with fake
HTTP capture and compared each complete request's URL, method, redirect, cache,
headers and **serialized body string**, including field order, to the frozen
golden. All **24/24** matched old → golden and new → old.

The golden SHA-256 is
`b6a8673446a1a36cc5921e097ecacbf06aa752450227e9eddbab6ad7049027ee`.
Original 32-case corpus SHA-256 remains
`1f216f2d8a4facafaac55eb9567c2136864999cc68c6759e831a81693ff0912a`;
the preserved 16-case file remains
`837d0a2076e86736e9e46f9d950ff0bcaaec1e1f10c825bf6aee9476e281311b`.

## Separate F0 fixture review

All eight F0 fixtures passed independent projection capture through the new
compiled transport: dated quote, due instant/zone and optional current Persona
are unchanged; no source ID, history or additional record was added. The fixture
file SHA-256 is
`b9ada505ef4cb732c829c0f9eab959a33b8034c949d35e2ce06d37146ec45d70`.

QA read all eight human criteria: rest without study carryover, starting without
assumed completion, historical mood, explicit language, undecided attendance,
local midnight, quoted instruction and Persona authority boundaries. The times
agree with the supplied Singapore dates. Common criteria correctly distinguish
the requested due time from actual dispatch/current time, and require the
injection/Persona examples to retain relevant follow-up rather than pass on
refusal alone. These fixtures are suitable for later independent evaluation;
there are **no F0 model outputs or F0 semantic verdicts** at this checkpoint.

The serializer audit performed 48 old/new chat captures plus eight F0 captures:
**56 fake HTTP invocations, zero real model calls**, not 56 semantic cases.

## Evidence

Private directory:
`/home/miku/.local/state/enmori-ai-companion-20261025/qa-review/runtime-e2f092e/`.
`build.json` records the pinned command and empty successful compile log;
`focused-fake.json` records the independent Node command. Focused log SHA-256:
`95172c524e97079e2c38c5fa871927877b52f049a6ff77e964eb08aa7e5d583a`.
`serializer-audit.json` binds every per-case capture, source and fixture hashes,
SHA-256 `031e03e1170ba18c231d286c9bfe09b630ce5b8ccfee655b4ea0780269a6386d`.

The first private audit used an incorrect literal substring assertion for the
prompt's due-time wording. Its failure log is retained separately. Correcting
the QA assertion to the already-reviewed exact source text produced exit 0;
no Runtime change was needed. The old serializer transform emitted Node's
experimental-feature warning, not a compilation/test failure.
