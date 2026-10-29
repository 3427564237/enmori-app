# Cloud AI recovery contract — proposal for LI

Original proposal status: **Proposed, not approved or implemented.** This is a concrete design
decision needed before a dependable cloud replacement, not a new model grant.

Subsequent status: LI approved implementation and offline tests in
[the 28 October recovery decision](../decisions/2026-10-28-li-cloud-independent-request-recovery.md).
The original proposal below is retained as the exact reviewed scope. No cloud
deployment or production-model adoption follows from this approval. The bounded
internal implementation is now complete with 1609 Backend and 38 evaluation
regressions passing; see the [offline receipt](../evidence/2026-10-28-cloud-recovery/README.md).
Real provider and durable authority implementations remain outside this slice.

The approved [Q31-B local-host contract](../decisions/2026-09-02-qwen-runtime-failure-contract.md)
keeps the single Ollama generation lane quarantined until physical termination
is confirmed. A local host restart can restore a supervised local process; it
does not establish that a Groq invocation has ended. Returning an ordinary
rejection from the synthetic evaluator would therefore violate the existing
[`GenerationTransport`](../../backend/src/ai-runtime/ports/generation-transport.ts)
contract. Keep that port's promise and local-host rules truthful and unchanged.

## Proposed cloud-only behavior

1. Distinguish a cloud application's terminal outcome from the remote
   provider's physical execution state. Timeout, cancellation or disconnect
   means no further delivery/commit authority for that application operation;
   it does **not** mean remote generation has stopped.
2. Preserve the original operation's unknown result and existing target,
   account/session, deletion, consent and canonical-readback fences. Never
   automatically retry, regenerate, change provider, clear the target, or
   convert missing evidence into success/no-effect. Discard late text after
   authority/deadline loss. Firestore/SDK uncertainty remains independently
   fenced; a cloud HTTP failure is not proof that a database write settled.
3. After the application's terminal boundary, allow a newly authorized,
   independent user action through a separate, bounded cloud admission policy.
   An unresolved remote attempt is not represented as a free local GPU slot or
   as a completed remote request. Explicit same-target Retry still requires
   the existing fencing and authoritative result-read conditions; starting an
   independent topic does not resolve the original target.
4. Count every dispatched cloud attempt, including unknown attempts, against
   bounded provider request/token reservations. No paid fallback or automatic
   limit increase. The first implementation uses one configured provider and
   model, with shared admission across chat, Persona preview and first-flow;
   preserve the per-user application ownership and existing deadlines. Exact
   capacities must fit verified account limits before enablement.
5. Do not automatically resume work after restart. Verify durable application
   authority before accepting new work, preserve unresolved original effects,
   and do not describe a new process epoch as remote termination. Demonstrate
   this separately for lost responses, late responses, cancelled work,
   repeated commands, provider 429 and process restart.

This would supersede only the application of the local physical-generation
admission/quarantine rule to a separately selected **cloud** runtime. It does
not change the local Ollama behavior, external AI DTOs, data purposes,
output/schema checks, existing unknown-result UX, or the no-replay rule. Any
necessary persistence change must be identified and reviewed explicitly; no
new schema is assumed here. The cloud transport must expose its different
settlement semantics explicitly rather than impersonating the local port.

The tradeoff is explicit: an earlier remote request may still be executing
when an independent new request is dispatched. The provider's remote compute
is not a supervised local process. Bounded admission, request reservations and
unchanged application write/delivery fences control this case; they do not
prove that the provider destroyed already-received input.

## Approval and deployment limits

LI approval of this behavior would permit implementation and offline contract
tests within the Azure/Groq migration. It would not adopt any failed model,
authorize another synthetic batch, send real-user data, create credentials,
remove Azure spending limits, or deploy a public service. Model selection,
accurate processor/retention disclosure and consent, Azure/Firebase identity,
HTTPS and physical/off-host verification remain separately evidenced steps.
