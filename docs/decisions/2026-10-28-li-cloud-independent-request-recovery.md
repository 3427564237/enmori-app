# LI — cloud-only independent request recovery

Date: 2026-10-28. Authority: LI / PM.

After the concrete [cloud recovery proposal](../planning/2026-10-28-cloud-unknown-operation-policy-proposal.md)
was presented, LI replied **“批准实现云端恢复规则”** to authorization for
implementation and offline tests, without adopting failed models, adding model
calls or sending real-user data. The proposal's five behavioral rules, tradeoff
and limits are approved for this bounded implementation.

This specifically supersedes application of the physical local-host admission
quarantine in [Q31-B](2026-09-02-qwen-runtime-failure-contract.md) to a separately
selected cloud runtime. Preserve that original source and the unchanged local
Ollama behavior. An application terminal outcome and a remote generation's
physical termination are distinct facts. A remote unknown outcome is never
renamed settlement merely to release local application admission.

For cloud mode, preserve the original target, operation, session/account,
consent/deletion and authoritative readback guards; prohibit automatic retry,
provider fallback, late commit/delivery and restart replay. Once that
application operation is terminal, an independent newly authorized request may
use bounded cloud admission. Same-target Retry still requires the existing
fencing/readback conditions. Firestore/SDK uncertainty is separate and is not
resolved by a cloud timeout or process restart.

Use one cloud admission owner across chat, Persona preview and first-flow;
preserve per-user application ownership and existing request deadlines. Count
all dispatched attempts, including unknown ones, against bounded provider
request/token reservations. Do not silently increase limits or refund an
unknown dispatched attempt. Quota-window expiry is accounting, not proof of
remote termination. Production capacities must fit verified provider limits.

Implement the smallest explicit internal contract and fake/offline regression
coverage. Keep the current production composition on local Ollama: no real
cloud transport wiring, model adoption, public DTO or Firestore-schema change,
new credential, cloud resource deployment or actual data transfer is granted
here. Any persistence change found necessary must be separately identified.
Test unknown/late outcomes, deadline and cancellation races, independent new
actions, same-target guard preservation, quotas, shared consumers and restart
fencing. Report source verification separately from service/device acceptance.
