# QA follow-up: repairs, prototype and scoped C decision

25 October 2026; independent reviewer QA / Evaluation. This extends
[the earlier exact-head ledger](qa-review.md), retaining every original failure.
No production code was authored by QA, and no real provider/model, service,
notification, credential, data-write or device operation was performed by QA.

## Scope change verified directly

LI answered `C：连续主入口＋历史／新话题（推荐）` in Integration's human
message `01a171b5-67bd-7ff0-9cfc-023225279b93`. QA read that answer and the
persisted decision at `2bb638b47e682217007cf02cd505550d88d627cf`,
`docs/decisions/2026-10-25-li-ai-entry-c.md`.

Only entry C is selected: existing containers, current-conversation search,
History, New topic, whole-conversation deletion and the existing single draft
boundary remain. Earlier unselected prototype labels are historical. Extra
context uses, source-display/resolver contracts, proactive storage/delivery,
retention, cloud spending and persistent preferences are not approved by C.
App's new C increment needs its own exact-head source/widget review.

## Context exclusion repair

Reviewed `3a32f11 -> 8ce74a82b635e6a7b0ada6b2d17255ecb09714c0`.
Exclusions now map record selectors to underlying sources, including Event and
participation and the shared Check-in/location source. A selected historical
pair that depends on an excluded source returns `invalid_selection` without a
model projection. Complete flattened inherited dependency metadata is explicitly
required; a reader cannot supply an unknown inventory as a proved empty list.

QA independently rebuilt with the pinned toolchain and ran Context **44/44**,
both exit 0. The original unchanged counterexample script now returns exactly
`{"kind":"invalid_selection"}`, exit 0. Original red output remains in the
previous evidence folder. **CTX-15's candidate source finding is closed at
8ce74a8**, without claiming that a real reader or UI consumer exists.

Logs are under
`/home/miku/.local/state/enmori-ai-companion-20261025/qa-review/context-8ce74a8/`:

| File | SHA-256 |
| --- | --- |
| `tests.log` | `6c064b8dfa5773b713f038d5a03499b828d5399e8ff662af9d2e9410b6dd97ae` |
| `original-counterexample.log` | `bb53ce6e9f8b4fb522ff3c6947308bb8a03f5dbb2a3a84429a3aa096f5dd4294` |

The consumer must preserve the draft/selection, visibly resolve the related
complete history pair and prepare again. It must not strip provenance while
keeping the text, call `invalid_selection` success, or assume Backend silently
removes history. Product's later 2e2e2fb specification now states this seam.

## Runtime repair and a new dispatch counterexample

At `ff39304e78ac9be1a353aff8d7fb66648125a8d4`, QA confirmed segment-aware
outside-repository checks and canonical owner-only output handling. Malformed
HTTP-200/null envelopes and missing terminal reasons remain unconfirmed; local
ineligible/incomplete batches return nonzero instead of silently continuing.
Strict build passed. Independent runs covered **31 distinct tests**: 14
adapter/evaluation tests and 17 cloud/path/existing-simple-chat tests, each exit 0.
The first command named a nonexistent cloud test path and consequently exercised
only the 14 reported cases; the explicit correct remaining paths were then run.
No unexecuted test is included in the count.

QA found a separate P2 in the new cloud runner: grant/cancellation checks preceded
durable intent writes, so an expiry or cancellation during that write could still
be followed by one HTTP dispatch. The following injected-save counterexamples
failed at ff39304, using fake HTTP only:

| Boundary | ff39304 observation | Required outcome |
| --- | --- | --- |
| Abort during count-intent save | One count dispatched, then CANCELLED. | Zero count dispatches. |
| Grant expires during count-intent save | One count dispatched, then AUTHORIZATION_EXPIRED. | Zero count dispatches. |
| Grant expires during generation-intent save | One prior count and one generation dispatched, then expiry stop. | Prior count may remain; zero generation dispatches. |

Runtime fixed this at `24f913dd26afa9af82f7c31ac9eefcf543b64140`. QA read the
actual HTTP-boundary check and composed count cancellation. A blocked dispatch
is now `not-started`; an already-sent uncertain request remains unknown. Existing
reservations are not refunded. QA ran the **13 cloud tests**, exit 0, and reran
the unchanged three counterexamples: all now have the exact required counts,
exit 0. **The P2 is closed at 24f913d.** This count overlaps the previous cloud
suite and is not a further 13 independent product acceptance cases.

Evidence is under `qa-review/runtime-ff39304/` (original red script/log and
initial runs) and `qa-review/runtime-24f913d/` (post-fix runs), below
`/home/miku/.local/state/enmori-ai-companion-20261025/`:

| File | SHA-256 |
| --- | --- |
| `runtime-ff39304/tests.log` | `11ce2e1c1de77e226866819811cf4488ce81a0ebc6b2246763a978244c094c82` |
| `runtime-ff39304/remaining-tests.log` | `d15e103697cca81a5a41af817d4aee42833716c47518f3b68932d71e6d4551e8` |
| `runtime-24f913d/cloud-tests.log` | `146e1e651ed05c10ad233db8458318be012a2c4dc3782098ae3817e3bfd32296` |
| `runtime-24f913d/original-counterexamples.log` | `980f141de4e791a509d662a419120d9cb1c4e4ff25a82bd51405a67fd4f4f661` |

The ff39304-to-24f913d diff changes only cloud runner/tests and documentation;
local runner, adapters, corpus and Backend source are unchanged. QA told
Integration/Runtime that the original local source blockers were closed.
Integration separately authorized the one fixed local24 slot; QA has not yet
received/reviewed its complete raw output at this checkpoint. No cloud execution
is authorized by these passing source/mock tests.

## Independent prototype review

Read Product's `12ca9b7` implementation, screenshot-only `f625e24`, and
`2e2e2fb9dbfdfd56bdf15322f685dca515f3cf30` clarification diff. Final Product
packet `c7adc9837850972018ddd91b3c5491256f09a230` only adds the subsequent C
decision status to README/evidence; HTML/JS/CSS/screenshots are unchanged.
Tracked design assets matched the inspected head during review.

QA used a separate cached Playwright CLI headless session against the loopback
static server. These checks concern an in-memory synthetic HTML prototype:

- Excluding a listed reference changes the included count to zero and preserves
  the exact unsent Chinese/English draft on return.
- Checking an unknown send result leaves it unknown with send disabled and the
  original text visible; it does not automatically resend.
- Cloud demonstration is disabled before its explicit checkbox. Local service
  is correctly distinguished from phone-local/offline processing.
- Unknown source state hides the old source title and blocks sending. Deleted
  source state removes the reply action.
- The notification demonstration disclaims delivery proof. Opening/replying
  retains the intended topic and same-topic draft.
- 320px and 390px checks show document/screen scroll width equal to the available
  width. The 390px English large-font screenshot and 320px Chinese/reference
  screenshots were visually inspected; composer and navigation remain usable.
  Reduced motion was emulated; native accessibility remains untested.
- Updated reference text explicitly requires reviewing conflicting inherited
  history before continuing. The prototype does not implement real prepare.

Browser console: **0 errors, 0 warnings**. Network capture contains only eight
loopback static HTML/JS/CSS/font requests across initial load and reload, no
external/provider/API call. The inspection session was closed. One initial
CLI `run-code` invocation had a harness syntax error before executing actions;
the corrected function-form invocation passed. Its failed log is retained and
is not a product defect or a passed test.

Logs/screenshots are in
`/home/miku/.local/state/enmori-ai-companion-20261025/qa-review/product-f625/`
(folder name predates the later text-only update):

| Artifact | SHA-256 |
| --- | --- |
| `07-bounded-ui.log` | `a8c4f8cf04be869bd846e8c44eac29d410526e95c780319de6c8ab2fe4162620` |
| `08-layout.log` | `120c840074bedaac1be2e1d452e1a84a4aaafad0a2bc13e1da06397ad2ccbb9b` |
| `09-final-0.log` | `f3e1e16d0032dcca48e721304570d2f48f7f5ec2a93c6b57d669ac348de6f36a` |
| `09-final-2.log` | `b0adcff3f8e7ca8bda42ed87a2dce3cc17b78c44d1d8921f65a5152d3c62a95d` |
| `english-large-390.png` | `fe3256e7f894137153a53f37a91c556387c30655c4ce1001fbb2e54bbdd6653b` |
| `chinese-320.png` | `f0f23d9701d254719a06b427a62e9d5b485a8db791273e7a7eab1574b2a6d77e` |
| `references-320.png` | `a6c05ad3d08e733e25e5534685a3cacf07898980686e4f6494c7275144e4a426` |

No blocking finding in the exercised design flows remains. This supports D-layer
review only, not native App, data authority, model quality or notification delivery.
The new physical contract packet, native C implementation and full local model
semantics remain separate review work. Historical small-plan failures and all
unperformed service/device/preservation checks retain their previous verdicts.
