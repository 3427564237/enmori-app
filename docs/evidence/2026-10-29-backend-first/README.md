# Backend-first continuation

29 October 2026. [LI direction](../../decisions/2026-10-29-li-backend-first-cloud-ai-paused.md).
Cloud AI evaluation and production integration are paused. No model calls occur
in this continuation, including the 21 requests left unsent in the previous grant.

## Implemented and verified

`tool/run_real_account_local.mjs <private-config-path> --backend-only` selects the
existing full ordinary-feature composition without a chat model. Existing
invocation retains its behavior. This is an opt-in entry option, not a service
switch. The private configuration must retain `fullFeatures: true` and omit
`firstFlow`; conflicting or mistyped options fail before key reads, lock
acquisition, runtime creation or listeners. Existing project, certificate,
loopback listeners, event mapping and Auth/Firestore readiness are unchanged.

The real remote composition already supports an absent model. No parallel
Backend, endpoint, field, dependency, Firebase database or Azure infrastructure is
introduced. Persona configuration remains ordinary data; model-dependent preview,
conversation and first-flow routes stay unregistered under the existing disabled
composition behavior. Existing conversation records are not removed or migrated.
A future client deployment needs an accurate unavailable-AI experience; this
source increment does not publish or install a new mobile build.

Pinned Node.js 24.19.0 verification:

```
node --experimental-test-module-mocks --test \
  tool/ai-companion-eval/real-entry-first-flow.test.mjs \
  tool/backend_only_runtime.test.mjs
```

**9/9 pass.** Eight entry tests cover default compatibility, explicit Backend-only
selection, missing full feature mode, conflicting first-flow and malformed flags.
One actual remote-composition/Fastify test checks nine ordinary routes' unauthenticated
401 responses, invalid identity, successful owner profile/settings reads/writes,
stale revision 412, second-account isolation, general-consent generation and clean
shutdown. It asserts zero model construction and zero fetch calls. External
identity/database dependencies are fakes; this is not a real login, cloud database,
physical phone or Azure availability test. The first fixture run lacked static
Firestore SDK exports and failed during module import; preserving those exports
fixed the test harness before the passing run. `git diff --check` passes.

No new full Backend/Flutter score is claimed for this runner-only change. The
previous source packet's 1664 Backend, 143 Flutter and 3 emulator tests retain
their original attribution. The active personal-host service was not restarted.

## Azure preparation finding

Fresh official documentation was checked on 29 October. App Service Linux F1
includes 60 CPU minutes/day, 1 GB RAM and 1 GB storage, with free HTTPS on the
standard `azurewebsites.net` address. Microsoft explicitly limits Free to
trial/experimentation, provides no SLA and does not support production workloads
on it. It is a possible isolated deployment rehearsal, not acceptance of the
always-available downloadable-app target. [Pricing and limits](https://azure.microsoft.com/en-us/pricing/details/app-service/linux/).

Without Always On, idle applications unload after 20 minutes; exceeding Free CPU
or bandwidth quota stops the app until reset and yields HTTP 403. These are
hosting limits rather than evidence that the user's Firebase account is forbidden.
[Configuration](https://learn.microsoft.com/en-us/azure/app-service/configure-common),
[quota enforcement](https://learn.microsoft.com/en-us/azure/app-service/web-sites-monitor).

The existing loopback/TLS runner cannot be deployed unchanged as an App Service
entry. A hosted listener/managed HTTPS configuration, exact supported Node patch,
Firebase workload identity and client endpoint must be resolved first. F1 account
and region eligibility were not checked; no Microsoft.Web registration or
resource creation was performed. The previous VM/credit figures remain dated
28 October and are not newly verified account guarantees. No topology was selected.

Backend next deployment gates are therefore independent of AI model acceptance:
choose a cost-bounded host suited to the intended availability, provision scoped
Firebase identity, wire HTTPS and the exact mobile endpoint, then verify ordinary
functions through mobile data with the personal host off. No paid resource,
permission expansion, production endpoint switch or host-off claim is included.
