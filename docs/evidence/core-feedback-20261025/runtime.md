# Core feedback — Runtime audit

2026-10-25, Asia/Singapore. Runtime owner:
`01a171a5-707c-77a2-8ddc-fbda24e4c089`.

## Baseline and authority

- Read the complete [LI core-experience decision](../../decisions/2026-10-25-li-core-experience-repair.md),
  this checkout's `AGENTS.md` and `docs/tooling/skill-routing.md`.
- The worktree was clean at `165c0094e7e9532adb347ed27f5b66f96f3a637b`.
  Its old branch `souma/ai-companion-runtime-20261025` remains at that exact head.
  Created `souma/core-feedback-runtime-20261025` in the same worktree from
  `087281e11ec5a681fd012b9d64431b225ed6f8ea`; no reset, cleanup or second worktree.
- The current session's actual `turn_context` at `2026-10-25T11:32:27.449Z`
  records `gpt-6-astra` and `max`. This is the coding-agent configuration,
  separate from the application's `qwen3.5:9b`.
- Applied the repository Backend development and systematic debugging workflows.
  Root owns bootstrap, deployment, shared App composition and normative contracts.
  Runtime owns `backend/src/ai-runtime/`, `backend/test/ai-runtime/`,
  `tool/ai-companion-eval/` and this evidence file.
  After the initial audit, Root explicitly delegated the first-flow connection
  in `tool/run_real_account_local.mjs` and
  `backend/src/bootstrap/retained-core-runtime.ts` to Runtime for this round;
  Context was notified and is not editing those two paths.

## Findings and their limits

**The phone's disabled Send button is not yet attributed to a model failure.**
LI's installed-v28 report establishes the version and symptom. Runtime did not
reproduce it on a phone, read private messages, or generate a reply.

1. In the baseline `ai_conversation_page.dart`, both composers require
   `state.canSend && hasText && _selectionReady`. With references disabled or
   `selection.active == false`, `_selectionReady` is true. An ordinary message
   does not require manually selecting a Check-in. An active, unconfirmed or
   invalidated selection does block that selected reply. App is testing the
   actual editor/selection state; Runtime has not changed Flutter files.
2. `AiConversationController._snapshot` derives `canSend` from authentication,
   an injected repository, read/generation/deletion state, operation uncertainty,
   retry state and the current location/reply target. It does not poll Ollama
   health. `ControlledDemoApp` constructs and injects the conversation repository.
   `AiConsentGate` presents chat only after accepted settings are loaded.
3. Persona selection is not a general chat prerequisite. Q19 and the current
   reader allow a valid Persona set with no active Persona, producing default
   expression. A missing/malformed Persona-state record or inconsistent set is
   unavailable, not equivalent to an empty set. No state repair, inferred
   consent or bypass was performed. Current account-specific Persona/consent
   contents were not inspected.
4. A separate deployment/capability gap is confirmed. The shared service still
   points to the old checkout below. In addition, even the new baseline's
   `tool/run_real_account_local.mjs:52` passes only environment, Events and model
   to `createRemoteGroupRuntime`; it does not pass `firstFlow` configuration.
   `retained-core-runtime.ts:141` enables `selectedReplies` only with that
   configuration, and `isolated-conversation-composition.ts:119` then creates
   owned-source operations. Updating the APK or copying the new Backend source
   alone therefore does not enable F1/F0 through this entry point. Root received
   this concrete composition finding. It is not proof of the button's cause.

## Actual read-only service evidence

Observed at approximately **19:34:55 SGT** (`2026-10-25T11:34:55Z`).

| Observation | Result | Limit |
| --- | --- | --- |
| `systemctl --user show enmori-group.service` with selected status fields | `active/running`, MainPID `1121`, started `2026-10-24 15:04:00 +08` | Process state, not current AI admission or semantic quality |
| Configured working directory and Git readback | `/home/miku/.codex/worktrees/li-zhou-integration-oct20/ENMORI`, clean `7a3c4fa31b5bb609349a961a2e4e08aeb80c9036` | Current source checkout; not an independent attestation of loaded compiled bytes |
| Exact service process command-line allowlist | `tool/run_real_account_local.mjs`; used its configuration argument only to locate the existing status file | Configuration and credential contents were not read |
| Existing `real-account-status.json` | `listening`, `ready:true`, full features and remote loopback enabled; AI configured/available/maintenanceHealthy true, pending/outcomeUnknown false | `checkedAt=2026-10-24T07:04:23.589Z`: startup snapshot, **not current health** |
| Exact-unit journal, since `2026-10-25 11:00:00 UTC`, bounded to 250 entries | One allowlisted `api-response / onboarding / 200` entry | Logger records onboarding and responses at least 500; absence cannot establish zero AI requests, no 4xx, or no pending operation |

Journal records were parsed locally and only fixed diagnostic labels, status
categories and counts were emitted. No request/response body, account identifier,
prompt, Persona text, token, configuration secret or raw journal was emitted.
The inspected runner exposes no public live AI-health route; no new endpoint was
invented and no HTTP probe, authentication call or user-data read was made.

## Smallest next changes and validation path

- **App:** reproduce the disabled composer using its actual widget, editor and
  session/selection states. Restore valid text/selection reactivity if proven;
  preserve consent, original-operation uncertainty and draft protection.
- **Root:** explicitly compose the approved local features in the real service
  entry point and bind the exact candidate before arranging deployment. A source
  diff is reviewable now; service changes require Root's separate window.
- **Context / Runtime interface proposal:** preserve the current typed model
  projection: original `occurredAt`, Note quotation, optional stored Mood and
  Activity, at most five records. Context resolves owner, day/time zone,
  exclusions, versions and current access. No IDs, versions, database paths,
  weather or location enter the model. The automatic-today resolver and its
  exact contract remain Context/Root work, not an inferred Runtime feature.
- If automatic-today data uses the existing inner context branch, its prompt's
  statement that Check-ins were **explicitly selected** needs neutral wording
  accurate for both authorized entry paths. Runtime has proposed this narrow
  wording change to Context; it is not a request for broader prompt tuning or
  a new input mode. No prompt change has yet been made.

The minimum subsequent live check is one **Root-assigned** local service/device
window after the UI and service candidate are reviewed: record the candidate
and existing operation state, confirm the composer accepts a fixed synthetic
message, send once through the actual prepare/execute path, and read back the
canonical saved user/assistant pair. Record HTTP outcome, model-attempt count,
current permission and source-receipt state separately; keep private text out of
logs. No automatic resend follows an unknown outcome. A second source-bearing
case is only needed after the automatic-today contract is implemented and its
specific data/window is authorized. An isolated Emulator result cannot replace
the physical v28/replacement-app reproduction or real-service evidence.

For semantic improvement, first keep ordinary chat and dated source quotation
usable. Avoid forcing every message into a plan or claiming that scheduled time
is current time, intent is attendance, or historical mood is present mood. These
are the existing reviewed failure categories, not new filters. Preserve the
current small limits and one physical model lane; do not add a fallback model,
classifier, tokenizer service, automatic retry or unlimited tuning batch.

## Execution and retained unknowns

The initial audit above changed documentation only. It established the entry
point's missing connection, which Root then assigned to Runtime. The bounded
source correction and fake verification below supersede that initial work
status. No speculative chat-adapter or semantic-prompt change was made.

The independent [local-24 result](../ai-companion-20261025/qa-model-review.md)
remains **12 Pass / 12 Fail**, and the final
[F0 result](../ai-companion-20261025/qa-f0-semantic-comparison.md) remains
**5 Pass / 3 Fail**. The one previously accepted F1 example is single-case
evidence. Stopping Gemini does not satisfy any local quality gate. The consumed
free-cloud reservation and [unknown dispatch outcome](../ai-companion-20261025/qa-cloud-interruption.md)
remain untouched; no count/generate, reset, retry or replacement grant is planned.

## Authorized entry-point correction

`parseLocalFirstFlowConfiguration` now validates the real entry's optional
private configuration before the TLS key/certificate read, lock acquisition,
Firebase/runtime creation or listener startup. The runner passes the copied
configuration as the existing fourth `createRemoteGroupRuntime` argument.
Omitting it preserves the existing disabled behavior. Supplying it with
`fullFeatures:false` fails explicitly rather than silently ignoring it.

The selected path remains the existing implementation:

1. Retained runtime constructs one `LocalModelLane('qwen3.5:9b')` shared by chat,
   Persona preview and F0; enables the existing selected-reply and owned-source
   operations when first-flow is selected.
2. Its existing `createFirstFlowComposition` uses the same message gateway and
   conversation store, current Auth lookup, owner binding, purpose consent,
   Persona and original message/source checks. No alternate store is added.
3. The existing `firstFlow.start()` calls `FirstFlowDueWorker.start()` when the
   operator supplies a bounded worker window. The cycle runs recovery, reads
   that fixed owner's active intents, then `runIntent` for an eligible due
   intent. The worker is not constructed without that separate window.
4. User settings remain default off. Configuration does not create a setting,
   intent, Persona or registration, or bypass a source/consent check. The
   selected real-entry path rejects `push` configuration, so the existing
   `not_attempted` sender remains in use and no FCM credential is acquired.

### Minimal operator selection, not an execution grant

Use the **existing owner-only private** `local-backend.json` and the existing
Node entry command; no new CLI, environment variable or service is introduced.
The current file was not opened or edited by Runtime. In addition to its
existing controlled-account/TLS/Events fields:

| Private configuration field | Meaning |
| --- | --- |
| `fullFeatures: true` | Required for the existing remote group composition |
| `firstFlow.ownerAccountId` | Exact existing operator-confirmed account UUID, never inferred from a username or arbitrary client input |
| `firstFlow.firebaseUid` | Exact Auth UID for that owner; the existing runtime/store still verifies identity and binding |
| `firstFlow.worker` omitted | F0/F1 HTTP/source capability selected, but no background due worker started |
| `firstFlow.worker.endsAtMs` | Optional, explicit absolute UTC Unix milliseconds; future and at most 30 minutes from validation, no automatic extension or renewal |
| `firstFlow.worker.intervalMs` omitted | Existing 60-second interval; if supplied, integer at least 1,000 and within Node's signed 32-bit timer range |
| `push`, `enabled`, model/provider overrides or extra keys | Rejected by this entry's allowlist |

Expiry is not extended to compensate for model preload. The existing worker
constructor validates the window again at construction. The worker starts in
the runtime factory, after `buildApp` is ready and before the outer HTTPS
listener; an explicit worker selection therefore authorizes that bounded
background cycle when the candidate is actually launched. Root must assign
the account and window before launching it. Configuration without a worker
does not promise background execution. Push remains unsupported by this entry.

The existing startup status file adds only three configuration booleans under
`firstFlow`: `configured`, `workerConfigured`, `pushConfigured:false`. It emits
no owner ID, UID or source content. These are startup configuration observations,
not a live health endpoint, proof of current admission or evidence of delivery.

### Verification performed

Pinned Node `24.19.0` / TypeScript `7.0.2`; no dependency install or upgrade.

| Check | Result |
| --- | --- |
| Baseline strict Backend compile | Pass before changing production source |
| New real-entry counterexamples on baseline | 1 Pass / 3 Fail: explicit scope was dropped; invalid/push configuration and disabled full features were silently ignored |
| Strict Backend compile after correction | Pass |
| New configuration / actual factory-worker fake cases | 6/6 Pass |
| Existing first-flow bootstrap boundary cases | 3/3 Pass |
| Actual entry module with all external effects mocked | 4/4 Pass |

The six new Backend cases cover immutable minimal selection, invalid identity
and unknown/push fields, absolute worker expiry/timers, defaults off with zero
model calls/writes, one due authorized canonical proactive publication without
registration/push, and fresh consent/binding/source checks before model dispatch.
The four entry cases execute the real top-level entry module using Node's
[module mocks](https://nodejs.org/docs/latest-v24.x/api/test.html#mockmodulespecifier-options),
with filesystem, Firebase, runtime creation, TLS/HTTP listeners and lock effects
replaced. They do not launch an actual service. The flag
`--experimental-test-module-mocks` is test-only and yields Node's expected
experimental-feature warning.

Commands:

```text
<pinned-node> <pinned-tsc> --project backend/tsconfig.json
<pinned-node> --test backend/dist/test/ai-runtime/local-first-flow-entry.test.js backend/dist/test/first-flow-bootstrap.test.js
<pinned-node> --experimental-test-module-mocks --test tool/ai-companion-eval/real-entry-first-flow.test.mjs
```

Private logs: `/home/miku/.local/state/enmori-core-feedback-20261025/runtime/`
contains `baseline-build.log`, `entry-red.log`, `first-flow-build.log`,
`first-flow-fakes.log`, and `entry-green.log`. The two passing batches total
**13 tests**, including three pre-existing tests; they are not new live model
or production-service evidence.

No Emulator, Flutter, Gradle, APK, installation, service restart/deployment,
real Firestore mutation, Ollama/provider request or notification send ran.
The exact phone Send-button cause, integrated automatic-today selector,
live F0/F1 operation and semantic acceptance remain separate open evidence.

QA independently reviewed entry commit `193b1e3b7749fc12482792f482afe84fba193f86`
and reported no blocking source issue in review commit
`8d440b6c1d25117356946d7a1615c7c29c00ceaa`,
`docs/evidence/core-feedback-20261025/qa-runtime-entry-review.md`. QA inspected
the tests without rerunning them; the 13/13 count remains author execution
evidence. That review does not cover the quotation follow-up below.

## Authorized current-day quotation wording

Root's normative `api/ai-today-context-contract.md` at
`72fc616ca81d6d7703fc139600ce959d7a84dc9e` confirms reuse of the inner
`selected_checkins_v1` projection for the explicit-source and automatic-today
entry paths. Runtime read the complete contract at that exact head; Context
confirmed that it owns the day/source resolver and will not edit the prompt.

The quoted-context instruction now says the supplied Check-ins were **authorized
and supplied for this one reply**, replacing its claim that they were explicitly
hand-selected. This is a provenance-description correction. The source type,
model parameters, dated observation boundaries, current-user corrections,
Persona limits and empty-source behavior remain unchanged. Date, zone, owner,
IDs, cap and `hasMore` remain application metadata; none was added to model input.
No source lookup, permission decision, new provider or model experiment was added.

This follow-up changes only `local-chat-transport.ts` and this evidence record.
It does not implement or independently validate Context's automatic-today
resolver, the App Send flow or an integrated service.

Pinned strict compilation passed. The existing six selected-context tests and
five evaluation-tool tests passed **11/11**, including full byte-for-byte
comparison of all **24/24** historical production requests. No new test merely
asserting the edited wording was added. Logs are `quotation-build.log` and
`quotation-fakes.log` in the private Runtime evidence directory above. All model
HTTP calls in this batch were intercepted by fakes; there was no real generation.

## Owner-only avatar Backend handoff

Root expanded Runtime ownership to the account Backend and its tests. The
complete controlling `api/own-avatar-contract.md` was read at Root commit
`d8b88105b7cc7b176f08fa25eb5c6f90c7d5e141`, including the explicit rejection of
IEND trailing bytes, palette, unknown critical, animation and tRNS chunks.
Root retains native/Flutter, OpenAPI and all shared bootstrap injection work.

Separate authenticated `GET/PUT /v1/me/profile/avatar` operations return only
`{avatar:{pngBase64,sourceSha256,revision}}`. The existing Profile/Settings wire
schemas stay unchanged. The optional composition is:

```typescript
new OwnAccountPreferences(
  existingPreferencesRepository,
  new OwnAvatar(new FirestoreOwnAvatarRepository(gateway)),
)
```

Without that second argument, avatar operations fail unavailable. The new
transport schemas are exported as `avatarSchema`, `saveAvatarBody`,
`getAvatarSchema` and `putAvatarSchema` for Root's OpenAPI integration.
Strict pre-validation rejects scalar coercion, including null/string revisions,
before Fastify's existing AJV setup can change their types. Avatar responses
use `Cache-Control: no-store`; body, query and size failures use existing codes.

PNG validation bounds the canonical base64 and source to 128 KiB, square
dimensions to 1–256, pixels to 8-bit RGB/RGBA without interlacing, every CRC and
chunk boundary, and inflated scanlines to their exact expected size. It checks
all row filters and requires complete consumption of one zlib stream. Only
well-framed `tEXt` ancillary metadata is accepted and discarded; every other
ancillary type is rejected, including orientation/aspect-ratio/color metadata.
Canonical output contains only IHDR/IDAT/IEND. The source digest covers the
validated submitted PNG, before metadata removal. No image/digest is logged.
The format checks follow the [PNG specification](https://www.w3.org/TR/png-3/);
bounded inflate/re-encoding uses built-in
[Node zlib](https://nodejs.org/docs/latest-v24.x/api/zlib.html).

The existing completed-account binding derives the owner. A one-attempt
transaction reads the independent avatar revision and writes exactly the three
approved avatar fields, preserving other account fields. Complete absence is
null/null/revision zero; partial/malformed state and overflow fail unavailable.
Explicit removal advances the avatar revision and stores null bytes/hash.
A lost acknowledgement returns unavailable without an automatic retry or
compensating write. Subsequent GET exposes current authority; an unchanged GET
is not proof that an unacknowledged operation had no effect.

Pinned Node 24.19.0 / TypeScript 7.0.2 strict compilation passed. The initial
test compile found only a test-helper Buffer generic inference mismatch; its
explicit Buffer annotation fixed it before executing tests. The concentrated
fake/inject batch passed **47/47**: 16 new avatar cases plus 31 existing account,
transport, social privacy and isolated consent-producer cases. Final source
review narrowed ancillary acceptance to text only, to avoid stripping
orientation/aspect-ratio semantics; strict compilation and the affected 16
avatar cases then passed **16/16**. These are 47 unique tests, not 63.

```text
<pinned-node> <pinned-tsc> --project backend/tsconfig.json
<pinned-node> --test backend/dist/test/account/avatar-png.test.js backend/dist/test/account/own-avatar.test.js backend/dist/test/account/avatar-transport.test.js backend/dist/test/account-preferences.test.js backend/dist/test/account-preferences-transport.test.js backend/dist/test/social-profile.test.js backend/dist/test/isolated-ai-account-producer.test.js
<pinned-node> --test backend/dist/test/account/avatar-png.test.js backend/dist/test/account/own-avatar.test.js backend/dist/test/account/avatar-transport.test.js
```

Private logs in the Runtime evidence directory above: `avatar-build.log`
(initial helper compile failure), `avatar-build-fixed.log`, `avatar-fakes.log`,
`avatar-final-build.log` and `avatar-final-fakes.log`. The batch log SHA-256 is
`5ff00e4602b2717e01e8e452d24eb2b149c43af717a449c4b51681192d4546c4`;
the final affected-case log SHA-256 is
`e56eecab3a57045f68c7a4572d65a72a72b92f7da92df4e87e293b9400569582`.
The lockfile remains unchanged. No new dependencies, collection, index or
migration were introduced. No real image upload, account/Firestore call,
service/model operation, Emulator, Flutter, Gradle, APK or phone operation ran.
Bootstrap/OpenAPI/native integration and runtime/device acceptance remain
Root's subsequent integrated work; this handoff is author source evidence.
