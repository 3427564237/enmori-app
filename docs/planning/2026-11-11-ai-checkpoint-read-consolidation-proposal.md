# AI checkpoint read consolidation

Status: proposed, not approved or implemented. Scope is the ordinary cloud Conversation path only.

## Observed problem and existing repair

The three historical synthetic execute requests spent 13.1–13.8 seconds before the cost reservation and another 12.5–13.7 seconds after provider usage confirmation. The existing application repeatedly performs fresh Auth, cloud consent, context and history checks. Their infrastructure adapters independently re-read the runtime fence, owner binding and account in separate transactions. The current bounded repair parallelizes same-stage independent reads, preserving all of those checkpoints; it does not establish the 15-second target.

Do not delete checkpoints or treat a prior request's authorization as current. The proposed next step consolidates the duplicate reads **within one checkpoint**, with a new current transaction at every later checkpoint. This is a material Backend coordination change, so it needs explicit PM approval under AGENTS.md before implementation.

## Concrete proposed boundary

- Add one application-owned checkpoint Port for the complete current authorization/context/history observation. Keep Firebase types in Infrastructure and inject the adapter at the existing composition root. The application still invokes it at every existing checkpoint; no global service, new database, dependency or process.
- Fresh verification of the original token/session remains before the checkpoint's database reads. The adapter holds the existing cloud-consent lease, verifies the existing runtime epoch and owner binding, then reads the current account. Only after those checks may it read already-selected Persona, Check-in, conversation and provenance records.
- Use **one current Firestore transaction per checkpoint** to establish cloud consent generation, optional-processing generation, captured Persona/source dependencies and history identity. Metadata already read in that same immutable transaction may be reused by its subchecks. Never reuse an observation across transactions, checkpoints, requests or users.
- Preserve the current required fields, source/version closure, reference-off behavior, original history bytes and order, source expiry, bounded view lifetime, active-owner checks and late-result disposal. Context failure retains precedence over history failure. Unknown/incomplete evidence remains unavailable; no empty-success fallback.
- Keep the fixed start view and selected input snapshot unchanged. Keep operation opening, user/assistant writes, cost accounting, separate assistant settlement, and actual sink authorization in their existing transactions and order. This proposal does not combine a content write with an earlier read-only authorization.
- Preserve model, prompt, structured response, output limits, 15-second full-reply target, original monetary cap, region, Firebase data model and public HTTP contracts.

## Required verification and rollout

1. Add adapter/application tests for a fresh checkpoint at every existing boundary; withdrawal, owner/session/epoch replacement, deleted Persona, source changes, source expiry, history mismatch, failed reads and late callbacks must deny exactly as before.
2. Prove that a checkpoint reads shared metadata once, and that the next checkpoint reads it again. Prove no content read precedes authorization, no content write is introduced, and no unsupported adapter silently skips a check.
3. Run the existing complete Backend suite, relevant Emulator transaction scenarios and the complete Flutter suite. Inspect the exact candidate before any service deployment.
4. Deploy through the existing ordinary/disarmed route with rollback retained. Any paid latency comparison remains subject to the separately reviewable [three-request remeasurement proposal](2026-11-11-ai-latency-remeasurement-proposal.md), current credit/pricing verification and exclusive-owner checks.
5. Record actual timings. Do not promise that consolidation alone will meet 15 seconds; stop further architectural changes for review if the measured target is still unmet.

No approval is requested for onePA, current source repairs or tests here; those continue under the existing task authorization. This proposal changes only how the already-required checkpoint observations are acquired.
