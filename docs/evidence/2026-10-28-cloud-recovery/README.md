# Cloud independent-request recovery — offline implementation receipt

Authority: [LI approval](../../decisions/2026-10-28-li-cloud-independent-request-recovery.md),
following the retained [proposal](../../planning/2026-10-28-cloud-unknown-operation-policy-proposal.md).
Source commit: `f4ecb616ed56638a60a8f9793d5b3683006a16f0`. [Commands, file hashes and results](verification.json).

## Result

Strict TypeScript compilation passed. The complete Backend suite passed
**1609/1609**; the isolated evaluation-tool regression passed **38/38** on Node
24.19.0 and TypeScript 7.0.2. Neither suite called a real model or cloud store.
The ignored local logs are hash-bound in the receipt. This is author validation,
not independent review, production recovery or semantic/model acceptance.

The explicit cloud runtime preserves remote unknown outcomes while releasing
application admission after a terminal outcome. Independent new work can run;
original target/operation guards remain. Late responses cannot persist or deliver
text, clear a newer request's lane, or replay the old operation. The original
local physical-settlement Port and default Ollama quarantine behavior remain.

One admission owner shares the per-user scheduler across synthetic chat,
Persona and first-flow consumers. Request/token reservations precede preparation;
unknown attempts consume quota. Opaque, single-use dispatch permits bind the
original cancellation signal, deadline and reservation, and cannot be renewed
with a fresh budget after expiry. Quota expiry never claims remote termination.

Tests cover unknown and late results, cancellation/deadline races, original
same-target protection in the actual Conversation Application with fake store,
independent new requests, expired/forged/reused permits, provider-429-shaped
unknown results without retries, shared consumers, lease loss and restart
recovery with fake authority. Unknown authority writes fail closed before
preparation or provider dispatch.

## Remaining integration boundary

The cloud owner starts closed and requires a trusted recovery authority. This
change supplies its Port and fakes, **not a durable authority implementation**.
A real composition must establish atomic quota/epoch ownership, restart-safe
clock accounting and original operation authority without replay. Persistence
changes require their separately identified contract. There is no new API,
Firestore schema, dependency, credential, provider adapter or Bootstrap wiring.

The generic limiter implements one configured accounting window; it is not a
complete Groq minute/day quota system or tokenizer. Actual input/output bounds
and all provider limits must be verified before production composition.

All 72 previously authorized Groq synthetic calls remain consumed. The latest
candidate passed only 16/24 semantically and was rejected; no failed model was
adopted and this implementation adds no model calls. Azure account preparation
remains separate from deployment. The personal-host service is still required.
