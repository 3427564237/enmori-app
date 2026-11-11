# OpenAI scheduled follow-up integration — source and isolated evidence

Authority: [LI's approved minimal integration](../decisions/2026-11-11-li-openai-proactive-integration.md) and its [exact proposal](../planning/2026-11-11-openai-proactive-integration-proposal.md). This supplements the earlier local F0 contract; it does not replace its timing, frequency, source, retention or notification rules.

Implementation candidates: `91d5030` and protective push-disable correction `a18c183`.

## Result and boundaries

The cloud composition uses the same `BoundedAiRuntime`, `CloudAdmissionOwner`, quota and monetary owner as chat and Persona preview. No second runtime, financial ledger, lease schema, provider or dependency was added. Cloud execution returns a logical result and leaves unknown physical outcomes and their monetary holds with the existing shared owner. Count and inference use the original F0 prompt builder and dated historical quotation; no fake new user message is saved.

`POST /v1/me/proactive-intents` retains its original local request. OpenAI requires `processing: cloud`, `provider: openai`, `disclosureVersion: openai_cloud_v1`. The existing `proactive_occurrences` row adds those provider fields and the server-captured original `cloudAiConsentGeneration` only for cloud intents. Original purpose generation remains encoded in `authorizationScope`. Create idempotency includes the processor tuple; old local occurrences are never reinterpreted as cloud.

Publication keeps the existing atomic message, receipt, topic sequence, occurrence and rolling-frequency charge. Cloud receipts use existing `source_use_v3` with original purpose/cloud generations and provenance. Management readback retains owner, purpose, source and Persona validation without adding a current-cloud-consent condition; effect checks always require the original cloud generation. Canonical source resolvers retain their existing receipt authorization rules.

Fresh checks run before model preparation, provider Count/inference, candidate delivery, canonical publication and the post-credential FCM claim. The cloud consent lease remains held until final notification processing completes. The 45-second execution bound, UTC/IANA time, due-plus-two-hour/topic expiry, one-per-24-hours and 480-minute cooldown, max-three active intents, quiet hours, one installation, 30-day registration, opaque `deliveryRef`, TTL-zero single FCM POST, and no retry remain unchanged. Reserved/prepared restart work fails without regeneration; interrupted dispatch is unknown without resend.

Turning on/resuming, new cloud intents and registration enable/rotation require current optional-processing and OpenAI consent. Pause/off/cancel/delete retain protective behavior. A strictly unchanged settings update except push true-to-false also remains available after cloud withdrawal; it cannot carry a changed zone, quiet window or preview.

## Composition configuration

The existing private `ENMORI_OPENAI_TEST_APP_CONFIG` accepts one optional `firstFlow` field:

```json
{"audience":"registered_accounts","worker":{"mode":"service","intervalMs":60000},"push":{"leaseDurationMs":2592000000}}
```

Absent means no proactive worker. Any other shape is rejected. No new build define or environment key was introduced. Private deployment claim tooling must retain this optional field when a separately authorized deployment eventually selects it; this source change does not arm it, extend a grant, alter the US$3.40 cap, or take over a runtime owner.

## Verification

Pinned Node 24.19.0 / repository TypeScript build passed. Full Backend regression after the protective correction passed 1896/1896. Azure configuration/lifecycle tests passed 6/6. A separate agent reviewed the candidate and protective correction, independently running the cloud execution, Firestore store, HTTP routes and OpenAI runtime subset: 87/87 passed.

Five actual Firebase Admin SDK tests passed on the guarded, temporary `demo-enmori-rmvp01a-r10` Auth/Firestore emulators:

1. Create captures server generation; publication commits one v3 receipt, original topic expiry and server timestamps; duplicate publication cannot create another message.
2. Withdrawal/reaccept rejects an original reservation while metadata read/cancel/off remain available.
3. A lost publication ACK keeps exactly one committed message; restarted recovery cannot regenerate it.
4. A replacement runtime epoch rejects the old owner's creation with no occurrence.
5. Cloud withdrawal permits strict push-off with mode still on, while zone changes and re-enabling stay denied.

Run the focused SDK proof after compiling:

```sh
FIREBASE_EMULATORS_PATH=/path/to/approved/emulator/cache node tool/run_cloud_quota_emulators.mjs --proactive
```

The runner reuses the existing isolated credential-profile and loopback-only demo-project guard. Each test removes only its own synthetic account, binding and related documents and restores its matching marker. The runner shut down its emulators; ports 8080, 9099, 4400, 4500 and 9150 were verified released. Early fixture-only failures were corrected without relaxing implementation checks: the scheduling clock now starts after real source commits, and expected R-ANCHOR uses the existing last non-proactive assistant commit time.

Local logs: `/tmp/proactive-backend-final.log`, `/tmp/proactive-azure-tests.log`, `/tmp/proactive-emulator.log`, `/tmp/enmori-independent-openai-proactive-review.log`. Logs are execution evidence, not committed credentials.

No paid model invocation, real FCM notification, cloud mutation, deployment, account consent/schedule enablement, APK installation or physical-device acceptance occurred in this slice. The existing monetary grant freshness and explicit owner-claim lifecycle still govern availability. This evidence does not establish two-month unattended operation or actual OpenAI follow-up semantic quality/latency.
