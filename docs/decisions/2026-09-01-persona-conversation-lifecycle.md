# Persona and AI Conversation lifecycle — 2026-09-01

- **Status:** Approved; Q-19 Resolved; closes the remaining Q-17 Persona projection gate
- **Decision owner:** LI HOURUI, ENMORI PM
- **Source ID:** S-PM-0901-Q19
- **Scope:** Persona CRUD/activation/deletion, historical AI Conversation behavior, source-deletion propagation, and Persona presentation projection
- **Builds on:** [S-PM-0831](2026-08-31-pm-requirements-decisions.md), [S-PM-0901-Q17](2026-09-01-recommendation-ai-field-allowlists.md), and [S-PM-0901-BACKEND](2026-09-01-backend-architecture.md)
- **Detailed specification:** [`docs/superpowers/specs/2026-09-01-persona-conversation-lifecycle-design.md`](../superpowers/specs/2026-09-01-persona-conversation-lifecycle-design.md)

## Persona lifecycle

Each user may own at most five live Personas. A new Persona is inactive. Selection is a client-side intent until explicit confirmation; confirmation atomically makes the chosen Persona the user's sole Active Persona. A user may also have no Active Persona. Activating one Persona replaces the previous active selection without deleting either Persona.

Persona is owner-private. Other ordinary users and Admin cannot read or use its content. Editing affects only requests that start after the edit. Mutation safety follows operation semantics: creation uses duplicate-effect protection, while activation, edit, and deletion use concurrency/precondition protection where newer state could conflict.

Permanent deletion removes the live Persona entity and editable content, releases one of the five slots, and provides no Trash or Restore. Deleting the Active Persona atomically clears the active authority and does not auto-select another Persona. Subsequent AI requests use default presentation until another Persona is explicitly activated.

Permanent Persona deletion removes the live Persona entity/content. Historical Conversation behaviour does not require the deleted Persona to remain readable; any retained Persona-related historical presentation requires a separately approved minimized snapshot/metadata contract.

## Persona fields and projection

The live Persona semantic fields are:

- opaque Persona ID and owner UID;
- `displayName`, for owner management only;
- `tone`: `neutral`, `warm`, or `encouraging`;
- `responseLength`: `concise`, `balanced`, or `detailed`;
- `formatStyle`: `plain` or `bulleted`;
- server-authoritative created/updated time; and
- a concurrency revision/version.

`displayName` is trimmed, non-empty, and contains no control characters; its exact maximum length belongs to the DTO validation contract. Duplicate display names are allowed because Persona ID is identity. Free-text Persona prompts, system instructions, role-play text, URLs, tool instructions, and arbitrary extension maps are prohibited. These structured fields are Persona properties and do not recreate a separate Tone Presets feature.

Backend maps the current Active Persona to:

```text
PersonaPresentationProjection
├── schemaVersion: "persona_presentation_v1"
├── tone: neutral | warm | encouraging
├── responseLength: concise | balanced | detailed
└── formatStyle: plain | bulleted
```

Persona ID, owner UID, display name, revision, timestamps, original object, and free text never enter the projection. Backend strictly validates the enum values and applies a server-owned versioned mapping to lower-priority presentation guidance. The projection cannot change safety, purpose, authorization, allowlists, deterministic results, tools, or fallback.

`neutral` adds no emotional framing; `warm` permits friendly expression; `encouraging` permits general supportive expression without diagnosis, treatment, crisis judgment, or unsupported fact. Length changes detail only, not available data. Format changes presentation only, not the response schema.

This exact projection closes the remaining Q-17 Persona-to-Qwen field gate.

## Request-time snapshot and deletion race

Persona-based generation uses snapshot-at-request-start. Backend resolves the current Active Persona and creates one immutable projection snapshot when the AI Use Case starts. Persona Edit or Active Persona change affects only subsequent requests and does not invalidate an already-started request.

Permanent Persona deletion is the exception. Model cancellation is best-effort, but before persistence and response delivery Backend must revalidate that the Persona used by the request has not been permanently deleted. If it has, the generated result is discarded, is not persisted, and is not returned. Deletion cannot be bypassed by a late model response.

## Historical Persona usage metadata

Deleting Persona does not automatically delete or rewrite a retained historical Conversation or its generated messages. Historical messages are not regenerated. They cannot resolve a live Persona reference or reconstruct a deleted Persona.

The only approved generation-time Persona usage metadata is:

- `presentationMode`: `default` or `persona`; and
- when Persona presentation was used, `presentationProjectionVersion`.

`presentationProjectionVersion` is a non-content contract/schema version and must not uniquely identify, fingerprint, hash, or reconstruct a Persona. It contains no Persona ID, name, owner, enum values, content, or complete projection.

Minimal generation-time usage metadata is immutable historical metadata; Persona deletion does not rewrite it. It is removed only together with the associated Conversation/message according to the separately approved Conversation deletion/retention contract. Any future historical Persona name, style summary, or snapshot requires a new PM decision.

## Conversation deletion

MVP supports owner-confirmed deletion of a complete AI Conversation, not individual message deletion. Backend reauthorizes ownership. Deletion permanently and idempotently removes the Conversation, all user/assistant message content, approved usage metadata, and associated source-provenance metadata. There is no Trash or Restore.

Deleting a Conversation does not delete Persona, Check-in, Event, or another business entity. Automatic retention and deletion schedules are defined by [S-PM-0902-Q14](2026-09-02-retention-logging-audit-policy.md).

In-flight model cancellation is best-effort. The mandatory guarantee is that Backend revalidates Conversation authority before persistence and response delivery; results for deleted Conversations are discarded and cannot recreate them.

## Check-in source-deletion propagation

For an assistant message generated from approved Check-in context, Backend may retain the minimum Backend-only provenance pair of source type and opaque source record ID. Provenance does not enter Qwen, Flutter responses, ordinary logs, or explanation text and contains no source content.

When an assistant message depends on multiple approved Check-in sources, all required sources must remain valid for that purpose. Invalidating any required source makes the generated assistant message unavailable as a whole.

The Conversation read path revalidates required source availability and fails closed before cleanup, so deleted or newly unauthorized Check-in information is not returned. Cleanup removes the affected assistant content and may retain a non-content unavailable tombstone to preserve message order. The tombstone contains no generated text, Check-in content, Persona content, or source details.

Backend-only source record IDs may be retained only while required for provenance revalidation. After source deletion has been processed and generated content is replaced by an unavailable tombstone, the tombstone must not retain the deleted source record ID unless a separately approved retention requirement explicitly requires it.

Deleting one Check-in does not remove unrelated Conversations or messages.

## Explicitly deferred

This decision does not approve:

- legal hold or custom backup behavior beyond S-PM-0902-Q14's explicit non-approval;
- individual message deletion;
- account-deletion or Admin account-action effects;
- final UI copy for deleted Persona, unavailable message, or failed in-flight request;
- concrete API DTO/Firestore fields, collection structure, cleanup mechanism, or error identifiers; or
- Qwen runtime, timeout, output-validation, or general failure/fallback behavior.

These remain controlled by S-PM-0902-Q14, Q-27, Q-04/UI baseline, Q-31, and later data/API decisions.

## Authority and change control

This is a current PM lifecycle and semantic-data decision. It is not a Sponsor/Supervisor decision, does not retroactively change COMP3851A delivery evidence, and does not prove implementation or verification. Q-19 and the remaining Q-17 projection gate are resolved at the requirement-contract level only; applicable schema, API, retention, UI, test, owner/reviewer, and platform gates still apply before production PBIs are Ready.
