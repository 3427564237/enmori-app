# ZHOU complete-package execution record

- Source ID: `S-USER-1020-ZHOU-COMPLETE-PACKAGE`.
- Human request, 20 October 2026 (UTC+08:00): “按照要求检查并完成任务 还要在github上面进行内容交叉核对确保任务的正确和一致性，有审批任务一并完成这是本地工作区 D:\\3851 AI”.
- Attached task: `zhou(1).md`; supplied source archive manifest HEAD `927f77527b32d349aa08020f7de0e88402edb9c7`, feature/UI baseline `51ecb5c11ff23ce3bf36fbf9280d2e00646ac857`. Every manifest file hash and baseline ancestry passed before work. Existing checkout and untracked evidence are preserved.
- Execution identity verified through GitHub: `YaoyinZhou3922` (ZHOU). This records the user's execution request; the product authority remains the attributed PM decisions below.

## Existing authority and activation

The actual forwarding and execution of the revised complete ZHOU package activates the corresponding scope of [S-PM-1019-LI-LOCAL-UI-HANDOFF](2026-10-19-li-local-ui-handoff-preparation.md), under its “实际转交新版包时” clause and final “继续本机工作并分工” confirmation. Preserve [the paused earlier owner package](2026-10-19-li-checkpoint-owner-packages.md), [local-first arrangement](2026-10-19-li-local-dependencies-first.md), and [core feature decision](2026-10-19-li-core-feature-delivery.md). Only the revised ZHOU implementation assignment replaces the earlier single-chat allocation; no LI host, other owner, or final router/bootstrap responsibility transfers.

Core item 12 already approves the full Persona fields, at most five, one current, default expression after deleting current, unsaved-exit/confirmation, and a separate unsaved/unactivated/non-history preview. Core item 11 and [AI-MVP](2026-10-19-li-ai-mvp-simplification.md) retain Ollama, same-account conversation history, consent, original-result inquiry, capacity and timeout boundaries while disabling the superseded content filters/tokenizer/automatic Note text inclusion. The attached revised package explicitly calls for new/history selection, recovery, near-bottom message following, necessary minimal Backend/contracts and strict fixtures.

## Bounded implementation contract delta

1. Extend existing Persona records/DTOs with `relationship`, `shortIntroduction`, `description`, `personality`, `communicationStyle`, `interests` (custom text), and `extraInstructions`. Absent legacy values read as empty strings; malformed present values fail closed. Existing name/options, revisions, create idempotency, capacity and ownership remain. No migration, default sharing, or data deletion is introduced. Free text affects expression only in the explicitly simplified local-chat path; the old bounded v1 mode retains its limits.
2. `POST /v1/me/persona-preview` carries the current `draft` and `text`, returns only `message`, and has no Persona/history persistence capability. Reuse verified identity, completed owner, current optional-processing consent/revocation generation, shared model lane, current request/deadline, existing 2400-character message and HTTP capacity conventions. No Note, candidate, location or other account-data lookup is added. See [the precise Persona contract](../planning/2026-10-20-zhou-persona-expression-preview-contract.md).
3. `GET /v1/me/conversations?after=<UUID>` supplies at most 20 own live conversation summaries (`conversationId`, `lastMessageAt`) with an optional last-scanned-ID cursor, using the existing account subcollection/document-ID ordering and retention checks. No message/title preview or new storage/index. Current Auth/owner/consent are checked again after reads. This narrowly supersedes the earlier mobile candidate's no-discovery restriction for this explicitly assigned history selector; other operation/result/retention boundaries remain. Selecting or starting another conversation cannot bypass an unknown current operation; an original-result inquiry is still required.

These wire/adapter details implement the already approved package inside the existing architecture. No new dependency, deployment, model, global theme, retention duration, permission or recommendation algorithm is selected. Root composition support is opt-in; LI receives the small final runtime/app integration patch and owns applying it to the active candidate.

## GitHub and review boundary

Read Issue #83/#44 and current #162 before implementation. The forwarded ZHOU task text matches #162's task blob; #162's newer shared/SHI/DU work is not copied over this independent base. Publish one focused Draft against `souma/li-shi-du-integration-20261020`, keep source SHAs and old evidence, and submit only genuinely assigned independent review. SHI component review on #162 found a reproducible callback-reset defect; this is separate from LI's review/acceptance of this ZHOU-authored package and existing #159. No self-approval, main merge, release, project closure or whole-app acceptance is authorized or claimed.

Missing LI host, credentials, device, or model means the corresponding actual checks remain **Not Run**; isolated fixtures are identified as fixtures. Continue all independent implementation and checks without changing LI's private environment.
