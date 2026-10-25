# Proactive / Delivery — isolated candidate and decision input

Date: 25 October 2026, Asia/Singapore. Owner: Proactive / Delivery.
Baseline: `b81d93ffd219011dbc0918daca5c82fd83e7ba4a`.
Branch: `souma/ai-companion-proactive-20261025`.
Workspace: `/home/miku/.codex/worktrees/f74f/ENMORI`.

This is a reviewable proposal and synthetic source evidence, not a production
contract, PM decision, notification send or device acceptance. No production
defaults are selected. Nothing imports this candidate from the composition root.

## Authority and protection

Read LI's original attachment and the [round authorization](../../decisions/2026-10-25-li-ai-companion-round.md),
[handoff](../../handoff/2026-10-25-ai-companion-round.md), `AGENTS.md`, skill routing,
both Backend architecture sources and `ARCHITECTURE.md`. Applied only repository
`enmori-backend-development`, then `systematic-debugging` for observed failures.
There is no assigned new GitHub Issue; the human-authorized role assignment is
the scope. No Issue/PR/main or production API is changed.

The [19 October local simplification](../../decisions/2026-10-19-li-ai-mvp-simplification.md)
still governs the current app's narrow, local chat path. The
[24 October repair](../../decisions/2026-10-24-li-ai-plan-model-repair.md) and
[v26 phone observations](../sprint3/2026-10-25-li-v26-phone-acceptance.md) retain the
small-plan failure and bounded acceptance. This candidate does not relabel either.
No accounts, messages, Check-ins, Personas, participation, real data, service,
device, credential, platform file, dependency or deployment configuration changed.

Integration verified actual `gpt-6.1-sol` / `max` against this chat's first
`turn_context`; its owner-local `roster.json` names the rollout and turn ID.
This is the development-agent setting, not the application's model choice.

## Current capability and gaps

| Layer read at the frozen source | Verified capability / missing piece |
| --- | --- |
| `pubspec.yaml`, Android manifest/settings/MainActivity | Firebase Core/Auth exist. No `firebase_messaging`, local-notification or WorkManager dependency; no explicit `POST_NOTIFICATIONS`, messaging handler or notification channel. Existing IANA timezone method channel can inform an explicit setting; it does not authorize background data use. |
| `backend/src/bootstrap/controlled-runtime.ts`, `package.json` | Existing monolith composes Firebase Admin Auth/Firestore. The installed Admin dependency exists; importing its messaging API or possessing Auth/Firestore identity does not prove FCM API enablement, sender authorization or package/project registration. These were not probed with credentials. |
| `backend/src/bootstrap/conversation-maintenance-runner.ts` | There is a supervised-process maintenance timer for conversation cleanup, not a durable proactive schedule or push transport. It cannot wake a powered-off host. |
| `real-conversation-store.ts`, `async-conversation-application.ts`, Dart conversation domain | Current send/retry and assistant persistence require a real saved user message/pair. They cannot honestly represent an assistant-initiated contact by inserting a fabricated user prompt. A compatible new origin/operation contract and read model are needed. |
| [Q19](../../decisions/2026-09-01-persona-conversation-lifecycle.md), [Q14](../../decisions/2026-09-02-retention-logging-audit-policy.md) | Whole-conversation deletion, source invalidation and 90-day retention apply. The current contracts do not approve a push registration store, schedule/outbox, unread receipt or proactive origin. |
| Context owner's audit | Own participation has revision/updated time. Event details use a five-minute browse projection; there is no proven stable provider revision/cancellation stream. Going delivery needs fresh detail/status and exact version comparison, not a cached title plus a Going flag. |

The shared service's active state and clean `7a3c4fa` runtime are Integration's
startup readback, not a new worker runtime test. No service was restarted here.

## First vertical flow and scenario comparison — Proposed

| Scenario | Minimum authoritative source | Trigger and expiry candidate | Assessment |
| --- | --- | --- | --- |
| User explicitly requests later follow-up | Their retained request/confirmation, explicit due instant and zone, existing owner/topic authority | One confirmed occurrence. Fire no earlier than due; drop after due + 2h or source/topic expiry, whichever is earlier. If the time is unclear or falls in quiet hours, show the proposed permitted time before confirmation. | **Recommend first.** The user determines the purpose and time; no inferred mood, location or attendance is needed. |
| Going activity approaches | Current own participation = Going AND fresh event ID/status/time, two independent versioned dependencies | Candidate once 2h before start; latest permitted send is min(start, due + 30m). None/Interested, cancellation, time change, unknown status or stale projection stops old content. | Useful next. Existing provider freshness/cancellation proof is insufficient to enable this in production today. Going never means attended/booked. |
| Opt-in Check-in follow-up | Current own Check-in version, original recorded time, purpose-specific opt-in | Candidate at a separately chosen next-day daytime slot, within 24h of the record. One occurrence per selected record; max age and source validity are explicit. | Last of the three. New private-data purpose and a stronger risk of intrusive inference. Do not diagnose, infer current mood/location, or use guilt/dependency copy. |

Suggested complete first flow: the user asks “明天下午三点问问我准备得怎样了”;
show tomorrow's actual date, 15:00 and IANA zone, category, source, processing
location, delivery choice and Cancel/Confirm. A suggestion is not a saved schedule.
An ambiguous request first needs clarification, not model-selected scheduling.
After explicit confirmation, a trusted intent is queued. A server worker at due
time rechecks authority, reserves the occurrence, generates a small message,
rechecks again, and atomically publishes the genuine AI proactive message and
its delivery intent. Replies attach to its trusted topic, not a topic invented by
the model. No fabricated user message or automated “user Send” is inserted.

At this draft's initial checkpoint, conversation layout A/B/C remained LI's
separate choice. The first flow can use
the existing conversation container semantics with a new explicit origin; it
does not remove history/search/delete or merge old content.

Subsequent scoped authority: Integration commit
`2bb638b47e682217007cf02cd505550d88d627cf`,
`docs/decisions/2026-10-25-li-ai-entry-c.md`, records LI's direct choice of C.
This worker read that decision in Integration's tree. C now resolves the entry
form only: continuous entry with existing containers/history/current-topic
search/new topic/whole-topic deletion retained. It does not approve this note's
proactive purpose, persistence, retention exception, source cards, FCM or cost.
The original unselected comparison remains historical; no baseline rebase or
production source change was needed for this subsequent decision.

## Controls and limits to choose — all Proposed

| Control | Recommended choice A | Alternative B / explicit tradeoff |
| --- | --- | --- |
| Master state | Off initially. User explicitly enables, pauses or disables. | No opt-out enrollment. Onboarding may offer an unchecked choice. |
| Categories on first enable | Explicit follow-up selected; Going and Check-in follow-up remain unchecked. A time-specific confirmation is still required. | Enable another category only with its separate purpose explanation. |
| Pause | Until tomorrow at 08:00 in the confirmed zone, or a custom instant; indefinite pause is also possible. Keep status visible. | On resume, revalidate still-valid occurrences; do not replay expired backlog. Off cancels outstanding intents, and turning on cannot resurrect them. |
| Frequency | At most 1 contact per rolling 24h across all categories/channels; 8h minimum cooldown. | At most 2 per rolling 24h, still 8h cooldown. Counts do not reset when travelling or reading a message. |
| Quiet | 22:00 inclusive to 08:00 exclusive in the user-confirmed IANA zone; applies to all categories. | User can choose another interval or explicitly disable quiet. No default exception for activity reminders. |
| Timezone | Capture device IANA zone at confirmation, show it, and ask on a detected change. Without a valid zone, hold. | “Keep this zone” or “Use the current zone” is a visible choice. Until resolved, hold new dispatch. Already confirmed due instants remain absolute; changing the due time requires confirmation. |
| Source / authority freshness | Re-read before generation, before publish/dispatch and on content read. Demo authority proof and each source observation are at most 5s old; they still need a commit-time version fence. | An event must also have explicit valid-until. Wrapping a stale source in a fresh authority envelope cannot bypass its age check. A record's historical creation time is separate from its current observation time. |
| Failed or unknown work | Failed generation becomes terminal for that occurrence. Unknown external send holds for reconciliation and is not replayed. | A new user-confirmed occurrence is a new action, not retrying a possibly sent one. |
| Lockscreen | Generic ENMORI notice only. No generated body, request text, Check-in, mood, event name, time/location or owner ID. | Hide preview entirely. A content-preview option would require an additional cloud-data disclosure and is not part of the recommended pilot. |

The fixture numbers in `policy.test.ts` demonstrate these choices. The production
application reads none of them. “Contact” means one canonical occurrence,
independent of in-app read or FCM ACK. An actual dispatch attempt consumes its
frequency budget conservatively even if its ACK is later lost or cancelled.

## Generation, delivery and recovery seam — Proposed

`policy.ts` has a pure `evaluateProactive` function and
`ProposedProactiveRevalidation.readCurrent(candidate, phase)` interface. It has no
clock, database, network, scheduler or model side effect. Time is supplied by a
trusted server clock; fake clocks are only test inputs.

The candidate is bound to owner, authorization/session scope, occurrence, topic,
category, local/cloud target, due/expiry and a minimized exact source set.
`authorityVersion` must change with settings, purpose/consent, intent, session
scope or topic authority changes. It is not a model-produced token. The generation
proof also takes a frozen copy of the original candidate and source versions;
refreshing a source/candidate cannot authorize delivery of previously generated
text. These proofs are internal, never logged or exposed as model instructions.

| Fresh read result | Before generation | Before publish / external dispatch / content read |
| --- | --- | --- |
| Available and same version, grants still active | May reserve within policy | May commit only with unchanged proof and an atomic current-authority fence |
| Changed source, event time, intent or grant | Discard/reprepare from fresh data | Discard old output; no automatic regeneration, send or fallback |
| Deleted source/topic, denied access, revoked use, None/Interested | Cancel the occurrence | Prevent publication; invalidate dependent readable content under the reconciled lifecycle contract |
| Unknown, missing read, provider error, invalid zone or expired observation | Hold; no model call | Hold; never treat an error/missing row as “no private data” success |
| Quiet, not due, cap or cooldown | Return recheck instant | Re-run the complete policy then; a returned instant is not permission to send |
| Trigger or actual source/topic lifecycle expired | Drop old occurrence | Never send late backlog |
| Cached source observation expired | Hold for fresh authoritative read | Do not use the expired observation or silently extend it |

Context's proposed `{kind,id,version,observedAt,validUntil?}` maps to this module's
`revision/observedAtMs/validUntilMs` at a future adapter. Kinds include original
message/history pair, Check-in, event, participation and optional authorized
Persona. Event must carry expiry and both event/participation dependencies.
Required source IDs come from trusted readers. Raw model content never selects
them or gains business permissions. A future adapter must also enforce existing
Persona deletion and all required source dependencies.

`lifecycle.ts` proposes:
`queued -> reserved -> prepared -> dispatching -> accepted`, with separate
`cancelled/expired/failed/unknown`. Provider accepted means accepted for delivery,
not received/read. Recovery of `dispatching` yields `unknown`; interrupted
`reserved`/`prepared` work yields `failed`, because unpublished generated output
is transient and no separate raw-output retention is approved. Neither becomes queued again. Cancellation before
dispatch is terminal; after an external send may have begun it cannot claim
recall and remains unresolved until reconciled.

Two workers reading the same empty ledger can BOTH pass pure preflight. Production
requires one owner-scoped transaction/compare-and-reserve that checks the current
occurrence, all active reservations and frequency budget. In-app publication and
a minimal outbox intent must commit together, with a unique occurrence effect.
A stable sender outcome record is needed before calling FCM. A crash between
provider acceptance and saving its result is unresolved, not proof of failure.
FCM collapse keys/notification tags are display hints, not durable idempotency.

The source candidate has no persistence adapter, registered collection/index,
API route or scheduling process. The later document appendix proposes these
contracts without implementing them. Atomicity, a durable restart, multi-worker races,
retention cleanup and provider reconciliation remain unverified. The test that
serializes/rehydrates a record proves only reducer/preflight behavior.

## Retention and deletion choice for LI — Proposed

[Q14](../../decisions/2026-09-02-retention-logging-audit-policy.md) says an accepted
assistant message advances the containing conversation's
`lastPersistedMessageAt`. Repeated proactive writes into an old conversation
would therefore keep its older content alive. Calling this unchanged retention
while silently enabling that effect would hide a material product consequence.

| Choice | Concrete result | Contract impact |
| --- | --- | --- |
| R-ANCHOR — recommend the smallest same-topic exception | A true proactive message appears in its original topic without advancing its old anchor. Only a real user message and its normal accepted reply keep the existing anchor behavior. The proactive message may expire with that topic soon after delivery. | Requires an explicit scoped Q14 exception and proactive origin in read/write/resolver contracts. No such exception is currently approved. |
| R-SPLIT — a separate linked follow-up topic | Explicit confirmation binds a one-shot follow-up to a new topic/container. Its true AI proactive message starts that topic's normal retention; the old source conversation receives no automatic write. Old-source deletion/expiry cancels dependent work. | Approve minimized intent/link purpose, initial assistant-only message and source/read/delete contract. Do not copy old transcript or create a fake user message. This avoids a changed old anchor but adds a container/link lifecycle. |
| R-EXTEND — same topic, accepted proactive message advances anchor | Existing 90-day anchor mechanics would keep all earlier topic content longer. | LI must knowingly approve applying this retention effect to automated contact, alongside the new proactive data contract; it is not selected by this module. |

These options remain compatible with retained multi-conversation history or a
continuous main presentation that preserves underlying topics. R-ANCHOR is the
minimal recommendation after coordination with Context; a cloud notification is
not a reason to silently choose any retention policy. Deleting either a
target topic or required source prevents a pending send and cannot recreate the
conversation. No extra retained raw prompt, model response, full source snapshot,
long-term inferred profile or permanent notification history is proposed.
The pending intent/outbox/registration retention and deletion details need the
specific contract listed below; existing Q14 logging remains restrictive.

## Delivery mechanism, platform limits and required proof

Official sources were read on 25 October 2026; these constraints are independent
of our synthetic tests. The Firebase Flutter receive guide distinguishes
foreground/background/terminated handling, requires an initial app launch, and
says an Android settings force-stop requires a manual reopen. Foreground
notification payloads are not visibly displayed by default; background work is
time-limited. Click restoration uses both `getInitialMessage` and
`onMessageOpenedApp`. [Firebase Flutter receive guide](https://firebase.google.com/docs/cloud-messaging/flutter/receive-messages).

| State | Proposed real mechanism | What can / cannot be claimed; validation still needed |
| --- | --- | --- |
| App foreground | Server commits canonical proactive message; authorized client refreshes transcript/unread. FCM `onMessage` can be a refresh hint, never private source authority. | Source policy alone proves neither appearance nor server persistence. Verify actual committed occurrence, rendered true AI origin and a reply to its topic. Do not mark read merely because a push arrived. |
| App background via Home | FCM generic notification + opaque data; Android may display the system notification. Click causes authenticated current message read. | Needs push permission, enabled channel, valid app registration and actual device/network evidence. A successful sender call alone is insufficient. |
| App ordinary close / removed from Recents | FCM can support the not-running state without an app foreground timer; initial launch/registration must have happened. | Recents swipe is distinct from Android Settings force-stop. Validate the exact LI/SHI device because manufacturer power settings can affect availability; do not promise every OEM/task-manager behavior. |
| Android Settings Force stop / ADB force-stop | No reliable delivery until the user manually launches the app again. | Show this limitation. On reopen, sync still-valid in-app messages; do not replay expired push attempts. This state is not passed by demonstrating ordinary background delivery. |
| Device offline, Doze, battery restriction, host down | Server durable due records plus a revalidation scan on recovery; FCM remains best effort. | No exact-time guarantee. Drop stale content. A provider message ID means acceptance, not device delivery. The host cannot generate while powered off. |
| Permission denied, channel disabled, unsupported Google Play services or no registration | Keep the separately enabled in-app channel; no external push attempt. | UI explains channel availability without asserting delivery. Do not bypass system settings or ask to uninstall/clear data. |

Android 13+ requires `POST_NOTIFICATIONS` for these non-exempt notifications;
Android 8+ uses channels controlled by the user. [Android permission](https://developer.android.com/develop/ui/compose/notifications/notification-permission),
[channels](https://developer.android.com/develop/ui/compose/notifications/channels).
FCM setup also needs a compatible Google Play services environment. The current
Android documentation describes installation-ID registration, while Flutter
documentation still exposes token-oriented methods; do not invent a compatible
new API on our absent dependency. Exact Flutter/native/Admin compatibility must
be checked before choosing the dependency/configuration change.
[Android FCM setup](https://firebase.google.com/docs/cloud-messaging/android/get-started).

| Mechanism decision | Recommended pilot candidate | Limitation / alternative |
| --- | --- | --- |
| Notification packet | Generic notification text plus a single opaque delivery reference; application payload <=512 UTF-8 bytes. No account/source IDs or generated/private content in the packet. | Not an approved DTO. Authenticate and reread before resolving the reference. A notification reference is not a bearer authorization. |
| Expiry / offline | Set Android TTL=0 for the first pilot; if not immediately deliverable, do not queue a later system notice. The canonical valid in-app message can remain unread. | TTL=0 discards an immediately undeliverable message; FCM default is otherwise four weeks. A later 5-minute TTL could improve availability at the cost of more late notices. [FCM lifespan](https://firebase.google.com/docs/cloud-messaging/customize-messages/setting-message-lifespan). |
| Priority | Normal priority by default. Evaluate high priority only for a user-confirmed time-sensitive reminder with an allowed, visible notification. | High priority is for user-visible time-sensitive content and can be deprioritized; it is not an exemption from quiet/consent or a guarantee of time. [FCM Android priority](https://firebase.google.com/docs/cloud-messaging/android-message-priority). |
| Already handed to FCM | No private content to leak. On click/reopen, reauthorize source/topic, expiry and account before showing anything; invalidate stale unread content. | A generic notice already accepted by an external platform cannot reliably be recalled. It may arrive after revocation or a quiet boundary. TTL=0 reduces queuing but does not make display and revocation atomic. |
| Stricter pre-display check | Alternative: data-only FCM followed by authenticated source/quiet revalidation before Android display. | Extra network work may miss background execution windows or be delayed/dropped; suppressing high-priority messages can affect priority. It is a tradeoff, not proof of guaranteed terminated delivery. A local notification by itself proves no server push. |
| Notification click / unread | Both initial and background click paths request current authorized content for the opaque reference. Mark read only after the target message is visible in the current account and the read mutation succeeds. Duplicate clicks are harmless. | If signed out, require auth then resolve; if switched owner, deleted source/topic or expired, show unavailable without preview or unrelated routing. This needs a new approved read-receipt contract. |
| Registration lifecycle | Explicit push opt-in first; bind the active installation to current owner; refresh/rotate and unbind on sign-out/account replacement/disable. Do not send to a previously bound account. | Invalid registration is terminal; `INVALID_ARGUMENT` alone is not proof unless payload validity is known. Registration renewal is separate from replaying a delivery. [FCM registration management](https://firebase.google.com/docs/cloud-messaging/manage-tokens). |

FCM transport is not end-to-end encrypted, which supports minimizing the packet
rather than sending private message previews. [FCM message types](https://firebase.google.com/docs/cloud-messaging/customize-messages/set-message-type).
Registration auto-initialization can upload an identifier/configuration to
Firebase before a prompt; the future platform change must explicitly disable
unconsented initialization and review its Analytics setting. FCM installation
identifiers and global processing are additional cloud processing even when the
language model is local. Firebase describes identifier retention/deletion and
global processing; our app must not promise immediate erasure of Google's
backups. [Firebase privacy](https://firebase.google.com/support/privacy).
OS notification permission and this cloud-registration choice are separate
from consent to use private context or send it to a cloud model.

## Concrete resource / permission packet for Integration and LI — Proposed

| Option | Services and resource scope | Costs / boundaries |
| --- | --- | --- |
| D0: in-app only | Existing Backend host; approved durable minimal intent/effect storage, bounded due scan and existing authorized app reads. | No FCM registration or system push. Cannot satisfy background/terminated notification acceptance. Still needs new product-data/schema/retention approval. |
| D1: recommend existing-host worker + FCM | Extend the existing supervised Backend only after review. For the first test, a bounded 30-minute, one-owner due scan (candidate 60s), persisted occurrence/budget/outbox and current-source rereads; existing Admin messaging capability behind a Port; one reviewed `firebase_messaging` dependency/platform change; Firebase project/package configuration and FCM send permission. | FCM is listed as no-cost, but storage/reads/egress and host availability are not thereby free or guaranteed. No new VM, cloud scheduler, function or vector service is required by this option. Exact project capability/IAM and current account billing are unverified. |
| D2: managed scheduler/worker | One Cloud Scheduler job invoking an authenticated managed worker plus approved datastore/outbox and FCM. Backend/private-model connectivity must be resolved without exposing Ollama publicly. | Cloud Scheduler lists 3 free jobs per billing account and USD 0.10/job/31 days otherwise; worker/database/egress are separate. This is a bigger topology/credential/billing change and is not the first recommendation. |

Pricing facts: [Firebase pricing](https://firebase.google.com/pricing),
[Cloud Scheduler pricing](https://cloud.google.com/scheduler/pricing).
These are provider list terms, not a current-account invoice or a claim of
zero total cost. No billing account, credential, token or registration was read.

Integration narrowed the first external proposal after the first draft: **one
LI-specified existing test account, one LI/SHI device, synthetic content and at
most one notification in each of foreground/background/ordinary-close states**.
No invitation of other people or broad pilot is proposed for this decision.

To respect the recommended 1/24h and 8h cooldown, choose either:

- **T1, recommend bounded evidence:** one normal-policy E2E contact. If separately
  approved, up to two transport-only diagnostics for the remaining device states,
  using fixed generic synthetic text, an expiring one-use operator permit and a
  maximum of one sender invocation per permit. They may reference the one
  canonical synthetic message but do not create more proactive messages or alter
  normal settings/budgets. No public diagnostic-send endpoint is proposed. Label
  evidence `trigger-policy E2E` versus `transport-only`; do not report three normal
  policy passes. Do not implement this bypass or send until the exact permit is
  explicitly authorized.
- **T2:** three normal-policy contacts on separate permitted days/times, preserving
  real clock, quiet interval and persistent budget. This avoids a diagnostic path
  but takes at least two rolling 24-hour intervals to demonstrate all three states.

Force-stop is documented as an unsupported state until manual reopen, not a
fourth positive send. No fake time, foreground timer or local-only notice is a
substitute. Each actual send still needs the named device/state authorization.
Transport-only permits waive only the normal trigger/frequency requirement for
their two explicitly authorized checks; they never waive master/category off,
consent, source validity, quiet/zone, installation binding or OS permission.

An earlier 20-account/7-day/140-occurrence, USD 5 pilot draft is retained here only
as a **future optional expansion**, superseded for the first decision by the
one-account package above. It is not the default ask and has no spending or
invitation authorization. Model/provider spending remains Runtime/Integration's
separate explicit selection, with no automatic cloud fallback.

### Proposed first-flow wire/storage contract

This subsection is the exact engineering proposal for Context/Integration to
reconcile. It is **not an amendment** to `api/`, the Firestore contract or Q14.
All authenticated owner identity comes from verified Firebase identity and the
existing binding; no request contains owner UID/accountId. Unknown fields are
rejected. UTC timestamps below use timezone-aware ISO 8601, revisions are
nonnegative safe integers, and identifiers are opaque. Raw registration values,
source IDs, request keys, delivery references and bodies never enter logs.

| Proposed operation | Exact minimal input / result and concurrency rule |
| --- | --- |
| `GET /v1/me/proactive-settings` | Owner-only settings plus `revision`; no private-source content or device registration value. |
| `PUT /v1/me/proactive-settings` | Full replacement with `expectedRevision`, `mode:on/off/paused`, optional `pausedUntil`, `categories`, `timeZone`, `quiet:{startMinute,endMinute}` or explicit disabled, `maximumInRolling24h:1/2`, `cooldownMinutes:480`, `pushEnabled`, `preview:generic/hidden`. Compare revision before no-op. An effective purpose/category/off/pause change advances grant generation; off cancels unstarted intents. Push opt-in does not grant cloud model processing. Return current representation/revision. |
| `POST /v1/me/proactive-intents` | `Idempotency-Key`: canonical UUID, also the proposed owner-scoped `intentId` so a lost ACK can be queried. Body: `conversationId`, `sourceMessageId`, `category:explicit_follow_up`, `dueAt`, `timeZone`, `processing:local`, `expectedSettingsRevision`. Cloud is rejected in this first slice unless separately selected in the reconciled LI decision. Server rereads source, topic, grants, zone and future due instant, then captures exact source/topic versions and min(source/topic cutoff, due+2h) expiry. No model call during creation. Store no new copy of the request text. While its command receipt remains live, same key + identical normalized command returns the same current intent; changed command conflicts. A terminal receipt returns terminal status without recreating work. No permanent key registry is claimed. |
| `GET /v1/me/proactive-intents/{intentId}` | Ordinary current-owner status read for known UUID; returns `intentId`, `revision`, state, due/expiry, category and topic only while permitted. Used after unknown create/cancel ACK; not an automatic retry. |
| `GET /v1/me/proactive-intents` | First slice returns the complete bounded active set, at most three intent summaries from the owner-state references. No cross-owner/global scan or copied source text. A larger/general list contract is deferred. |
| `DELETE /v1/me/proactive-intents/{intentId}` | JSON body `{expectedRevision}`; no competing header/query precondition. Compare revision first; cancel queued/reserved/prepared, advance once and remove active membership. Repeated matching terminal cancellation has no new effect. If dispatch may already have begun, return current `unknown/accepted` state with `recallPossible:false`, never claim notification recall. Does not delete the conversation/message. |
| `PUT /v1/me/proactive-registration` | `expectedRevision`, `installationRef` (the fixed server/operator-approved opaque reference for this named device), `registrationKind:fcm_token/firebase_installation_id`, opaque `registrationValue` (UTF-8 <=4096 bytes), and explicit `enabled:true`. Backend accepts only the selected SDK kind and the trusted one-owner/installation allowlist, rejecting every other owner/binding. Exactly one registration in this first test. Return only installationRef/revision/expiry/availability. No value echo, no public token lookup, no FCM topics or general cross-account transfer API. |
| `GET /v1/me/proactive-registration` | Current-owner metadata-only readback: revision, installationRef/expiry when present and availability. An absent row is explicitly unregistered/revision 0; an unknown read is 503, not unregistered success. Never return registrationValue or another owner's binding. |
| `DELETE /v1/me/proactive-registration` | JSON body `{expectedRevision,installationRef}`; no competing header/query precondition. Verify current owner and binding. Once the command commits, disable/erase backend registrationValue, advance revision and stop pending push. Sign-out/account replacement ends this fixed-account test; no new owner binding is accepted. An unknown/offline release may not yet be visible to the server, so it cannot guarantee immediate cessation. No new push attempt is permitted by the test driver until the release is resolved; accepted generic notices retain the recall limitation. |
| `PUT /v1/me/conversations/{conversationId}/read-state` | `expectedRevision`, `readThroughSequence`. Server verifies owner, live topic, existing committed currently authorized sequence; monotonically advance to max(current, requested), never past the highest currently authorized sequence. Return revision/readThroughSequence. Push accepted/received/clicked alone is not read. A stale/unknown write needs readback before another explicit command. |
| `GET /v1/me/conversations/{conversationId}/read-state` | Current-owner/live-topic readback of revision/readThroughSequence. A missing receipt starts at revision 0/sequence 0 without fabricating historical read events. Deleted/expired/unavailable topic is 404; unknown read is 503. |
| Existing transcript / context read | Extend the approved owner message projection with a genuine assistant `origin:proactive`, trusted occurrence/category/cause card and source resolver refs under Context's allowlist. No `replyToUser`, fake user row, or inclusion as a complete historical pair. Replies resolve the trusted owner/topic/target first and enter the normal real-user flow. Existing search/deletion remain. |

All mutation preconditions above have one explicit body field. Proposed error
semantics follow the existing safe boundary: unauthenticated 401, unavailable
own target 404 without ownership disclosure, changed expected revision 412,
changed command under the same key 409, and unknown dependency/outcome 503 with
ordinary status readback. No raw vendor error or automatic resend is returned.

Proposed Firestore paths/fields below are new schema **candidates**, not created
collections. Keep them behind Backend Ports; Flutter gets no direct Firestore
access. For this one-owner validation, the server has a trusted allowlisted owner
and at most three known references, so no global due index/collection-group scan
or new distributed scheduler is needed.

| Proposed record | Minimal fields and lifetime |
| --- | --- |
| `accounts/{owner}/proactive_state/current` | `revision`, `grantGeneration`, settings fields above, `activeIntentIds` (max 3), `inFlightOccurrenceId?`, `lastAttemptedAt?`, and complete `rollingAttemptTimes` for the whole current window (the supported maximum cap is 2). Never truncate unexpired attempts when switching between cap 1/2 or changing zones. No source bodies. Current authority for reservation/budget; prune expired timestamps only after evaluating the old budget in the transaction. |
| `accounts/{owner}/proactive_occurrences/{intentId}` | **One record combines intent, effect and outbox**: `revision`, `state`, `conversationId`, `sourceMessageId`, `category`, `dueAt`, `expiresAt`, `timeZone`, `processing`, `settingsRevision`, `grantGeneration`, `authorizationScope` (trusted non-token session/purpose epoch), `topicLifecycleVersion`, required `{kind,id,version,useCategory}` dependencies, `createdAt`, optional `messageId/messageSequence`, `attemptedAt`, `providerAcceptedAt`, `registrationRevision`, `dispatchState:not_started/dispatching/accepted/unknown/skipped`. No raw prompt, generated result, registration value or cached push payload. Invalid/deleted-source metadata is removed after dependent content is made unavailable. Terminal minimize to non-content effect identity/state/times until the containing topic expires, then inaccessible and cleanup within 24h; this retention needs LI approval. |
| `accounts/{owner}/proactive_registration/current` | `revision`, `installationRef`, selected `registrationKind`, `registrationValue`, `enabled`, `registeredAt`, `expiresAt`. For the first test, expire no later than the named 30-minute test window + 15min, and disable/erase on completion/withdrawal/sign-out. Do not retain previous registration values. Backend erasure does not promise immediate Google backup deletion. Do not delete shared Firebase Auth/Core installation state as a cleanup shortcut. |
| `accounts/{owner}/conversations/{topic}/read_state/current` | `revision`, monotonic `readThroughSequence`, `updatedAt`; never advances `lastPersistedMessageAt`. No independent private history. Delete with the topic. Unread derives only from currently authorized available proactive messages after this sequence; use an unread dot if a complete count is unavailable. |
| Existing canonical message and source provenance | Server-assigned sequence/messageId, role assistant, explicit proactive origin, accepted text, occurrenceId/category and approved minimized provenance. An internal `appendProactive` operation checks original topic cutoff and versions, appends once, and **does not advance the old anchor under R-ANCHOR**. It cannot call the existing user/assistant-pair saver with an invented user. Existing serializers/resolvers/retention logic must be explicitly adapted and independently reviewed. |
| Optional test-only `accounts/{owner}/proactive_transport_diagnostics/{permitId}` | Only if T1's extra two sends are expressly approved: `revision`, `installationRef`, `canonicalMessageId`, `permittedDeviceState:background/ordinary_closed`, `expiresAt` at the named window end, `attemptLimit:1`, `state:not_started/dispatching/accepted/unknown/skipped`, `attemptedAt?`, `providerAcceptedAt?`. Operator-created, no public create/send endpoint, at most two records. Claim dispatching atomically before one sender invocation; unknown never replays. Reauthorize the referenced canonical message and all normal non-frequency permissions before send. No model call, new assistant message, raw packet or registration value. Minimize/delete this diagnostic metadata within 24h of test end; no general diagnostic retention is authorized. |

The owner-local registration singleton is **not proof of global installation
uniqueness**. This first contract relies on the trusted fixed owner/device gate
and refuses transfers. A general app rollout needs a separately specified global
installation-binding uniqueness/index and online/offline replacement lifecycle;
changing a client UUID must not grant transfer authority. The short registration
lease, generic text/TTL0 and current-owner click checks reduce consequences but
do not make an offline sign-out visible to the server instantly.

Idempotency is guaranteed only within the live command/effect receipt lifecycle
and this gated 30-minute test. Once a terminal receipt is removed it is not a
global forever-used nonce registry. Old same-command requests are independently
rejected once their due/source/topic is expired; unknown writes require readback,
and a new explicitly confirmed intent requires a fresh key. No old key is reused
for another request, diagnostic or automatic retry.

The intent is one-shot: before reservation, an edited source can replace the
queued candidate only through a fresh authorized preparation/version update.
Once generation has begun, a source/grant change discards old text and ends that
occurrence; the first slice has at most one model call per occurrence, not a
regeneration loop. No code in this candidate implements a queued update API.

Transactions and recovery proposed for this schema:

1. Create/cancel/settings/registration commands reauthorize current owner and
   compare expected revisions. Create and bounded active membership change in
   one transaction. No model/network calls occur inside transaction callbacks.
2. Before generation, fresh-read Context/grants; atomically compare their versions,
   queued occurrence, owner settings and owner budget, then claim reserved. A
   concurrent worker must lose the compare and reread. The claim is not granted
   by this module's pure `allow` return.
3. After generation, repeat Context checks. Atomically append the true proactive
   message/provenance, set occurrence `state:published` and `publishedAt`, create
   `dispatchState:not_started` (or `skipped` for in-app-only), charge one contact
   frequency slot and record installation revision. The final wire adapter must
   distinguish the accepted canonical message from its provider dispatch state;
   `published` is a Proposed production state, not a claim that the current pure
   reducer already implements this persistence protocol. Admission ledger
   projections must use the canonical contact-commit time without charging again
   on provider submission.
   Recheck the existing topic's original expiry; do not recreate an expired topic.
   Source/grant/topic invalidation and this commit need compatible version fences.
4. Before the external sender invocation, re-read the occurrence and current
   installation, permission/purpose, quiet/zone and source authority again. If
   invalid, skip the unsent push and apply current content invalidation. Only a
   successful atomic CAS `dispatchState:not_started -> dispatching` with
   `attemptedAt` grants the one-use sender capability; one winner invokes the
   provider. No second worker may claim an already-dispatching record. This is a
   fresh source/channel guard over the published receipt, not replaying generation
   or invoking pure preflight on an already-dispatching ledger. Send only the generic
   envelope. Commit provider acceptance as a status; a timeout/crash means unknown.
   No provider acceptance is interpreted as device receipt or an unread mutation.
5. Restart: scan only trusted active references; queued work reevaluates if still
   valid; interrupted unpublished reserved/prepared output fails without
   regenerating. A published canonical message with outbox `not_started` is
   provably not submitted by this protocol and may be chosen for dispatch only
   after all fresh guards; it needs no saved raw generation output. Outbox
   `dispatching` becomes unknown without send replay. Current reads enforce
   deletion/expiry before cleanup. Automatic transaction retries may only reread
   fences, never repeat the model or provider call. Limit retry attempts in the
   eventual adapter so the operation estimate stays bounded.

The post-commit/pre-send guard still cannot make a later external display atomic
with a source deletion/quiet boundary; use generic text/TTL0 and authenticated
click checks. Source revocation must also invalidate the canonical message, not
merely cancel its notification. D1's process must cancel timers on shutdown and
stop the one-owner scan at its test-window end. No new always-on deployment is
implied by a 30-minute test harness.

### Small-scope operation and cost estimate — Proposed

Source evidence in `tool/run_real_account_local.mjs` and
`backend/src/bootstrap/retained-core-runtime.ts` shows the real-account/group
launcher rejects Emulator endpoints and composes remote Firebase. Therefore use
a **cloud Firestore** estimate for that path, even when Qwen runs locally.
Integration still must match the running launcher and database region; this
worker did not read runtime credentials/configuration or the billing account.

T1's proposed 30-minute one-owner test envelope has at most one canonical model
generation/message, three provider sender invocations total (one normal, two
separately permitted diagnostics), one registration and three explicit click
checks. No automatic provider retry. Estimated operations for the exact bounded
record/read approach above are:

| Work | Estimated document reads / writes / deletes |
| --- | --- |
| Readback + settings/registration setup | <=8 / 3 / 0 |
| One normal create, generation gate, publish, ACK and first click/read | <=30 / 10 / 0 |
| Two transport-only permit checks and result records | <=12 / 4 / 0 |
| Two extra authenticated click/read-state checks | <=16 / 2 / 0 |
| 30 due ticks, at most owner state + three known occurrence documents each | <=120 / 0 / 0 |
| Final readback, disable/restore settings and operational cleanup | <=10 / 3 / 4 |
| Base total | <=196 / 22 / 4 |

Reserve a conservative **512 reads, 64 writes, 16 deletes**, <=64 KiB of new
logical records/message data (plus measured index/record overhead), <=1 MiB
incremental database traffic and at most three <512-byte application notification
packets. This is a test resource ceiling proposal, **not an observed meter result**.
The estimates include repeated authority reads and a small allowance for
transaction conflicts; stop the run if the counters approach the bounds rather
than silently polling/retrying. Detailed adapter review may tighten/correct
the counts before execution. No broad background scan, listener, TTL/PITR/backup,
new database or index is included. Do not individually delete accepted messages
as “cleanup”; Q19's complete-topic deletion still requires its normal owner action.

Firestore bills document operations, some index reads, stored overhead and
egress; empty queries can still cost a read, and TTL deletes are not included in
free quota. [Firestore billing](https://firebase.google.com/docs/firestore/pricing).
For a transparent example only, the currently displayed Iowa list rates are
USD 0.03/100k reads, 0.09/100k writes and 0.01/100k deletes. The reserved document
operations would be `512*0.03/100000 + 64*0.09/100000 + 16*0.01/100000 = USD 0.0002128`
before storage/network. **This is not the current project's region or invoice.**
[Firestore regional pricing](https://cloud.google.com/firestore/pricing).

Recommend a conditional **USD 0.01 incremental non-model test allowance**, after
Integration substitutes the actual database-region/storage/egress rates and
confirms the operation bound fits. Do not request a plan upgrade/top-up, create
new cloud resources or treat account-wide free quota as available without
verification. If that conditional estimate cannot be established, continue
mock/in-app candidate work and hold this external test. Model cost remains a
separate Runtime-approved bound. FCM itself is listed no-cost. Alerts-only
budgets are monitoring, not a hard stop; this proposal relies on the explicit
attempt/window/operation bounds and a manual kill switch, not an assumed billing
cap. [Cloud Billing budgets](https://docs.cloud.google.com/billing/docs/how-to/budgets).

The concrete decision request is:

1. Select first scene (recommend explicit follow-up), limits choice A/B, quiet/
   timezone behavior, category opt-ins and generic/hidden preview.
2. Select retention/topic R-ANCHOR/R-SPLIT/R-EXTEND; approve true proactive origin and initial
   assistant-only read/write semantics. Do not use the existing user-send API as
   a workaround.
3. Select D0/D1/D2 and whether Google may process minimized registration/routing
   metadata. For D1, authorize the specific Firebase project/package and reviewed
   dependency/platform changes, minimal send permissions, installation-owner
   binding and deletion lifecycle. No credentials in chat or Git.
4. Approve the reconciled exact intent/effect-outbox/registration/read-state
   contract proposed above and in Context's appendProactive/source resolver
   appendix, including the new candidate paths, concurrency, expiry and cleanup.
   No normative API/schema, index or migration has been changed here.
5. Select T1 or T2 and name the one existing test account/device, synthetic source,
   allowed device state(s), window and <=3 sender invocations. For T1 explicitly
   distinguish the one normal E2E contact from <=2 one-use transport-only permits.
   Approve the measured-region conditional resource/cost bound; no broad pilot.
   LI/SHI perform physical-device checks through Integration. No notification,
   registration upload or device write is currently authorized by this proposal.

All five are input to Integration's one consolidated LI decision, not separate
worker questions or a reason to stop isolated policy work.

## Source validation and remaining evidence

Files: `backend/src/proactive/policy.ts`, `lifecycle.ts`,
`backend/test/proactive/policy.test.ts`, this document. No manifest/lockfile/API/
Firebase/platform/service files changed. The ignored `node_modules` symlink
reuses existing pinned installed dependencies read-only; no install/update ran.

Pinned commands from owner-local `toolchain.json`:

```text
<node24.19.0> <existing-typescript7.0.2>/bin/tsc --project backend/tsconfig.json
<node24.19.0> --test --test-reporter=tap backend/dist/test/proactive/policy.test.js
git diff --check
```

The whole strict TypeScript project compiles. The targeted synthetic suite has
**29/29 passing cases**: explicit confirmation/time; off/category/consent/topic/
intent invalidation at both phases; scope/source-set binding; missing/unknown
reads; source observation freshness; source edit/delete; local-only data refusal for cloud; generated proof
binding; snapshot freshness; Going vs Interested; Check-in opt-in/historical time;
cross-midnight/zone change/both DST transitions; quiet expiry; rolling cap and
cooldown; invalid ledgers; same/competing occurrence; unknown ACK/recovery;
cancel-before/after dispatch; offline expiry; failed generation; malformed limits.

Initial build failed with TS2367 in the test assertion helper: `assert.equal`
already narrowed the union, making its subsequent `!== 'allow'` condition
impossible. Removed only that redundant condition; build then passed.
Review then exposed a real candidate bug: an occurrence/grant-only generation
proof could be reused after source revision refresh. A new counterexample
reproduced `allow` instead of `generation_stale`. Binding a frozen original
candidate/source snapshot corrected it. QA source review then identified that a
fresh envelope could carry an arbitrarily old non-event source observation;
the new counterexample reproduced `allow` instead of `authority_stale`. The
per-source age check now uses the same proposed freshness bound, separate from
the source's historical recorded time. Pause/quiet tests now explicitly supply
fresh source observations after advancing their fake clock. The final full
targeted run passed all 29 cases, including a separately replaced topic with an
old generation proof. No production or platform evidence is inferred.
Owner-local raw logs retain both failures and final output under
`/home/miku/.local/state/enmori-ai-companion-20261025/proactive/`:
`build.log`, `generation-proof-before.tap`, `stale-source-before.tap`,
`build-final.log`, `policy.tap`.

No claim is made for production persistence, real service/model, FCM API access,
foreground rendering, background/closed-device delivery, real restart atomicity,
APK, native click/unread, TalkBack, iOS, cross-network, UAT, Release or Done.
QA must independently review the exact commit and the gaps above. Existing v26
history/search/language/calendar evidence remains a separate historical layer.
