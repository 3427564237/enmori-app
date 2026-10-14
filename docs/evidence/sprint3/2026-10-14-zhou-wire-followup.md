# Zhou N01 consumer and network follow-up, 14 October

This is the isolated follow-up to reviewed #103. LI's exact-source acceptance is
preserved in `docs/decisions/2026-10-14-li-reviewed-component-disposition.md`, copied
unchanged from #106 at `a0ceb620b465847feb04815f389b2c94d9d73cd5`.

## Source inputs and review boundary

- #103 `1af4d391546cbb456988da526f37109f86671638`: LI independently approved the
  unwired Application/reader/mobile component, review `5516236916`.
- #105 `784ed9a34f565083a3bc7d4fe2e70c960b117f90`: imported into this development
  checkout by a local Git merge. JIN owns these storage/HTTP/gateway changes;
  their new-source review and actual production composition remain separate.
- #106 `a0ceb620b465847feb04815f389b2c94d9d73cd5`: the AI page is copied unchanged
  to preserve LI's social renderer and guarded Persona callback. The shared
  Home/router/shell is not edited in this follow-up. DU reviews #106 separately.

The local source merge does not merge either GitHub PR, change main, close an
Issue, update Project state, enable a runtime, or approve the combination.

## First follow-up interface checkpoint

`ports/application-conversation-operations.ts` supplies a vendor-free consumer
boundary for selected N01. Ordinary reads, retry metadata, deletion, identifiers,
authority and execution are injected; absent suppliers fail unavailable. An
actual synchronous complete-body sink capability is required before execution.
Returning a pair for a later `reply.send` cannot stand in for F02 acceptance.

At this checkpoint `node --version` reported `v24.19.0` and
`node node_modules/typescript/bin/tsc --project backend/tsconfig.json` passed.
This is compile evidence only. Consumer implementation, network tests and a
joined Application/store/HTTP journey are not claimed by this checkpoint.

## Local gaps and handoff

JIN's concrete adapter must provide authoritative original-U metadata immediately
after definite User ACK and canonical U/A projection after Assistant settlement.
The lower store's void User ACK cannot be replaced by a made-up clock or sequence.
The route must accept the complete serialized pair inside the guarded completion
event, and avoid sending the accepted response a second time. These are the
specific producer seams handed off in #105 comments `6166193205` and `6166243370`.

DU's #44 comment `6165457742` establishes immutable Note/time within app/API
scope, but not permanent no-restore/no-ID-reuse or external/restore writer
guarantees. Dependent Note read/current/cleanup behavior remains unavailable;
independent approved empty-source, UI and storage work continues. A controlled
empty-source fixture is test evidence, not a declaration about ordinary data.

Real model-host, restart/unknown-write/cleanup, physical device and complete
service journey gates remain separately evidenced. No source registry,
incarnation, migration, dependency, infrastructure or deployment choice is added.
