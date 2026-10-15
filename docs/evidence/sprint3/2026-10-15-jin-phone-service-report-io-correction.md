# JIN #117 report-I/O lifecycle correction

Historical review head: `b7aad4c3653af6979575a2840807b83a7118df5d`. Corrected executable: `12cff0bdf668631053d92c921b6c22386e7b487e`, tree `32ea0d394623d38545d365d8e441534c582ec348`. The final publication commit adds/updates evidence only. This delta changes only the operator and its focused tests; Backend factory/Application/store, API, dependency, Flutter, device and model policy sources are unchanged.

## Finding and reproduced failure

[LI's exact counterexample](https://github.com/3427564237/enmori-app/blob/4232886/docs/evidence/sprint3/2026-10-15-li117-operator-report-failure.md) showed a running-status write failure entering recovery, then the held-status write throwing again. Unguarded handoff removal could escape the same way. The rejected operator promise reached the CLI failure handler while the original fixture still required preservation.

JIN reproduced that original source: serviceCreated=true, statusAttempts=2, stopCalls=1, promiseRejected=true, originalPending=true and listenerClosed=false. Reproduction exit0 means the old defect was reproduced, not lifecycle Pass. The separate outer Firebase CLI teardown remains a source-control-flow consequence, not an executed test. Zero real model, Firebase, listener or device calls.

Two local reproduction setup failures are retained: first invocation used the wrong script copy path; the second reached the counterexample assertions but lacked its local output directory. The third completed the unchanged historical counterexample. Neither setup failure is represented as a successful reproduction.

## Small correction

- Recovery independently protects handoff removal, stop/drain and status publication. A removal failure cannot skip the stop/admission gate; a reporting failure cannot reject the held operator promise.
- Repeated failures keep the same service/original and retry. Unknown construction effects remain held without creating a replacement service. No model reset, epoch replacement, new lane, forced cleanup or public contract change.
- Only confirmed original cleanup permits listener closure. That confirmation is retained across receipt failures; cleanup/listener closure are not replayed to manufacture success. Exit requires confirmed handoff removal and the final failure/cleanup receipt. If these remain unavailable, the operator stays alive. Previously reported status can be stale during an outage; no missing/current receipt is interpreted as readiness or teardown Pass.
- A failed read-only preflight or factory-confirmed clean rejection with no owned execution may still exit1; reporting failure there is not mislabeled Pass.

## Source-bound verification

Pinned Node24.19.0. New five negative cases plus existing five on the old operator: **5 Pass / 5 Fail, exit1**. On the corrected operator: **10/10 Pass**, exit0, zero failed/cancelled/skipped/todo. The cases cover status failure, removal failure, both together, unknown startup effects, and final receipt failure after original cleanup. Pending originals retain their listener and a single service construction; tests permit only that original to settle, then recover I/O. The unknown-startup case intentionally retains a pending Promise without an external event-loop handle; it does not simulate successful recovery.

An intermediate10/10 precedes the final cleanup-confirmation retention; the final10/10 binds the executable above. They overlap and are not20 distinct cases. Strict TypeScript build of unchanged Backend inputs and two final Node syntax checks pass. Exact two-file executable delta and whitespace checks pass. [Input/log bindings and sanitized historical probe](2026-10-15-jin-phone-service-report-io-correction.json). Raw logs remain local with attributed fingerprints.

```sh
node node_modules/typescript/bin/tsc --project backend/tsconfig.json
node --check tool/controlled_phone_service.mjs
node --check tool/controlled_phone_service.test.mjs
node --test tool/controlled_phone_service.test.mjs
```

No new Backend full suite, Emulator, Linux foreground service, real model, mobile/device or actual outer CLI teardown run is claimed. Earlier882/155 remain on their original source; #115 device/model evidence is not transferred. This correction resolves the demonstrated source path in owner tests only; SHI exact-new-delta review and LI disposition/actual ongoing-generation packet remain pending. No repeated accepted component approval, merge, Issue/Project transition, runtime enablement or whole-baseline completion.
