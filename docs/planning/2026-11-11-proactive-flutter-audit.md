# OpenAI scheduled follow-up — Flutter and notification audit

Date: 11 November 2026. Audited source: `492ad5975e48ae8a596de839c985201fdad81049`.

Initial status: implementation preparation. The [recovery decision](../decisions/2026-11-11-li-onepa-proactive-recovery.md) assigned the existing feature repair; the Backend proposal at `0731ac3` initially required LI confirmation. LI subsequently [approved that exact minimal contract](../decisions/2026-11-11-li-openai-proactive-integration.md). The implementation and fake verification below follow that decision. No account setting, consent, schedule, registration or device permission was changed by this work.

## Demonstrated client gap and smallest changes

| Source | Current evidence | Proposed bounded change after contract confirmation |
| --- | --- | --- |
| `lib/app/bootstrap.dart`, `validOpenAiTestAppSelection` | Explicitly rejects `openAiTestApp && companionFirstFlow` before Firebase bootstrap. | Permit their approved combination while retaining real remote-account identity and the exact existing HTTPS Azure origin allowlist. Capability configuration must not enable account switches or SDK token collection. |
| `lib/app/controlled_demo_app.dart`, proactive repository override | Conversation and Persona receive `aiProcessing`; the proactive repository does not. | Inject that same immutable composition selection into the proactive HTTP adapter. No independent provider choice or fallback. |
| `lib/features/proactive/data/http_proactive_repository.dart`, `createIntent` | Exact original command sends `processing: local`. IDs, revision, IANA zone, canonical UTC instant and Idempotency-Key are already validated. | Preserve the local exact shape. Only the approved OpenAI composition sends `processing: cloud`, `provider: openai`, `disclosureVersion: openai_cloud_v1`. Keep response shapes and unknown-command recovery unchanged. Do not add a Groq proactive branch. |
| `lib/features/proactive/proactive_providers.dart` | Source review, new intent and non-off mode changes check optional-purpose consent only. | New OpenAI source review/create and mode on/resume additionally require the current OpenAI disclosure grant. Recheck after token acquisition and retire in-flight review on withdrawal/provider mismatch. Preserve admitted unknown command IDs for readback. Off and cancellation remain available; existing purpose restrictions still apply. Pause must not accidentally acquire an extra cloud prerequisite merely because the old condition is `mode != off`. |
| `lib/features/proactive/proactive_notification_controller.dart` | Explicit push enable and token rotation perform repeated fresh settings/revision checks, but only inspect optional-purpose consent. Cloud withdrawal invalidates the revision grant but does not trigger the existing confirmed-binding release path. | Add the provider gate to new effect admission, permission-return checks, token/register/rotate checks. On observed withdrawal, retire the grant and use existing owner/installation/CAS release and serialized SDK deletion. Do not auto-enable, auto-register, or clear unknown fences on reacceptance. |
| `lib/features/proactive/presentation/proactive_follow_up_page.dart` and `proactive_settings_page.dart` | Both display literal “Local model”. Follow-up rows themselves use neutral lifecycle wording. | Show the current processor for new confirmations; explain the existing cloud consent prerequisite. Keep old rows neutral because IntentView deliberately contains no processing field. Do not promise that cancelling an admitted cloud request physically stops or refunds provider work. |

No changes are needed to the public intent response, settings response, device registration response, existing source IDs, due instant, IANA zone, quiet-hour algorithm, retention, local notification channel, Android dependencies or the one-current-installation contract.

## Separate effect consent from existing-source reads

`AiClientProcessing.allowsCloudConsent` already distinguishes OpenAI disclosure acceptance from the historical Groq grant. Reuse that predicate with optional-purpose acceptance; no new consent enum or inferred acceptance is needed.

The notification controller's `_consent`, `_guardConsent` and `_call(needsConsent: true)` also protect delivery-reference resolution. They must not be widened indiscriminately. Opening an opaque delivery reference retains the existing exact owner/session and optional-purpose checks, then relies on Backend source/receipt authorization. A local `source_use_v2` history item must not become unreadable solely because this build selects OpenAI. A revoked OpenAI `source_use_v3` item remains unreadable through the existing original-generation receipt check. This split was checked with the Backend owner while reviewing the proposal.

The follow-up management route cannot be wrapped wholesale in the chat cloud-consent gate: users need readback, off and cancellation after withdrawal. New effects require their own narrow checks. Client checks are an early rejection boundary; the Backend remains authoritative for current consent generation, source lifetime, scheduling and dispatch.

## Existing native notification chain

1. `bootstrap.dart` reads the existing random no-backup installation UUID only when the companion capability is selected. `proactive_messaging_composition.dart` requires a valid installation, messaging Port, repositories and resolver; ordinary launch does not request permission, fetch a token or register a device.
2. `enablePush` reads current own Settings and proactive settings, asks for Android permission only after an explicit user action, rechecks settings after foreground return, prepares the existing channel, gets a token, then performs the existing revisioned registration. Every later token rotation requires the original explicit grant and fresh settings/permission/ownership checks.
3. `FirebaseProactiveMessagingPort` keeps FCM auto-init disabled and serializes native token operations until their physical futures settle. The native channel is `enmori_requested_followups`, with private lock-screen visibility. Android notification permission is present in the Firebase Messaging plugin manifest; its absence from the app's main manifest is not a demonstrated defect.
4. Initial/background notification taps accept only a payload containing the opaque `deliveryRef`, resolve it through the owner API, recheck the original session and navigate to the existing message route. No source text, copied credential or inferred read receipt comes from the notification payload.
5. There is no `FirebaseMessaging.onMessage` foreground banner handler in this source. That observation is not authority to add a new foreground notification mechanism. Saved replies, foreground display, system notification arrival and notification taps need separately named acceptance evidence.

The existing one-installation contract, 30-day registration lease, TTL-zero/no-retry sender and explicit permission/channel state remain material to two-month operation. A two-month delivery plan cannot imply that an installation remains registered beyond its lease without the existing explicit renewal/registration flow. The root operational plan owns hosting, cost, service recovery and longer-running availability decisions.

## Singapore and Australia time handling

The UI already resolves an explicitly entered civil date/time in an IANA zone to a UTC instant, shows the offset and UTC result, rejects gaps, requires an explicit choice for folds, and asks the user to keep or replace the selected zone when the device zone changes. An enabled category whose stored zone differs requires a separately acknowledged settings change before intent creation; that ACK does not automatically schedule anything.

Keep this contract for Singapore and Australian teachers. Do not assume an Australian zone, silently convert a stored occurrence when travelling, or equate the device zone with the user's confirmed zone. Verify `Asia/Singapore` and at least the intended Australian teaching location's IANA zone once that location is known. Existing DST tests are useful source evidence, not a real Android timezone test.

## Focused verification plan

| Boundary | Required regression evidence |
| --- | --- |
| Composition and HTTP | Approved OpenAI+companion combination accepted only on the existing pinned remote origin; local exact body unchanged; OpenAI exact tuple; no Groq fallback; IDs/idempotency/UTC and strict response checks retained. |
| Controller consent | Missing, Groq-only, declined and withdrawn OpenAI grants prevent new create/on/resume; withdrawal during token acquisition performs no create; admitted unknown command remains checkable; off/cancel remain available; pause keeps its original purpose boundary. |
| Notification effects | No token/permission/registration before explicit enable; current OpenAI grant required at enable and rotation; withdrawal during permission return, token await and registration ACK retires the operation without automatic replay; current confirmed binding is released without touching another installation; reacceptance does not automatically register. |
| Delivery reads | Legacy local reference can still use its existing authorized resolver after current cloud decline; revoked cloud receipt returns the existing Backend failure; late resolver or same-UID replacement cannot navigate; unknown fences and source privacy remain closed. |
| UI and time | New confirmation labels OpenAI; old rows stay neutral; unavailable grant has a clear settings action; off/cancel stay reachable; Singapore civil/UTC confirmation, Australian DST fold/gap and device-zone change keep existing explicit behavior. |
| Native lifecycle | Retain no-auto-init, denied permission/no token, channel-disabled, serialized late delete/get, foreground-return, installation transfer, lease-expired and exact-session click tests. |

Baseline command in the isolated Flutter checkout:

```text
fvm flutter test test/features/proactive test/app/companion_first_flow_router_test.dart test/app/proactive_messaging_composition_test.dart test/app/controlled_account_configuration_test.dart
```

Result: **114/114 passed** at `492ad597`. This is fake/adapter/widget source evidence. It is not evidence of OpenAI scheduled execution, Firebase registration, actual FCM delivery, APK installation, physical-device behavior, or sustained two-month operation. The audit made no cloud requests or writes.

## Implemented under the confirmed minimal contract

The client now composes the approved OpenAI+companion capability on the unchanged remote-origin boundary. It forwards the exact cloud tuple only for new OpenAI intents; the local request remains exact, and unsupported Groq creation sends no request. Existing response parsing, revision preconditions, original idempotency keys and read/cancel shapes remain unchanged.

New intent/on/resume and push enable/rotation check current OpenAI plus optional-purpose consent. Protective pause retains its original optional-purpose requirement; off/cancel/registration deletion have no added cloud requirement. The controller listens directly to the authoritative Settings snapshot for immediate withdrawal retirement, rather than waiting for a derived presentation provider to refresh. An already admitted unknown intent remains available only for original-ID readback and cancellation, not automatic replay.

Notification consent checks now observe a fresh non-stale Settings revision before rejecting a prior expected revision. This makes a newly observed server-side withdrawal retire the old grant and invoke the existing confirmed-owner/installation release path. No old revision may replace a newer observation; no rejected effect continues after observation. Unknown registration ACKs preserve their fence until explicit current-status verification. Reacceptance does not enable push or register a token.

New confirmation and management copy identify the current processor, while old rows remain neutral. A consent notice links to existing AI Settings without wrapping the whole management route in the chat gate. The opaque delivery resolver retains original purpose/source authorization. The existing composed chat/message page still has its pre-existing `AiConsentGate`; reaching the resolver's verified target after cloud withdrawal does not establish that the phone will display legacy local message text without that page gate. No new read-only message interface was added.

Final focused command adds `test/app/controlled_demo_app_test.dart` to the baseline command: **140/140 passed**. This includes exact local/cloud request mapping, full composition wiring with no automatic enrollment, wrong/missing provider grants, token/permission/registration-ACK withdrawal, protective controls, original unknown-key recovery, fresh rotation withdrawal cleanup, legacy source resolver access and revoked-receipt rejection, neutral old rows, and a confirmed Sydney civil/UTC instant. Existing Singapore, DST fold/gap, zone-change, lifecycle, one-installation and permission tests remain passing. The original OpenAI composition test's MockClient assertions now use `expectSync`: asynchronous callbacks could otherwise collide with `tester.tap`'s guarded test scope and be mistaken for a service failure. No production account/network code was changed for that test issue.

Android is the current delivery target. These tests do not prove real Android timezone conversion, FCM arrival, model execution, iOS readiness, sustained service availability or a two-month device-registration lifetime.
