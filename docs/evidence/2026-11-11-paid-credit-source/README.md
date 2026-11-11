# Purchased-credit successor: source and isolated SDK evidence

Authority: [LI's 11 November approval](../../decisions/2026-11-11-li-teacher-stability-implementation.md).
Scope: the approved [first paid-credit successor](../../planning/2026-11-11-openai-paid-credit-successor-proposal.md).
This evidence uses fabricated purchase amounts, prices and identifiers. It does
not verify a real receipt or install a production grant.

The implementation keeps the exact v1 gift decoder/formula and `current` path.
The v2 decoder fixes the purchased allowance after old liabilities, limits both
manual review windows to seven days, and selects only Sol. The authority derives
the new UUID path, validates the historical v1 predecessor without retargeting
its epoch, and rejects attempt IDs already retained there. Existing unknown
reservations never become refunds or new dispatch permissions.

`PaidCloudCreditOperator` exposes one-shot `install` and `refresh`, plus read-only
`inspect`. The pure `createOfflinePaidCloudCostBudgetSeed` verifies complete
predecessor attempt arithmetic. These helpers have no startup, CLI, credential,
payment or network-default wiring. Before live use an operator still needs the
actual receipt, verified USD balance/expiry/pricing/model access, explicit cap,
private evidence packet, confirmed old-epoch retirement and stop/drain proof.
Unknown ACKs must use the same original ID and expected ledger/attempt inventory.

Validation used pinned Node 24.19.0 and the existing TypeScript/dependency tree:

- `node node_modules/typescript/bin/tsc --project backend/tsconfig.json`: passed.
- Cost Domain/authority/operator suites: **29/29 passed**.
- Complete Backend unit/injection suites: **1916/1916 passed**.
- Existing guarded `tool/run_cloud_quota_emulators.mjs --backend`: **12/12
  passed**, including four new paid-credit SDK cases and all eight preceding
  cost/quota cases. The controlled demo project, temporary isolated credential
  profile and external `/tmp/enmori-cloud-emulator-validation.lock` were used;
  production credentials/data and real model/FCM endpoints were not used.

The new cases cover exact paid-vs-gift decoding, conservative arithmetic,
unchanged v1 policy, retained old unknown attempts, same-ID replay rejection,
shared consumer exhaustion, absent/mismatched selected ledgers, historical
predecessor epochs, expiry, operator guard/fence/inventory failures, lost install,
recovery/reserve/settlement/refresh ACKs and same-ID readback. Actual SDK competing
reservations assert at most one stored claim under the available cap; neither
contender is promised success or retried after an unknown outcome.

An initial new test passed the full captured fence as a structural RuntimeEpoch;
the existing spread copied `cleanupGeneration` into a ledger and exact decoding
correctly refused it. The adapter now projects only `processEpoch` and
`generation`; no new persisted ledger field was added. Tests cover the resulting
paid recovery/reservation path, and all original v1 suites remain green.

Integration hook, owned by the runtime composition work: use
`decodeOpenAiDeploymentCostGrant` in both the Azure configuration parser and
OpenAI composition instead of their duplicated US$3.40-only check. The validator
retains US$3.40 for v1 and accepts only the approved exact v2 contract. This branch
does not edit those independently owned files. A separately reviewed combined
candidate and actual operator packet are required before live paid-grant use.

No production financial write, purchase, automatic recharge, paid generation,
teacher account, consent change or two-month availability claim occurred here.
