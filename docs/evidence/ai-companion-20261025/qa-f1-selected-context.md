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

## Pure review component: source checkpoint and final-flow test selection

QA independently read `cad5fb430091f01492a586143d2dcaf7bb4c9414`, which adds
`AiSelectedReplyReview` and its test file. No Flutter, service or model was run
for this checkpoint. Integration's reported six component cases plus twelve
shared router cases remain author evidence, not independent QA execution.

The authority used is the approved LI first-flow decision, its explicitly
referenced Context `ce0a5ed` F1 scope, and the current Integration-owned
`api/ai-companion.json` selection/history schemas. The Product
`history-exclusion-handoff.md` explains those approved recovery interactions;
it does not create new requirements or replace the normative schema. The
earlier proposed `historyMode` alternative remains superseded by the current
operation-bound `historyPairs` / `excludedHistoryKeys` contract.

No blocking defect was found in this pure component's bounded source review.
It displays minimized source type/time metadata and complete history-pair
sequence labels, without rendering opaque keys, versions, IDs or source bodies.
UTC text retains its supplied fractional precision. Confirmation, exclusion,
refresh and return are distinct callbacks. Busy/expired/confirmed state and
foreign history exclusions disable confirmation; exclusion is unavailable when
busy, expired or every shown pair is already excluded. Returning remains
available while busy. Its six test sources cover these display/callback states
and action reachability at 320 px / 2x text in both languages; QA has read but
not run them.

The component does not own an auth token, operation ticket, clock, repository,
draft or navigation. In particular, its `expired` boolean is supplied by the
caller; the 15-second label does not enforce a deadline. Its callback interface
cannot by itself prove that an older captured Confirm/Exclude callback is still
bound to the displayed revision. These are final caller obligations, not defects
in a component whose stated responsibility is presentation only.

Once App freezes the complete picker/controller/page head and Integration
assigns the next exclusive window, QA will select the smallest existing tests
that establish the following six boundaries, adding a focused counterexample
only where the final source/tests leave a meaningful gap:

| Boundary | Minimum distinguishing observation |
| --- | --- |
| Original preparation token and expiry | A valid reviewed Send uses the original prepare token/ticket and request-local keys even if the auth port can now return another token. At the original absolute expiry, confirmation/Send cannot execute, silently obtain another preparation, or restart a 15-second period. Draft and manual choices remain. |
| Changed source selection and history review | Editing the selected set retires its old confirmation. Owner/time/count boundaries remain at most five own Check-ins in the inclusive seven-day window. Explicit whole-pair exclusion gets a fresh preparation; a changed pair identity/window cannot inherit old confirmation or old opaque keys. Captured old Confirm/Exclude callbacks cannot approve a new unseen revision. |
| Confirmation and return keep the draft | Review Confirm/Cancel return to the existing draft without execute or ordinary-send fallback. An eventual explicit Send dispatches once with the currently reviewed selection. Temporary exclusion does not delete stored messages or Check-ins. |
| Unknown dispatched outcome | After execute is dispatched and becomes unknown, prepare/send/review actions cannot create another attempt or operation. Recovery reads the original operation; only an authoritative result permits the existing applicable recovery path. A selection-conflict review path cannot bypass unresolved dispatch. |
| Source change or loss | Local invalidation or a current-source verification failure retires the old review/body. A source-change/selection failure preserves appropriate draft/choices and requires explicit fresh review, without silently dropping a source or falling back to ordinary Send. If a user message may already be saved, preserve the original-operation recovery fence. |
| Exact session and retired callbacks | Same-UID replacement during preparation/review/dispatch invalidates the original actor's callbacks and late results. Old choices, tokens or confirmation cannot populate or send for the replacement session. Returning/cancelling a review cannot let its late response reopen a retired review or mutate another page's draft. |

The unknown row deliberately concerns dispatched execute. It does not invent a
new rule that every failed pre-dispatch preparation is a saved user message.
Final test names/counts will follow the frozen implementation and observed
results, rather than being claimed in advance. Existing independent Backend,
wire-source and one-case model results remain at their original heads; this
plan does not rerun or broaden them. Shared composition, responsive presentation,
real service/model and physical-device acceptance remain separate gates.

The component, its test source and the exact authority/schema snapshots are
preserved under
`/home/miku/.local/state/enmori-ai-companion-20261025/qa-review/root-cad5fb4-source/`.
The eight-entry `review-source-manifest.json` SHA-256 is
`6a7cd3cd561e1efdca3d5562c04e3959bd1719e35f2fd8aee0b37a7ce9e6faa8`;
component SHA-256 is
`e3534740ff9bd68c94f2c00915b561845ad52dba2f6bafa8c6a0fad21364b52f`.
QA holds no Flutter/Emulator/model slot at this checkpoint.
