# LI — Backend first; cloud AI paused

Date: 2026-10-29 (Asia/Singapore). Authority: LI / PM.

LI instructed: “先把重点放在后端，云端ai暂缓”.

Prioritize the existing Backend's independent operation, identity/data isolation,
ordinary feature integration and Azure deployment preparation. Pause cloud-AI
model experiments and production integration. The 21 unsent requests from the
last synthetic grant are not dispatched while this pause applies.

This changes the execution order in the [cloud service objective](2026-10-28-li-cloud-service-objective.md)
and the [AI/Azure continuation](2026-10-28-li-ai-repair-and-azure-setup.md).
It does not discard previous cloud source work, failed quality evidence, grants,
or provenance, nor approve a new model, a live endpoint switch or billed resource.
The eventual independent-host goal remains; Backend work need not wait for model
quality acceptance. Existing auth, consent, source, unknown-write and data
preservation contracts remain controlling.

Implementation detail for this source increment: expose the existing no-model
full Backend composition through an explicit `--backend-only` option on the
existing private-config runner. Default invocation retains its behavior. Reject
inconsistent first-flow/worker selection before credentials, locks or I/O rather
than silently dropping it. Keep established listeners, configuration, Firebase
project and feature contracts; this is not an approved Azure topology or cutover.
Ordinary Backend verification uses synthetic offline/emulator data and no model.
The installed personal-host service is not changed by this increment.
