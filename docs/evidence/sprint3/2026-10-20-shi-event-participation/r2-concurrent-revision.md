# #167 R2 residual concurrent stable-Detail correction

Reviewed parent `0158ca6588e115323f4776d974c778a1d95352ca`.
Product correction `ed63795719534f1e3834a0d3a88305cb083d0dce`, tested tree
`8eda719df18075991a0319d8a1421ecb61da8a4e`. Following evidence-only commit
does not change runtime/tests. R1 was independently closed by ZHOU on the parent;
this delivery does not reopen it or claim independent R2 acceptance.

## Retained failure / root cause

ZHOU's sequential and pending-first regressions passed on the parent, but a
stable-ID Detail requested during page-zero replacement could bypass pending,
read raw OLD data in the new epoch, and return it after NEW was published.
The successful epoch comparison alone did not bind the read to the published
snapshot. This is the same unclosed R2 generation requirement, not a new feature.

Added an actual Ticketmaster adapter + synthetic HTTP double, outer controlled
gate, EventBrowse and existing stable EventDetail use-case reproduction:
warm OLD -> hold page-zero replacement -> admit stable Detail -> publish NEW ->
release possible OLD Detail response. Parent returns OLD; corrected code returns
NEW for list, ordinary Detail, stable Detail and subsequent recommendations.
Assertions include **two list requests, zero raw Detail requests, pending0** after
completion. No provider/key/account/host/phone/network operation was performed.

The test file before product change was **2 Pass /3 Fail** (exit1): previous two
regressions stayed green; new concurrent stable-detail, failed-refresh fallback,
and raw-read-crossing-publication assertions failed. Initial strict test build
also caught a wrong fixture import path; fixed to the existing contract fixture,
without changing compiler options or production code to hide it.

## Bounded repair

- Stable lookup joins the **already pending** replacement before inspecting the
  current snapshot, then rechecks epoch/cancellation and reads the published row.
  Failed/invalidated replacement rejects; it cannot fall through to old raw data.
- A legitimate later-page raw lookup captures the snapshot and generation, and
  checks them again immediately after its await. If a refresh begins/publishes,
  pending remains, or the gate is invalidated, reject safely rather than return an
  unrelated old success. No auto-retry, title merge or stale fallback is added.
- A new firstBatch source fetch also advances the generation, so a failed refresh
  invalidates old raw work even if no replacement snapshot was ever published.
- Later-page identity/availability, atomic clone/freeze, expiry and controlled
  disable accounting remain. No HTTP/DTO/storage/dependency/ranking/consent change.

## Actually executed gates

Node **24.19.0**, strict TypeScript compile Pass (exit0).

```text
node node_modules/typescript/bin/tsc --project backend/tsconfig.json --pretty false
node --test backend/dist/test/event-source-generation-regression.test.js backend/dist/test/controlled-event-projection.test.js backend/dist/test/event-browse-pagination.test.js backend/dist/test/controlled-event-browse.test.js
git diff --check
git diff 900ca6fcdefb77e9aa95d96fa80994ebf826398f --check
```

Affected Backend **22/22 Pass**, exit0: original17 plus five newly added cases.
Two additional controls cover disable while stable Detail waits (both promises
reject, pending returns0, no raw fallback) and a failed first-generation refresh
invalidating an in-flight raw stable lookup. Full PR-range whitespace Pass.

Local ignored log receipts:

- Before (2Pass/3Fail): `b3e768b62df4aeb6912516fee9122f2bf834025ea297d728b1d84db3e534f500`.
- Final (22/22): `914ac14ad35b2d52aa6858e34c7825b870e4cf6e92cad1ac75cd0c138a427736`.

Previous ZHOU19/15, owner17/51 and older72/43/actual SDK4 remain attributed to
their actual heads. **No Flutter, Emulator/storage, full app, APK, real provider
or device gate was repeated or relabeled in this two-file Backend correction.**
ZHOU decides the current-head R2 disposition; SHI did not resolve his own thread.
LI retains final wiring/provider/device acceptance. Keep Draft/Open; no merge,
release, Issue/Project transition or whole-app Done/acceptance.
