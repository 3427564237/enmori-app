# One real OpenAI Persona preview check

Verified on 11 November 2026, 07:21–07:22 UTC (15:21–15:22 Singapore), against the final deployed source `a04251b0775e512bafdcafb75d026edc2caf499b`. Scope and single-call authority: [LI's bounded synthetic check decision](../../decisions/2026-11-11-li-synthetic-persona-live-check.md).

## Observed result

- The dedicated demo administrator's unmarked legacy request returned `403 AI_CONTEXT_NOT_PERMITTED`; a wrong-provider marker returned `400 REQUEST_INVALID`; an explicit OpenAI marker without accepted processing consent returned `403 AI_CONTEXT_NOT_PERMITTED`. All three used `Cache-Control: no-store`; Settings were unchanged. Both optional-processing and OpenAI consent were unaccepted, so this is a combined denial check, not an isolated live cloud-consent test.
- A separate newly created, temporary, non-Admin synthetic identity completed onboarding and explicitly accepted its own optional-processing purpose and `openai_cloud_v1` disclosure. Exactly one marked draft-preview request returned HTTP 200 in **12,760 ms** with a coherent 100-character reply: “Step away from your desk and gently stretch for five minutes, giving your eyes a break from screens.”
- Before/after reads of that identity's complete account subtree and known supporting business records matched. No Persona, saved draft, Conversation, message/history or Check-in business record was created or modified by preview.
- The one new monetary attempt used consumer `persona`, model `gpt-6.1-sol`, and reached `reconciled`. The attempt counter changed 104 → 105 and reconciled counter 102 → 103. This call cost **US$0.001042**; cumulative spent became **US$0.1012267**. The original **US$3.40 cap** and **US$0.004096 unknown hold** remained unchanged, as did every earlier attempt. No monetary/quota record was deleted or reset.
- The synthetic identity's consent was withdrawn through the ordinary Settings API. Only its exact owner-checked account, binding, username reservation, onboarding idempotency and initialized supporting records were deleted. Readback confirmed their absence and deletion of its Firebase Auth identity. The retained administrator, demo friend and real user accounts were untouched.

The runner recorded an exclusive intent before its sole potentially paid request and made no automatic retry or ordinary Conversation substitute. Raw synthetic reply, credentials, private owner identifiers and operational state remain outside Git; [results.json](results.json) contains only status, timing, accounting and cleanup summaries.

## Evidence boundary

This establishes one real draft-only Persona preview on the deployed candidate and the negative authorization paths above. It does not establish physical-phone interaction, a separate real ordinary-Conversation request, proactive OpenAI support, p95 latency, sustained reliability, or full Release/UAT. The 12.760-second observation is one sample, not a performance guarantee.
