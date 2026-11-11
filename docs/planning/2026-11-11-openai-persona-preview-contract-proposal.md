# OpenAI Persona draft preview — minimal contract proposal

Status: awaiting LI confirmation. This proposal does not enable cloud preview or grant consent.

Purpose: restore the existing Persona editor's draft-only “Try preview” for the already selected OpenAI demo service. Existing Persona create/edit/activate and selected-Persona Conversation already work independently.

## Exact change for approval

Extend the existing `POST /v1/me/persona-preview` request with three optional fields. A cloud request must carry all three with these exact existing OpenAI values:

```json
{
  "draft": {"displayName":"Demo","tone":"warm","responseLength":"concise","formatStyle":"plain"},
  "text": "Hello",
  "processing": "cloud",
  "provider": "openai",
  "disclosureVersion": "openai_cloud_v1"
}
```

The original draft fields and seven optional expression strings, limits, endpoint, response `{"message":"..."}`, no-store headers, and existing error envelope remain unchanged. The marker is a routing/compatibility declaration, never permission. No new endpoint, collection, document field, migration, receipt, saved draft, conversation, message, model, prompt, SDK, provider, region, quota or monetary allowance is introduced.

A local composition accepts only the old unmarked local request. An OpenAI composition accepts only the exact cloud marker above and only after fresh own-account OpenAI consent checks. A missing marker on the OpenAI service returns the existing `AI_CONTEXT_NOT_PERMITTED`; malformed/unknown/incomplete markers return `REQUEST_INVALID`. Legacy local or Groq clients cannot trigger OpenAI. There is no fallback between providers.

## Authorization and execution

1. Keep the original verified token and account binding. Freshly check Auth, onboarding, account owner, optional-processing consent, purpose generation, OpenAI consent generation and the shared live consent lease before admission, before provider projection/dispatch, and before complete response acceptance. Revoke/reaccept is a generation change and rejects the original result.
2. Run through the same active OpenAI `BoundedAiRuntime` / `CloudAdmissionOwner` as Conversation, with the same selected `gpt-6.1-sol`, low reasoning, `goal-grounding-v1`, structured nonstreaming Responses and `store:false`. Preview carries the existing internal monetary consumer value `persona`; the original shared US$3.40 grant, all attempts, charges, unknown holds and rate quotas remain authoritative.
3. Provider input contains exactly this normalized draft and current message, with empty history and empty Check-ins. No saved Persona, account profile, Note, source catalogue or other user's data is read or included.
4. The use case receives read-only authorization Ports and the shared runtime. It has no Persona/chat/history persistence Port. Resource accounting writes in the existing cloud ledger remain necessary; no business records are written.
5. Keep the original bounded 60-second request / 45-second generation behavior and one dispatch. Cancellation, disconnect, expiry, epoch replacement, consent withdrawal or unknown provider outcomes cannot deliver or automatically resend. Shared cloud accounting retains unknown reservations.
6. Flutter sends the marker only from the explicit OpenAI client composition. Enable preview only while the ordinary processing and current OpenAI disclosure consent are both accepted. Never accept consent on the user's behalf.

## Supersession and validation

This narrowly extends the local-only draft-preview composition in [20 October contract](2026-10-20-zhou-persona-expression-preview-contract.md) and the Persona enablement gate in [5 November Sol decision](../decisions/2026-11-05-li-sol-test-app-acceptance.md). It does not change Persona CRUD, selected-Persona chat semantics or proactive scheduling.

Required source checks cover: legacy/malformed/provider-mismatched request rejection; invalid/revoked/changed identity; absent/withdrawn/reaccepted cloud consent; changed owner/purpose; admission/timeout/cancellation/late response; shared monetary/runtime usage; no business writes; exact draft-only projection; frontend processing marker and consent gating. Real paid-call and phone evidence remain separate from source checks.

Approval wording: “按此最小方案恢复 OpenAI Persona 草稿试聊；维持原预算、同意检查和不保存草稿/聊天记录。”
