# AI product increment — 23 October 2026

Source: LI's six-chat product-round instruction in source chat `01a15293-dbcf-75e2-b020-398d61d677cb`, delivered to AI chat `01a1689b-1e74-7c10-8268-48613e5c668c`. The source user's explicit six-chat collaboration answer was verified by reading the source chat. This record captures the bounded delegation; it is not acceptance evidence.

## Authority and supersession

LI authorizes this AI owner to select and implement one useful product loop using existing approved data and interfaces, reorganize AI/Persona internal layout and copy, and deliver a Draft PR targeting `souma/li-zhou-runtime-20261020`. This supersedes earlier UI-only defect restrictions and the previous single-chat implementation ownership only for this product round. Integration owns shared routes/theme/motion and shared runtime/device validation; Backend owns normative API and model/service changes. No main merge, deployment, new dependencies, shared service mutation, or real account testing is authorized here.

Preserve [Q19 lifecycle](2026-09-01-persona-conversation-lifecycle.md), as explicitly amended by [19 Oct core scope](2026-10-19-li-core-feature-delivery.md), [local AI simplification](2026-10-19-li-ai-mvp-simplification.md), and [20 Oct draft preview contract](../planning/2026-10-20-zhou-persona-expression-preview-contract.md). Five Personas, unique active selection, current deletion to default, explicit activation, draft-only independent preview, consent/session invalidation, and unknown-result readback remain unchanged. No new data use or source authority is implied.

## Selected implementation within that delegation

The AI owner's design choice is a guided small-plan composer: the user supplies a goal and optional limits, reviews the resulting message, and places it into the ordinary editable composer before explicit Send. This is local text composition using only direct input; no journal, friend, activity, location, or account-profile content is fetched or attached. Existing draft content is preserved until the user applies the reviewed message. Existing send/cancel/unknown/history controls remain the only chat dispatch mechanism. Existing 2400-scalar message capacity is displayed without silent truncation.

Persona draft preview gains a more reachable editor action and a clear return to editing. Preview remains an independent real service call with no save, activation, or history write. The full draft is supplied, including unsaved expression fields.

The existing Ollama adapter requests `stream: false`; the client receives a complete JSON result. Waiting feedback is not streaming. New context or streaming protocols are deferred to a separately concrete Backend contract. No architecture/data model change is selected.

## Completion evidence

Start from exact `7cf12cd398eb1a613eff2e5c867af5a623428cf5` in the existing managed worktree. Verify the new compose/review/send path, cancel preservation, session/consent change, message bounds, and Persona preview/edit continuity with targeted local tests. Preserve historical v24 evidence as a baseline only. Real model and phone acceptance is separately coordinated by Integration.
