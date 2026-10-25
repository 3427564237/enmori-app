# App F1a and Check-in entry independent Product review

25 October 2026 · Product / UX · source inspection only, no Flutter execution.

App checkpoint: `ee448278bce86766238f2b049b0822e21c5540ad`, parent
`af2a79c994a1f80be520dd0d434026656e374650` (Root's pure review panel as an App
cherry-pick). Product read its nine changed files from an immutable Git archive.
Shared entry checkpoint: `a20927c063b9ef20e38fa8fdac7b252f54c60bda`, including
App cherry-pick `721a253`; Product separately read the four shared implementation
files and two added route cases. Source locations below refer to these exact
checkpoints, not a moving worker checkout.

Authority remains [LI's first-flow decision](../../decisions/2026-10-25-li-ai-companion-first-flow.md),
[the interaction specification](interaction-spec.md), and the approved
[history-exclusion handoff](history-exclusion-handoff.md). The repository
Flutter/Dart review checklist supplies a workflow, not new requirements.

## P2 — invalidated pending Send can leave selection permanently busy

**Open at `ee44827` and its `a20927c` integration.** App reported this during its
post-freeze self-review. Product independently confirmed the source path; Product
has not executed an old-head widget counterexample.

1. `ai_selected_sources_providers.dart:637–646` sets both `_sending` and
   `_recoveringSelected` when the explicit selected Send is admitted.
2. At `180–191`, a foreground/source-access change replaces `_epoch`, clears
   displayed records and pending review, and clears `_busy`, but retains
   `_sending`.
3. The original Send await at `664–667` returns early when that epoch changes,
   before clearing `_sending`. Original-operation readback reporting no-effect
   or user-saved does not enter the success-only listener at `162–168`.
4. `review()` at `535–537`, confirmation at `598–606` and `canSend` at
   `623–634` therefore continue to reject the selection even after the original
   operation authoritatively permits a fresh Send or the exact saved-user Retry.

Counterexample: explicitly send a reviewed selection; while execute is pending,
background/cancel and resume, or invalidate source access; use the original
operation GET and receive no-effect; then attempt a fresh review with the
preserved draft and selected IDs. The stale local sending flag blocks recovery.
Accepted assistant-saved readback can clear it, but that does not repair the
no-effect/user-saved paths.

The repair must release the obsolete local sending display state while keeping
the original unknown-operation barrier, exact selected IDs, matching draft and
recovery identity. Background/resume, cancellation or source invalidation must
not itself reprepare, resend, clear the original operation or manufacture a
no-effect result. App is preparing a separate increment; the original head and
finding remain recorded. Integration and QA received the source anchors and
the focused recovery counterexample.

## Other inspected boundaries

No additional blocking source finding was identified in this bounded review.
That conclusion does not close the P2 above or claim independent execution.

| Boundary | Observed implementation and exact source anchors |
| --- | --- |
| Explicit bounded selection | `ai_selected_sources_providers.dart:18–46,224–255,345–486` projects only ID, Note, recorded Mood/Activity, original time and revision into RAM. Defaults are empty, the sixth choice is rejected, and eligibility is inclusive now minus seven days through now. Eight UTC date first pages cover the rolling window; more pages require an explicit cursor action. Failed dates/cursors remain partial/unknown, with existing rows retained. |
| Fresh source review | The same file at `488–595` rereads the exact selected owned IDs before and after preparation. Missing/unknown reads remove their retained body but preserve the selected ID for recheck/removal. A changed Note, recorded tag, timestamp or revision invalidates confirmation. Prepare sends source IDs, not client quotations or invented authority. |
| Private preparation and expiry | `ai_conversation_providers.dart:377–553` keeps token and operation ticket private. Public selection state receives sanitized metadata. Remaining time is the minimum of the original monotonic 15-second budget and both absolute expiries. Send uses the original token/ticket, validates the current revision/key membership and does not prepare again or refresh credentials. Expiry retires confirmation and keys. |
| Explicit history exclusion | `ai_selected_sources_providers.dart:527–595,688–697` captures only the explicitly displayed complete pairs, prepares afresh, and maps that intent to fresh keys only when user/assistant IDs and sequences still match. A changed set clears exclusion and confirmation. An ordinary refresh does not inherit exclusion. The App submits only current keys; the server owns dependency closure and no-backfill enforcement. |
| Confirm and Send | `ai_selected_sources_page.dart:128–180` binds Confirm/Exclude/Refresh to the displayed revision and current route/session. Confirm returns to the draft; it never executes. Composer `_submit` uses the current editor lease and selected controller's current readiness. Only the separate Send/Retry action transfers the prepared selection to execution. |
| Original-operation recovery | `ai_conversation_providers.dart:556–763,945–1025` transfers selected execution into the existing dispatch/cancel/readback machinery. Conflict or unknown does not grant another Send; original GET can establish no-effect, exact saved U for Retry, or accepted assistant pair. `ai_selected_sources_providers.dart:151–168,637–684` retains selection through reserved-topic/no-effect identity changes. The P2 above is the remaining local busy-state defect in this path. |
| Draft and privacy fences | `ai_conversation_providers.dart:801–808` clears only a draft still matching the accepted selected submission. The source controller separately retires bodies/review on content invalidation and clears selection on auth/consent loss or an explicit new topic. Page editor ownership preserves the current `TextEditingValue` across stacked AI pages and rejects a covered page's captured Send. |
| Explicit detail entry | At `a20927c`, `SavedCheckInPage._referenceInAi` rechecks the current exact saved record, foreground and top route. `AiCheckInNavigation` carries an ephemeral ID plus the exact authenticated session; the shared route rejects absent/foreign session extras. Composition supplies the current AI session key. Destination `_openReferences` in App rereads that owned ID without replacing existing choices, draft or topic. During an unresolved operation, attachment waits for safe original readback and another explicit tap; an old same-UID session stamp cannot replay it. |

The picker displays current Note as quotation and labels Mood/Activity as
recorded. Location, coordinates, weather, private provenance and opaque keys are
not rendered as reference facts. Saved source cards remain separate from this
one-reply selection. Successful accepted execution clears the local selection;
there is no later automatic source reuse in this reviewed path.

## Evidence and remaining gates

Product read the 25 new F1 controller/page cases, including narrow English and
Chinese at 320px and 2x text, stale callbacks, exact original-token use, time
boundaries, source edit/authorization failure, partial cursors, fresh history
keys, unknown/user-saved/no-effect recovery, detail intent and stacked-page
draft ownership. Their visibility helpers require a reachable hit-test target;
these are meaningful authored scenarios, not Product-executed results.

App's final author log was read and its SHA-256 verified:
`002babf00e62b0f9222f5b34fc67b1d21dda8e2c284ac32d9de5211a0648e816`
at `/home/miku/.local/state/enmori-ai-companion-20261025/app-f1-final.log`.
It contains **389/389** passing AI/proactive cases and clean four-directory
analysis in 11.8 seconds. App records that two final formatting-only braces
followed the test run; analysis then passed. The original four failures and
intermediate 15/19/385 checkpoints remain in App's evidence and are not added
together or relabelled as new independent checks. Those 389 do not cover the
subsequently identified P2 counterexample or prove Root's full integrated suite.

Product ran no Flutter, service or model request and did not occupy the shared
validation window. Root owns integrated source/widget execution; QA owns its
independent frozen-head counterexamples. Shared routing, backend/model quality,
D1 notification delivery, APK/device, UAT, Release and Done remain separate
evidence layers. This review changes no model-quality result and grants no
deployment, cloud-data or physical-device acceptance.
