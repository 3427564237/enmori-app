# AI round 2 — find a message in the current conversation

Authority: [confirmed second-round PM delegation](2026-10-23-li-product-round2.md), directly verified against the human reply in source chat `01a15293-dbcf-75e2-b020-398d61d677cb`. This records the AI owner's implementation choice within that delegation, not a new data-use rule or acceptance claim.

## Audit and selected increment

Baseline `4d9cbf926d356320bc9b4721031e3c50dddd9fae` already contains the complete first-round AI/Persona delivery. It provides conversation discovery, message pagination, explicit continued chat, deletion and Persona preview. It does not provide text lookup inside a conversation. The existing conversation-list API deliberately returns only ID and time; this increment does not add titles, content previews across conversations, saved searches or another index.

The new path is **Find in conversation → enter text → open a matching message with adjacent context → return to the same chat and continue explicitly**. Search covers only currently loaded, available persisted messages in the selected conversation. The page says so, retains the query during an explicit earlier-page read and offers manual pagination through the existing `readMessages(before)` path. No-match is not a claim about unloaded messages. A result is resolved by message ID against current controller state, never a copied message snapshot.

Queries and selection live only in page memory. They are not sent to Backend/model, stored, logged, shared, used as context or inserted into the composer. Return preserves the existing chat draft. Search does not send, retry, cancel, switch conversations, resolve unknown operations or change Persona. Pending/unknown states do not admit search. Session, consent or conversation replacement invalidates the page and removes query/results; current unavailable tombstones are never searched or reconstructed.

This uses existing owner-authorized message reads, architecture, locale, theme and motion. It changes no Backend contract, permissions, retention, persistence or dependency. Q19 lifecycle, later approved Persona amendments and the 19 October simplified context limit remain. First-round small-plan relevance remains unpassed; the 58 failed probes and original evidence remain untouched and no model diagnostic work is performed.

## Verification boundary

Targeted fake-provider/widget checks will cover query scope, matching/context, explicit pagination and read failure, draft preservation, tombstone changes, session/consent invalidation, unknown-result guards, bilingual copy and narrow/large-text layouts. Integration owns serialized Flutter validation, candidate assembly and any later service acceptance. This round excludes shared runtime changes, real account writes and device operations.
