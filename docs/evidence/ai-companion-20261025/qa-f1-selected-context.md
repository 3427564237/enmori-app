# QA — selected context and explicit history exclusion

25 October 2026. Independent source/fake review of Context
`362d8cb56fff9a2f03a813551896a09e9231c85b`, proof hardening
`cf52a272a9dd0268a45b0ee56174c0fec7d13910`, and recovery candidate
`26dd48cae40a20a571d73731ea696fde1854259f`. The executable heads were frozen
with `git archive` and compiled into private outputs with the pinned toolchain.
No model, Emulator, real-account or notification call was made in these checks.

## Initial boundary and missing recovery

At `362d8cb`, QA independently passed **17/17 selected-reply** tests and **3/3
prepared-selection/reply-association** tests with global fetch blocked.
The reviewed path uses exact owner-selected IDs, at most five sources within
the inclusive seven-day window, actual mutable snapshot metadata, bounded
observation timing and purpose-generation/source-version revalidation. It
does not turn on the older immutable-Note prerequisite.

Prepare/execute choices are operation-bound; omitted, incomplete, foreign or
stale keys do not acquire authority. Exclusion wins over inclusion. Sources and
dated AI reply quotations remain data; private IDs, source versions, location
and weather are excluded from the model projection. Selected-source changes
after dispatch reject publication while preserving the saved user message.
Current Persona expression is captured for the operation; later editing or
active switching is distinct from permanent deletion.

QA found a concrete recovery gap despite these passing boundary checks. The
Store correctly rejected history whose dependency B was not selected or was
excluded, but execute offered only Check-in keys. There was no explicit way to
exclude the dependent complete pair. An older-than-seven-day source could not
be selected again, leaving the same topic unable to continue. Context confirmed
this gap. Starting a new topic or the prototype's button did not establish the
approved same-topic recovery behavior.

Integration's final technical contract uses prepared `historyPairs` and
execute `excludedHistoryKeys`, bound to the existing `selectionRevision`.
The temporary `historyMode` candidate was not selected. This fills the approved
one-reply exclusion behavior; it neither deletes saved history nor grants old
sources, extends the seven-day window or silently removes dependent text.

## Recovery candidate review

At `26dd48c`, QA independently passed **21/21 selected-reply** and **5/5
prepared-selection/exclusion** tests. These overlap the earlier suite and are
reported separately by head, not summed as 46 distinct cases.

The current top two complete canonical pairs are captured as identities in the
same prepare transaction, without supplying their text or underlying Check-in
IDs. Fresh UUID history keys are bound to the prepared operation. Explicit
exclusions affect those whole pairs only; excluded text/receipts are not borrowed.
The Store selects the top two before exclusions and never backfills an older
pair. It rechecks the full prepared window at each effect, including when every
pair was excluded. A newly completed pair invalidates the old snapshot rather
than inheriting its exclusion decision.

The actual executor/reader/Store fake path established same-topic continuation
after explicit exclusion for both unselected B and an eight-day-old source.
The exact draft was supplied to the model fake, excluded content was absent,
and saved old messages remained byte-for-byte unchanged. Other cases establish
no third-pair backfill, no execution/write on a changed window, rejection of
unknown/duplicate history keys and inability to transfer old keys after a new
prepare. `cf52a27`'s strict category proof and complete internal selection check
are included in this head and its focused suite.

This closes the original gap at the reviewed Context source/fake boundary.
Root's HTTP allowlists, both reader callback injections, transient I/O tracking,
the actual UI review-and-Send flow and Emulator behavior require their own
composition evidence. Unknown execute outcomes still require an original-
operation read; exclusion recovery is not permission to resend them.

Subsequent [actual Root composition QA](qa-composed-first-flow.md) at `d992ea9`
adds independent bootstrap/HTTP/Auth/Firestore evidence for selected publication,
same-topic explicit recovery and source-edit rejection. Its model HTTP is fake;
real-model semantics and App interaction remain separate gates.

## Evidence

Private directories:
`/home/miku/.local/state/enmori-ai-companion-20261025/qa-review/context-362d8cb/`
and `context-26dd48c/`. Both pinned builds and all four targeted test commands
exited 0. No author's wider test total is counted as independent QA execution.

| Head and log | SHA-256 |
| --- | --- |
| `362d8cb/selected-reply.log` (17) | `77bb7f2e1b7e9bdad65a1c94593a41a1ae1f5ef82736bbd3ddc63bc230f33baa` |
| `362d8cb/prepared-selection.log` (3) | `22278529f9f69a0dd004fb17caa8f8c33107a0b01c084a614235fcf2f80f183c` |
| `26dd48c/selected-reply.log` (21) | `77265fd3b7f47f48eb729f44aee819af8e7cc16c3f5c29e978a5cdb1948336b8` |
| `26dd48c/prepared-selection.log` (5) | `6b5c4534096777a13ac785b26a7fb4f7789bed692ba2db082b6702eceaa8eeb2` |

## Later HTTP correction for retained late retries

Integration `d1dece9c407923594ffb053884895032d05ec47a` corrects the prepared
history DTO validation for an existing Store behavior. A failed U1 can remain
retryable while U2/A3 completes; retrying U1 can then create A4. The canonical
history window sorts its last two complete pairs by assistant sequence, yielding
`[(U2,A3),(U1,A4)]`. Requiring each later user's sequence to exceed the earlier
assistant's sequence incorrectly rejected that valid metadata with 503.

QA inspected `readRetryUser`, `claimRetry`, assistant append and `historyWindow`
and confirmed this is consistent with the retained Store behavior. The small
HTTP change preserves each pair's positive integer `U < A`, unique history keys,
unique message IDs, unique sequences across all messages and ascending assistant
sequences. It removes only the invalid cross-pair user ordering assumption.
Store history selection, saved messages and model projection are unchanged.

QA froze this exact head, compiled privately and independently passed **4/4
selected HTTP tests** with global fetch forbidden. The added test exercises
the valid late-retry shape returning 201 and reused sequence returning 503;
the other three are existing locator/allowlist/source-shape/transcript cases.
The unchanged ID checks and assistant ordering were source-reviewed. No Emulator,
model, Flutter or phone was run. Private evidence: `qa-review/root-d1dece9/` under
the round state directory. `selected-http.log` SHA-256:
`913c5cf73d21333dd0e8fa1fdab328175a6a1ace74ea81eeb8aa757ff303d926`.

These four tests overlap the earlier three-test HTTP checkpoint and are not
four additional distinct cases. The actual single F1 model attempt remains
bound to `6bab960` and used a new topic with empty history; it is not relabeled
as a run at this later source head.

## Client Domain and wire: source review only

Reviewed Domain `090e99636063c606d0a1b815918177fff93fc05b` and the final Domain/wire
at `a7a288ff63d695078a16359b05ee669b9ee2b49a`. QA inspected the eight new test
cases as source but did not run Flutter, copy/repeat those tests, take a service
slot or invoke a model. No actionable defect was found in this bounded source
review. It does not establish compilation, test success or completed App UI.

The wire request uses only explicit safe Check-in IDs, at most five unique
values, with local processing. Retry requires a valid saved-user ID and a
conversation ID. A zero-source selection remains an explicit selected request.
Prepare validates the returned conversation, exact allowed fields, matching
operation/selection expiry and card count. Source cards contain the minimized
metadata only; source timestamps retain their supplied nanosecond text. Domain
source/history lists are unmodifiable and their opaque keys are request-scoped.

The history decoder accepts the retained late-retry ordering described above,
while checking each pair's positive `U < A`, ascending assistant sequences,
unique message IDs/sequences and disjoint unique selection/history keys. The
source/card shapes and time representations match the backend transport's
current projections. This is a comparison of contracts, not an executed Dart
decode of the earlier redacted HTTP capture.

Execute validates choices against the current prepared keys, requires every
source to be included or excluded, and rejects foreign/duplicate history keys.
An inclusion/exclusion overlap is intentionally permitted because exclusion
wins on the server. The shared execute path retains the original operation
ticket/key, limits text/body size and validates returned operation/conversation,
ordinary U/A ordering and exact submitted user text. There is no ordinary-send
fallback or automatic replay for a selection conflict.

The existing wire call keeps abort/transport failures unresolved and dispatches
once. Source inspection of the existing controller confirms that every failure
after dispatch sets its unresolved memory, including an invalid response mapped
to `unexpected`; that path does not release the input for direct retry. The
new F1 controller/picker/review integration and final shared composition were
not frozen at this review and require their own checks.
