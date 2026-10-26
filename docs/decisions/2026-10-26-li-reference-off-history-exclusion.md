# LI: reference off excludes the current inherited exchanges

Confirmed by LI on 26 October 2026 after physical v32 testing: choose
“改为关闭后自动跳过旧问答（推荐）” in response to the concrete proposal that
turning Check-in references off also skips the most recent two complete
exchanges for this reply, while retaining their stored history.

The physical test received a first today-referenced reply, then an off-mode
execute returned `AI_CONTEXT_SELECTION_CONFLICT`. The off preparation had no
Check-in sources but retained an earlier exchange that depended on them.
Existing source-closure checks correctly refused that reuse. Neither a retry
nor a model cold start resolves that source-scope conflict.

When off, prepare the existing explicit empty source selection and exclude
every history pair in that exact preparation's bounded current window. Each
explicit send obtains fresh keys; do not reuse keys, backfill older pairs,
delete history, or automatically retry a rejected/unknown operation. The UI
must explain that off also skips the latest two exchanges for this reply.

This narrowly supersedes the separate manual whole-pair-exclusion interaction
for off mode in [the today-context contract](../../api/ai-today-context-contract.md)
and the inherited-history presentation retained by
[the earlier 26 October decision](2026-10-26-li-reference-and-event-usability.md).
The old rules remain visible in history. Manual/today source conflicts still
require review; carrying an exclusion choice across changed pair identities
remains prohibited. All backend source closure, authorization, precise snapshot
checks, original-target guards and unknown-result protection remain unchanged.
No API shape, data schema, retention rule or dependency change is approved.
