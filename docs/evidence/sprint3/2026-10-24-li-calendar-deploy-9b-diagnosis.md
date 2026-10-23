# Existing backend calendar deployment and 9B message diagnosis

Date: 24 October 2026, Asia/Singapore. Authority:
[LI's deployment and diagnosis decision](../../decisions/2026-10-24-li-calendar-deploy-9b-diagnosis.md).
This follows the [source repair and 58 prior probes](2026-10-23-li-calendar-plan-repair.md).

## Disposition

- **Calendar repair deployed to the existing backend.** Its actual compiled
  application/repository/query chain now returns all 31 October day counts from
  real Firestore, matching an independent grouping of the owner's Check-ins.
  The same chain returned `SERVICE_UNAVAILABLE` immediately before deployment.
- **Small-plan relevance remains unresolved.** Sixteen additional bounded
  synthetic requests narrow the problem: native chat and explicitly rendered
  official-template requests give identical replies on all four preserved
  cases. Removing the JSON constraint does not repair the two original failures
  and breaks the output contract on the correction case. No AI candidate was
  adopted or deployed.
- The service is healthy, with its existing identity gate and HTTPS ingress.
  Physical-phone interaction, installation and verification remain **Not Run**.
  This is not full end-to-end or release acceptance.

## Minimal deployed change and runtime identity

The existing service was running the clean checkout
`/home/miku/.codex/worktrees/li-zhou-integration-oct20/ENMORI` at
`7cf12cd398eb1a613eff2e5c867af5a623428cf5`. A separate local runtime branch,
`souma/calendar-runtime-20261024`, retains that baseline and adds only the
established calendar adapter patch:

`7a3c4fa31b5bb609349a961a2e4e08aeb80c9036`

`countCheckIns` adds `orderBy("createdAt", "desc")` to reuse the existing
owner/descending-time index. The repaired TypeScript file has SHA-256
`37e0b75ede529b4825c11874084dde696c234c9898db904cdeaba4d47c480068`, identical
to the earlier reviewed source repair. No other production source changed.
The rebuilt JavaScript adapter SHA-256 is
`51d464257b7b8de5c8d1a1f03c8d5c78b0edaa26a6c0ff29d0c449aef882b4b8`.
There was no schema/index deployment, migration or dependency update. The
second-round product branch and v26 APK were not substituted for this runtime.

The existing Node 24.19.0 and pinned dependencies passed the runtime TypeScript
check. The source checkout passed a TypeScript build and **14/14** targeted
calendar/index/history checks. These are isolated tests; the real-data checks
below are separate manual operational reads.

`enmori-group.service` stopped gracefully through its existing supervisor. The
owned lock was released normally before rebuilding the runtime. No process was
force-killed, no lock was deleted, and no second runner was started. The same
service resumed and reported ready at `2026-10-23T16:33:36.920Z` (24 October,
00:33:36 Singapore time), including Firebase reads and AI availability. Its
existing empty-prompt model preload ran during normal startup. Tailscale,
Firebase configuration, Ollama service and stored model settings were unchanged.

Original source and compiled adapter rollback copies, source/build identities
and operational checks are retained privately. Rollback is the saved adapter
from the named baseline followed by the same graceful build/start procedure;
it requires no data rollback.

## Real-data verification and limits

The configured existing owner's Firebase identity and account binding were
resolved through the established Admin read path. For the calendar check, the
deployed compiled `OwnCheckInCalendar` → `FirestoreCheckInCalendar` →
`FirebaseAdminCheckInHistoryGateway` chain was called in a read-only operational
process. This exercised real aggregate queries, existing owner binding and
Singapore civil-day bounds. Every returned day matched an independent grouping
of the same owner's existing records. No test record was inserted.

Before/after snapshots contain only private path-to-content hashes. They cover
the account/binding, account subcollections recursively, Check-ins and event
participations: **88 documents before, 88 after, zero changed, added or deleted**.
The final post-diagnosis check again matched all 31 days and all 88 document
contents, with zero differences. This includes the existing Persona, conversation
messages and their source/effect records.
This is evidence for the enumerated owner scope, not a claim to have audited
every account in the project.

Unauthenticated requests to the calendar route return **401** through both local
TLS and the existing external HTTPS edge. The previously cached test login's
refresh request failed with HTTP 400; its original credential file was retained.
No password, replacement identity, custom token or authentication bypass was
used. **Authenticated HTTP calendar readback is Not Run** with that expired or
otherwise invalid cached login. The successful real query-chain result must not
be described as a successful authenticated HTTP or phone test.

## New model-boundary experiment

Installed model inspection still reports Ollama `0.40.4`, `qwen3.5:9b`, Q4_K_M,
the qwen3.5 renderer/parser and unchanged stored sampling defaults. The product
transport remains byte-identical (SHA-256
`d50b31412a5754ace1b5e2023ee540d1f1054071854b2b12723ac39dbbf8434d`).
The final running-model readback retains digest
`56671c2ab9385f9cfcb404638e32cd62d88e3501d44822208363c010179a3c90`
and context length 8192.

The new harness uses only synthetic current messages/history. It imports the
existing transport but no Firebase clients or account routes. It sends one
fresh request at a time, retains 8192 context, 512 output tokens, `think:false`,
the 45-second delivery deadline and the original system wording for plan cases.
Only the comparison requests use `temperature:0`, `presence_penalty:0`, and
`seed:73`; these are not new product defaults.

For the raw comparison, the same system/user/assistant content is rendered as
the text-only non-thinking form of the
[official Qwen template](https://huggingface.co/Qwen/Qwen3.5-9B/blob/main/chat_template.jinja)
and sent via [`/api/generate` with `raw:true`](https://docs.ollama.com/api/generate).
The installed-version [renderer registration](https://github.com/ollama/ollama/blob/v0.40.4/model/renderers/renderer.go)
selects the empty thinking block for non-thinking Qwen3.5; its
[renderer implementation](https://github.com/ollama/ollama/blob/v0.40.4/model/renderers/qwen35.go)
provides the native comparison. The ordinary product still uses `/api/chat`.

| Control | Result |
| --- | --- |
| Leading-system marker instruction, native/raw × schema/no format (4 requests) | All four follow the marker instruction and return the same valid JSON. This does not erase the earlier instruction-following failures under different settings. |
| Four preserved cases, native schema vs raw official template (8 requests) | Every pair has identical prompt-token counts and byte-identical output. Both original label/rest cases remain wrong. The correction and genuine software-testing goal are followed in this bounded deterministic comparison. |
| Same four cases, omit provider `format` (4 requests) | Original English and Chinese failures are unchanged, as is the software-testing control. The correction now returns plain text and reintroduces reviewing study notes into the requested break. |

All **16/16** provider responses completed with `done_reason:stop` in
1.115–10.699 seconds and settled to `pending:false`, `outcomeUnknown:false`.
Fifteen outputs were valid JSON; the unconstrained correction was not. Transport
completion is not semantic success. There was no additional prompt fix, model
replacement, automatic retry or saved account conversation. All prior 58
diagnostics and historical device incidents remain intact.

The evidence does not support missing/reordered messages, a native-versus-raw
rendering difference, or JSON grammar as the cause of these specific failures.
The two failing inputs still cause this configuration to treat contextual test
labels as work and invent a relationship to previous activity. This narrows the
problem to interpretation under the tested model/settings; it does not prove
every 9B configuration fails or establish a replacement model as necessary.
No configuration-only remedy passed the preserved cases, so no fourth prompt
candidate or speculative product workflow was deployed. A future remedy must
demonstrate reliable goal selection and correction on these cases and fresh
ordinary examples before changing the live AI path.

## Retained artifacts

Private owner-only directory:
`~/.local/state/enmori-calendar-deploy-9b-20261024/`.

It contains the before/after/final read-only hash snapshots and safe summaries,
rollback adapter copies, runtime build/test output, deployment identity,
`calendar-live-check.mjs`, `boundary-probe.mjs`, the 16 synthetic requests and
responses, model inspection, upstream template copies and `boundary-summary.json`.
No credential, account identifier, private record, prompt or model response is
copied into this public evidence record or operational service logs.
