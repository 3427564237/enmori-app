# ZHOU Persona full expression and draft preview contract

Authority: [S-PM-1019-LI-CORE-SINGLE-CHAT](../decisions/2026-10-19-li-core-feature-delivery.md), item 12 and implementation section; [S-PM-1019-LI-AI-MVP](../decisions/2026-10-19-li-ai-mvp-simplification.md); [S-PM-1019-LI-LOCAL-UI-HANDOFF](../decisions/2026-10-19-li-local-ui-handoff-preparation.md), activated for this scope by the user-supplied `zhou(1).md` full package in bundle `927f775`. This is the necessary implementation contract under that scope, not a new product/architecture decision or acceptance record. Review path: ZHOU → LI; the author cannot approve their own work.

## Preserved and changed contract

Retain [Q19](../decisions/2026-09-01-persona-conversation-lifecycle.md), its [detailed contract](../superpowers/specs/2026-09-01-persona-conversation-lifecycle-design.md), and the original [Persona first contract](2026-10-07-zhou-persona-first-contract-delta.md). The 19 Oct core decision explicitly replaces the prior “free fields undecided” gate for the listed expression fields. Capacity five, unique current selection, verified owner, confirmation, permanent deletion/current-to-default, server timestamps, optimistic owner/target revisions, create identity/replay and other privacy boundaries continue unchanged.

The existing editable `displayName`, `tone`, `responseLength`, and `formatStyle` remain. Add optional input strings `relationship`, `shortIntroduction`, `description`, `personality`, `communicationStyle`, `interests`, `extraInstructions`. Missing legacy values normalize to `""`; responses and newly written records contain all seven. Present values must be well-formed Unicode strings, are preserved verbatim, and grant no data permissions. Name keeps the existing trim/scalar/control-character policy; existing enum choices stay. There is no invented per-field free-text product limit. The existing CRUD request body capacity remains 4096 UTF-8 bytes and rejects oversized bodies without truncation. A PUT is the existing full replacement of editable input; omitted new fields are empty.

Storage stays in the same owner Persona document, with the same exact-key validation plus the seven explicitly allowed fields. No migration, backfill, collection, index, retention change, new receipt or read-time repair is added. Reads of an old row do not write. Present malformed/unknown fields fail closed. Idempotency equality and effective/no-op edit detection compare all eleven editable fields, treating omitted legacy expression fields as empty.

## Active expression in simplified local chat

Default/old bounded readers continue to emit the exact four-field `persona_presentation_v1` projection. The optional `includePersonaExpression: true` reader setting is selected only alongside `simpleChat: true` in the existing local composition. It adds a copied `expression` object containing the complete normalized editable fields to the existing internal projection. The outer v1 marker continues to describe structured presentation usage metadata; this local optional expression extension is not enabled for the old bounded policy/controlled prompt, which still reject extra fields.

The fixed-start reader and prepared Application reader copy/freeze the expression; the existing simplified native Ollama transport receives it as presentation preferences. It adds no source reads. Same-account recent two complete pairs/current message, deletion/consent revalidation, operation readback, 2400-character messages, existing resource deadlines, single local model and no-tools boundary remain. No automatic Check-in Note, candidate, catalogue, location or cross-account context is introduced. Custom interests never create/recommend synthetic events.

## Draft-only preview

`POST /v1/me/persona-preview`, explicitly enabled through `isolatedSlices.personaPreview`, accepts exactly:

```json
{"draft":{"displayName":"Kai","tone":"warm","responseLength":"balanced","formatStyle":"plain","relationship":"Companion","shortIntroduction":"Hello","description":"","personality":"Curious","communicationStyle":"One question","interests":"Piano","extraInstructions":""},"text":"Hello"}
```

The four legacy draft fields are required; seven free fields are optional. No saved Persona ID, identity, versions, history, candidate, operation key, idempotency key or query is accepted. Request capacity is the existing AI 16384 UTF-8 bytes; text remains 1–2400 Unicode scalars with a non-whitespace value. Oversize yields `REQUEST_TOO_LARGE` 413, without truncation. Wrong types/extra shape fields yield `REQUEST_INVALID` 400; invalid typed draft/text values yield `AI_INPUT_INVALID` 422.

Successful response is exactly `{"message":"..."}` with `Cache-Control: no-store`. Original token identity is freshly verified and own completed-account accepted consent read before model dispatch and before response acceptance. Owner and `purposeRevocationGeneration` must match. Missing generation is not fabricated. Rejection/withdrawal blocks; revoke/reaccept or owner change rejects delivery. Model output uses the current simplified structural parser, allowing plain-text code/links/numbers, and is never executed.

The `PreviewPersona` Application has only read-only `PersonaPreviewAuthority` and generation Ports. The authority reads only current UID binding and its Account; it has no saved-Persona/history/Note/candidate read. There is no save, selection, operation, message or other write Port. Every call supplies only this draft/current message, empty history and empty Check-ins. It shares the existing `LocalChatTransport` physical lane; no parallel model or retry loop. The same 45-second generation / 60-second request capacity applies. Disconnection/deadline withdraws delivery; the original transport retains its lane until original model completion is known, so an unknown model outcome is never resubmitted automatically.

Errors use the existing AI envelope `{error:{code,message},requestId}`: 400 `REQUEST_INVALID`, 401 `AUTH_REQUIRED`, 403 `AUTH_FORBIDDEN`/`AI_CONTEXT_NOT_PERMITTED`, 409 `ONBOARDING_REQUIRED`/`AI_AUTHORITY_CHANGED`, 413 `REQUEST_TOO_LARGE`, 422 `AI_INPUT_INVALID`, 429 `AI_BUSY`, 502 `AI_REPLY_REJECTED`, 503 `AI_UNAVAILABLE`. Draft preview is transient and has no conversation/result receipt to reread; failures do not create history. Normal chat unknown results continue to use original operation readback before any explicit retry.

## Composition seam for LI

1. `registerPersonaPreviewRoute(app, identityVerifier, preview)` from `backend/src/personas/transport/preview-route.ts`, only when explicitly provided in the approved isolated composition.
2. `new PreviewPersona(new FirestorePersonaPreviewAuthority(gateway), chatTransport, () => performance.now(), () => chatTransport.state.pending)` while the existing simplified chat is healthy. Reuse its exact transport instance and existing gateway.
3. Pass `includePersonaExpression: true` with `includeCheckIns: false` to the existing real context reader only for `simpleChat`.

No host, model installation, credential, deployment or private runtime changes are required in this package. Runtime composition belongs to LI.
