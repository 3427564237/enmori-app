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

Conversation layout A/B/C remains LI's separate choice. The first flow can use
the existing conversation container semantics with a new explicit origin; it
does not remove history/search/delete or merge old content.

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
| Expired trigger / source | Drop old occurrence | Never send late backlog |

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

The candidate has no persistence adapter, collection names, field/ID scheme,
indexes or scheduling process. Atomicity, a durable restart, multi-worker races,
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
| D1: recommend existing-host worker + FCM | Extend the existing supervised Backend only after review. A bounded server due scan (candidate 60s), persisted occurrence/budget/outbox and current-source rereads; existing Admin messaging capability behind a Port; one selected `firebase_messaging` dependency/platform change; Firebase project/package configuration and FCM send permission. | FCM is listed as no-cost, but storage/reads/egress and host availability are not thereby free or guaranteed. No new VM, cloud scheduler, function or vector service is required by this option. Exact project capability/IAM and current account billing are unverified. |
| D2: managed scheduler/worker | One Cloud Scheduler job invoking an authenticated managed worker plus approved datastore/outbox and FCM. Backend/private-model connectivity must be resolved without exposing Ollama publicly. | Cloud Scheduler lists 3 free jobs per billing account and USD 0.10/job/31 days otherwise; worker/database/egress are separate. This is a bigger topology/credential/billing change and is not the first recommendation. |

Pricing facts: [Firebase pricing](https://firebase.google.com/pricing),
[Cloud Scheduler pricing](https://cloud.google.com/scheduler/pricing).
These are provider list terms, not a current-account invoice or a claim of
zero total cost. No billing account, credential, token or registration was read.

For D1, propose a **7-day, at most 20 explicitly invited accounts, one chosen
device each, at most 1 occurrence/account/24h and 140 occurrences total** pilot.
At most one model generation per occurrence, with no automatic cloud fallback or
unknown-send replay. Proposed incremental non-model cloud spend limit: **USD 5
for this pilot**, with a service kill switch/counters; no purchase, plan upgrade
or auto top-up. Model/provider spending remains Runtime/Integration's separate
explicit selection. Billing alerts alone must not be described as a hard cap.
Before use, Integration must produce an operation/read estimate for the exact
approved schema and scan/index design; the USD 5 is a proposed authorization
ceiling, not an unmeasured cost estimate.

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
4. Approve a precise minimal intent/effect/outbox/registration/unread persistence
   and API contract with concurrency, expiry, deletion and cleanup semantics.
   This note selects no collection names, DTOs, indexes or migration.
5. Approve the 7-day pilot resource ceiling and a named test account/device,
   synthetic content and at most one send per requested device state. LI/SHI
   perform the physical-device checks through Integration. No notification or
   device write is currently authorized by this proposal.

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
fresh source observations after advancing their fake clock.
Owner-local raw logs retain both failures and final output under
`/home/miku/.local/state/enmori-ai-companion-20261025/proactive/`:
`build.log`, `generation-proof-before.tap`, `stale-source-before.tap`,
`build-final.log`, `policy.tap`.

No claim is made for production persistence, real service/model, FCM API access,
foreground rendering, background/closed-device delivery, real restart atomicity,
APK, native click/unread, TalkBack, iOS, cross-network, UAT, Release or Done.
QA must independently review the exact commit and the gaps above. Existing v26
history/search/language/calendar evidence remains a separate historical layer.
