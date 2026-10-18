# Independent review: bounded open conversation increment

Reviewer: local Event agent, distinct from local AI author. Authority: [19 October Sponsor demo decision](../../decisions/2026-10-19-li-sponsor-demo-local-takeover.md). Reviewed only new code from baseline `97b169f6f13b2af44ee2cde1fddb52d8b92386c9` through AI source `3880a5a0d99ee0271a15326ad5009ea176ac99e5` and corrective delta `dfe7bfea64be786bea60477c53a854d7f8e4d513`.

**Result: no remaining blocking finding in the reviewed increment.** This is source/test review, not connected-runtime, model-readiness, device or whole-application acceptance.

The initial independent synthetic probe demonstrated three actual gate failures: unsupported “You live alone in Singapore.”, future mutation “I will delete your note.” and contracted mutation “I've saved your note.” were accepted. The author’s `dfe7bfe` adds the exact counterexamples, additional tense/private-fact cases and conservative support checks. Independent re-probing the pinned final source rejects all three as `unsafe_output` while an ordinary conversational follow-up remains accepted. The initial failure remains part of this record.

Source review confirms:

- `open_conversation_v1` is an explicit internal selection; default legacy policy/prompt and its counterexamples remain intact. Public assistant schema remains v1.
- Full current message, authorized Note/Persona projection and at most two complete history pairs are serialized and token-counted without truncation; role-control text is escaped.
- History is owner/conversation scoped. Latest two complete pairs are selected before exclusion and ordered by completed assistant sequence; older pairs do not backfill. Unknown reads fail. Used pair identities and source authority are rechecked before generation and inside actual content-write transactions.
- Source loss rejects new descendant writes before reply content is borrowed. History source dependencies retain existing producer prerequisites, purpose-generation checks and fail-closed handling.
- New conversation reuses the existing reserved-new prepare path on the next explicit send, preserves prior persisted messages and the current unsent editor value, and remains unavailable during generation/reads/deletion/unknown outcomes.

Independent verification used a detached, pinned review worktree at `dfe7bfe`, fixed Node24.19.0 and existing dependencies. TypeScript build passed; the full Backend suite passed **1001/1001, zero skipped/failed**. The author separately reports actual isolated Auth/Firestore **25/25**, focused AI Flutter **194/194** and clean Flutter analysis; those runs were not repeated or relabelled as independent device/model evidence here.

The semantic gate uses conservative concrete text checks and may reject safe responses; it is not a proof of universal natural-language grounding. Native 9B continuity, ordinary input acceptance, over-budget recovery, source-authority changes, page exit/readback/reuse and cancellation remain final combined-runtime/device acceptance tasks. No old native failure was replaced or promoted into a successful result.
