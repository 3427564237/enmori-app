# JIN ongoing controlled phone service — operator handoff

Authority: [LI bounded construction handoff](https://github.com/3427564237/enmori-app/blob/0adb9a5b29605f5c8dba758a8e8383e4ba2e3e89/docs/decisions/2026-10-15-li-team-update-bounded-acceptance.md), [current phone/service assignment](https://github.com/3427564237/enmori-app/issues/44#issuecomment-6186177558), existing #84 assignment and accepted #105/#112/#114 interfaces. JIN owns Backend construction; SHI reviews new code; LI reviews evidence, operates the controlled model/device, and supplies the app/APK composition. This packet does not change those roles.

This is an ongoing **isolated, synthetic-owner, process-lifetime** service candidate. It stays available after an individual request or phone disconnect, retains the owned Account/Persona/conversations across sign-ins and repeated requests, and ends only after explicit stop and confirmed drain/cleanup. It is not the #115 one-journey fixture, a public deployment, cloud datastore, production account service, reboot-persistent datastore, or proof of a 90-day/+24-hour operational SLA. Do not transfer #115's device/model result to this source.

## Source and usable boundary

The service uses the unchanged approved Firebase identity verifier, Account/Profile/Settings producer (including purpose revocation generation), Persona repository, asynchronous Conversation Application, real store/control/fences, finite semantic policy and hourly maintenance. All six existing Conversation operations and six Persona operations retain their existing contracts. OpenAPI, route inventory, dependencies, ordinary bootstrap, Flutter, shared Home/router and Android are unchanged.

- New factory: `backend/src/bootstrap/controlled-phone-service.ts`. It is not imported by the ordinary entrypoint. Typed input accepts the actual validated environment, exclusive owned-Emulator assertion, explicit generation transport and complete-input compiler. Returned capabilities are `app`, content-free `observation()`, private `privateHandoff()` and `stopAndClean()`.
- New operator: `tool/controlled_phone_service.mjs`. It composes the existing pinned tokenizer/Qwen adapter, existing Linux private-profile/Emulator guard, and existing loopback HTTPS edge pattern. It has no device install, ADB, model download, preload, fallback, automatic content generation or new public health endpoint.
- Served meaningful surfaces: existing authenticated Account/Profile/Settings reads/writes, completed onboarding read, Persona CRUD/selection, and Conversation prepare/execute/cancel/outcome/history/delete.
- New onboarding, Check-in writers, source readers for real Notes, Interest, Friend, Event and History consumers are **not supplied by this bounded service**. Existing unrelated registered operations fail closed; their presence is not functionality. LI must retain the selected app scope rather than interpret this as the whole network baseline.
- Only the freshly owned synthetic Auth identity is admitted. Startup requires empty owned Auth and Firestore Emulators, including no orphan collection/runtime fence. Existing data is refused, never wiped to make startup pass. Note emptiness is established only for this exclusively owned fixture with no source writer, not DU operational authority.

## LI private configuration and launch

Use the existing controlled Linux host, locked Node 24.19.0/Admin 14.3.0/Firestore 8.7.1/CLI 15.29.0/Emulator 1.22.0 and cached verified JAR. Use the existing private formal9B model/tokenizer binding and TLS mechanism; no new credential or model selection is requested. The original model lease must actually be settled. An old unconfirmed invocation cannot be bypassed by a fresh process.

Build the candidate with the pinned compiler first. The private JSON keeps the four existing fields from the accepted operator: `controlledHostVerified`, `existingHostGenerationLeaseSettled`, `binding`, `tokenizerFiles`. Replace its optional `mobile` section with:

| Private operator field | Required value |
| --- | --- |
| `phone.certificatePath` | Absolute path to LI's existing-mechanism PEM certificate; regular file, at most 16 KiB. |
| `phone.keyPath` | Absolute private PEM key path; regular non-symlink, current operator owner, no group/other permissions, at most 16 KiB. |
| `phone.sessionDirectory` | Canonical absolute **existing empty** directory owned by the operator, mode 0700, not a symlink. Keep outside Git/cloud sync. |

The model configuration is accepted on stdin only. The launcher starts exclusive Auth/Firestore on the existing 9099/8080 ports and existing 4400/4500/9150 support ports; all must be free. It creates two fresh private credential profiles. It verifies the locked SDK/cache, model read-only preflight and a complete synthetic-input tokenizer/compiler readiness check before publishing the private handoff. No content generation is performed by startup.

```sh
node node_modules/typescript/bin/tsc --project backend/tsconfig.json
node tool/controlled_phone_service.mjs --live-existing-host < "$PRIVATE_CONFIG"
```

Keep this foreground operator alive. Do not use a new daemon/supervisor or export/import data. CLI stdout/stderr is withheld from the public console; readiness and exit receipts are in the private session directory. Caller configuration, TLS files and that directory remain LI-owned and are not automatically deleted by JIN's tool.

## Readiness and phone handoff

Read `status.json` separately from `handoff.json`:

- `status.json` is content-free: service phase/admission, model/compile/call counts, quarantine, maintenance result, read-only host/tokenizer preflight snapshots and stop/cleanup state. `running` is not a promise that a future model reply passes the finite semantic gate. Every request retains the existing complete-input, fresh authority, 60/5/45 and candidate gates. Dependency failure does not invent an assistant or disable independent Profile/Persona operations.
- `handoff.json` is **private**, mode 0600. It contains the owned synthetic email/password, project ID, dynamic loopback HTTPS base URI, public certificate bytes and Auth Emulator address. It is an operator handoff, not an API DTO or APK asset. LI adapts this to the existing native Auth/client configuration and owns only the applicable Auth/HTTPS device-specific ADB reverses; do not expose or reverse the Firestore port. JIN performs none.
- This handoff deliberately is not the #115 two-minute test-configuration DTO. Credentials are valid only while the owned synthetic service identity exists; stop removes the handoff and then deletes the identity after safe drain. Never embed them in the ordinary APK or reuse them for real accounts.

No request count or test-end callback closes the service. The controlled session retains its data while this operator and its owned Emulators remain alive. The phone may disconnect/reconnect and sign in again. A crash/reboot is **not** durable service continuity; leftover data/controls must not be reset or reclassified as a clean restart.

## Explicit stop, original I/O and cleanup

From another shell, create an empty, mode-0600 `stop` file in the owned session directory (e.g. `install -m 600 /dev/null "$SESSION/stop"`). SIGINT/SIGTERM directed to the foreground parent also requests that same drain. The child Emulator process group is separate so the parent does not turn this request into an immediate Firebase/Java kill.

1. Remove the private phone handoff; synchronously close new service operations and stop the existing maintenance schedule.
2. Let already-issued operations settle under their original authority/deadlines. Fresh identity checks for those admitted originals remain enabled; this is not permission for a new operation. Do not cancel a model merely to make the operator exit.
3. `held`/`operatorHold: true` preserves the original process and fixture when model, compiler, API/SDK work, retirement or cleanup is unresolved. The same stop is retried against that original state; no epoch replacement, forced-success timeout, fabricated cancellation or new model lane is supplied. Actual Qwen `termination_unconfirmed` can remain held indefinitely. This operator supplies no command to clear it; even an external host observation is not automatically converted into SDK settlement. LI must reconcile the original host/control state separately before any later recovery, without relabelling this run cleaned.
4. Once quiet, close the Backend, await tracked SDK work, reread closed controls, confirm this exact epoch, remove only the owned Account subtree/binding/fences/Auth identity, verify absence, and close the HTTPS edge. Unknown acknowledgment or partial cleanup remains a hold.
5. `status.json` closed/cleanup-confirmed covers owned service cleanup. Wait **also** for `worker-exit.json` (`innerProfileRemoved`) and `operator-exit.json` (`outerProfileRemoved`, `portsFree`, `exitCode: 0`) before calling operator teardown complete. LI removes only its own ADB reverses and private configuration/TLS/session files afterward. The launcher never touches an ordinary app installation.

Hard kill, machine failure, indefinite model hold, restart recovery, continuous cleanup SLA, real Notes, real accounts, cloud/provider/index enablement and full ordinary-network/device acceptance remain outside the evidence here. A missing receipt is not Pass. SHI source review and LI operator/device disposition remain separate gates.

## Reproduction on the new source

Use the already locked tools. Restore existing Flutter package mapping offline without changing the lock for the inherited actual Dart HTTP case.

```sh
node node_modules/typescript/bin/tsc --project backend/tsconfig.json
node --test 'backend/dist/test/**/*.test.js'
node --test tool/controlled_phone_service.test.mjs
node tool/run_ai_store_emulators.mjs --phone-service-only
node tool/run_ai_store_emulators.mjs
```

The ten committed service SDK cases are included in the full suite. The earlier eight-case focused run predates the added checkpoint-preservation and startup-acknowledgment cases and is not an additional distinct set. Operator unit tests use explicit listener/model/service doubles; SDK cases use real Auth/Firestore/HTTP with explicit model/compiler doubles. This packet does not claim a new actual Qwen, Linux foreground launcher, TLS/device or installed APK run. Exact results, source binding, retained failures and next gate are in the accompanying evidence manifest/report.

Report/handoff I/O correction: [current operator evidence](2026-10-15-jin-phone-service-report-io-correction.md). Reporting or private-handoff removal failure preserves the same original service and retries safe drain/removal/reporting. A missing or stale status file is not current readiness or cleanup proof. Confirmed cleanup is retained across final-receipt failures; no repeated cleanup or replacement lane makes an I/O outage pass.
