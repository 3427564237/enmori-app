# Cloud consent and independent revocation — source verification

28 October 2026. [Approval](../../decisions/2026-10-28-li-cloud-consent-provenance.md) ·
[Contract and rollout boundary](../../../api/cloud-ai-processing-contract.md).
This continuation supersedes only the earlier receipt's unimplemented
Conversation consent/provenance status, not its deployment or model-quality gates.

## Implemented

Separate Groq Settings consent, explicit disclosure, revision-aware saving and
three-way draft recovery are present in Flutter and Backend schemas. Untouched
legacy absence stays absent; neither a local grant nor a server update silently
opts a user in. The cloud-only counter is independent from local purpose history.
The cloud source badge round-trips through storage, application copying, HTTP
serialization and strict mobile parsing, including cloud plain chat with no
selected sources. Local records are not relabelled or bulk migrated.

Conversation now checks fresh cloud authority at prepare/checkpoints and uses a
revocable lease through the final asynchronous dispatch boundary. Settings saves
invalidate leases synchronously before I/O. Unknown writes retain a revision
barrier: a delayed earlier successful acknowledgment cannot clear a newer unknown
write. All cloud Settings writes also read the existing `ai_runtime_fence/current`
in their Firestore transaction, capture an immutable epoch and disable SDK retry.
A new confirmed epoch prevents old epoch writes from committing after it. This
requires every relevant writer to be wired and exclusive-host cutover; it is not
proof of multi-host safety. Construction performs no I/O. Ordinary Profile reads
and writes, and Settings reads, do not require a usable AI epoch.

Review also fixed reordered consent-object keys causing false invalidation,
missing cloud metadata in application copying, conflicting schema `const`/`enum`,
unknown cloud fields blocking local history, corrupt/rolled-back cloud generations
being treated as destructive revocation, and a misleading final-dispatch race test.
Abort while a consent read is pending releases its lease and cannot authorize a
late result. Focused review was by the existing Azure subagent; this remains
source evidence, not independent product acceptance.

## Verification

- Pinned Node.js 24.19.0 / strict TypeScript build: pass.
- Complete Backend `node --test 'backend/dist/test/**/*.test.js'`: **1664/1664**.
- `fvm flutter analyze --no-pub`: no issues.
- Ten affected Flutter test files: **143/143**, covering Settings, draft/revision
  recovery, cloud DTOs, source/history UI, consent gate, Persona composition,
  content coherence and offline store. Serialized with the existing Flutter lock.
- Actual Firebase Admin / Firestore emulator: **3/3**, covering competing quota
  reservations, committed-but-unacknowledged quota recovery, and consent save /
  stale revision / lost acknowledgment / replacement epoch. Isolated demo project
  and loopback endpoints only. No real Firebase account data; permissive emulator
  rules do not prove production IAM. This is adapter replacement, not an OS restart.
- `git diff --check`: pass. No APK build/install or real-user model call.

Commands use standard `backend/dist`; the focused emulator command is
`node tool/run_cloud_quota_emulators.mjs`. Flutter files are
`backend_account_preferences_test`, `preferences_recovery_test`,
`account_preferences_flow_test`, `cloud_provenance_wire_test`,
`ai_owned_sources_wire_test`, `ai_conversation_page_test`, `ai_consent_gate_test`,
`persona_preview_composition_test`, `content_coherence_edges_test`, and
`offline_social_store_test`. Public receipts include no credentials or user data.

## Still closed

No tested model has passed acceptance. The newest authorized free-model run
[stopped at 3/24 requests on HTTP 429](../2026-10-28-li-ai-repair/groq-qwen38-partial-assessment.md),
with two assessable responses and material/borderline semantic failures. Total
Groq calls are 99, US$0; 21 of the new grant were not sent. No retry or fallback.

The production entry point, Persona/F0 shared cloud owner, client cloud-mode
selection/old-client upgrade boundary, verified tokenizer/framing bound, real
quota initialization and exclusive-host cutover remain incomplete. Azure VM,
Firebase workload identity, HTTPS and public endpoint are not deployed. VM/network
free allowance coverage and Google's workload-identity prerequisites remain
unverified; student credit is not proof of permanent free hosting. No paid Ollama
plan, new credentials, IAM grant or real database migration is included.

The existing installed app still needs the personal host. Phone mobile-network
login/functions/AI with that host off, and a new cloud installation package, are
not yet acceptance evidence. Do not mark cloud deployment, Release or Done.
