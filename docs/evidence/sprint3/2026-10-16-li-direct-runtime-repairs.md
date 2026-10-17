# LI direct runtime repairs — 16 October 2026 SGT

**Owner repair verification passed on the actual controlled host. New independent review and physical-phone acceptance remain separate.** [Machine receipt](2026-10-16-li-direct-runtime-repairs.json); [Draft PR #130](https://github.com/3427564237/enmori-app/pull/130).

## Source, authority and changes

Baseline JIN #128 **6523a98f8a401045914212ab118e490eccfff336**; LI product repair **fe5c46c6f69e377bb21893a1ef14f7566c7df0b9**. Human LI authorized direct repair in [S-PM-1016-LI-DIRECT-RUNTIME-REPAIR](../../decisions/2026-10-16-li-direct-runtime-fix-authorization.md), locally superseding only these two defects' JIN-exclusive writer restriction. Wider candidate integration remains JIN's. DU is requested to review this coherent LI delta; this owner run is not self-approval.

Only two product files changed:

- **Event provider encoding:** floor the upstream startDateTime lower bound to whole seconds with the existing Temporal dependency. Retain the original precise asOf for every local projectOccurrence comparison. Nanosecond and explicit-offset tests ensure past/equal occurrences remain excluded while a future occurrence within the same second survives. One call/first batch/no overfetch remains unchanged; invalid instants fail before fetch.
- **AI prompt:** explicit plain-output selection of one whole authorized attribution, rather than concatenating current-message and Note attributions. All current/Note/Persona input data remain unchanged. No source priority, canned response, output repair, fallback or semantic-validator change. Multiple bullets retain their existing captured-Persona rule.

API, Flutter/Android, dependency locks, Firebase configuration, operator and actual semantic-policy file are independently unchanged against the baseline (ten recorded checks). Product source Git blobs/SHA256 and freshly compiled JavaScript bindings are in the machine receipt. The prior [#129 failures](https://github.com/3427564237/enmori-app/pull/129) remain source-bound history, not erased by these passes.

## Reproduction and regression

The added Event regressions failed0/2 before its fix, then the full Event group passed15/15. The compiler/semantic regression group initially passed53/failed1 because the old instructions lacked explicit one-attribution selection; the existing validator correctly rejected mixed current/Note lines. Corrected group54/54, including unchanged-source-data and absent/plain/bulleted Persona controls. These subsets are included in Backend938, not additive totals.

The first compiler assertion printed Backend-authored system instruction text on failure. That instruction text was removed from the retained log while preserving the failure/count; assertions now compare booleans. No model reply or actual user Note was printed by that assertion.

Fresh generated Backend output was archived before final compile. Existing pinned Node24.19.0/TypeScript7.0.2/locked packages, Dart3.13.2 and cached verified Firestore Emulator1.22.0 were used. Java25 is attributed rather than transferred from JIN's Java21 result.

| Actual current-product check | Result |
| --- | --- |
| Fresh strict compile | Pass |
| Full Backend | **938/938** |
| Existing operator | **16/16** |
| Guarded actual Auth/Firestore/HTTP/Dart | **168/168**, outerexit0, no fail/cancel/skip/todo |

The SDK suite uses explicit model/compiler/provider doubles. Its worker/outer profiles were removed and five ports independently bound before starting the real-host service. Flutter/client/Android are unchanged; no new Flutter659 run or APK build is claimed for this product repair.

## Real formal9B diagnosis and correction

A single original-prompt diagnostic, with synthetic current input and a nonempty authorized Note projection, made one independently observed generation POST. Actual model output was structurally valid JSON with the correct schema/keys/text, but a single plain line contained both exact current and Note attributions and neither whole line was a single valid attribution. The unchanged gate returned unsafe_output. No response text was logged. This probe used the original compiler with the Event fix already present; it is not a whole-tree baseline acceptance run.

After the prompt-only change, the same projected input and actual compiler/tokenizer/formal9B path made one observed POST and passed the same independent semantic gate: one exact current attribution, no Note concatenation. Both diagnostic transports reached stopped, no quarantine/nonterminal remained. Complete input measurement and model-reported prompt count checks remained active; context8192/input4096/output512 and original60/5/45 budgets are unchanged. No additional model, response normalization or permissive validator was introduced. This finite positive evidence is not universal language/semantic conformance.

## Joined actual HTTPS/Auth/Firestore/model result

A fresh exclusive operator service used the exact repair product, real HTTPS/Auth/Firestore/compiler/tokenizer/formal9B, demoFeatures:true and a synthetic owned Account. Event started disabled. No competing Emulator, old-held-operation reset, ordinary account or fallback was used.

1. Saved the harmless English routine Note through actual HTTPS201 and read200. Sent the same routine current message: execute200, available assistant. Ordinary history200 and independent actual Firestore inspection confirmed the canonical U/A pair, accepted/reply pointers and exact saved-Note provenance; source content/visibility remained unchanged. Explicit whole-delete204 succeeded.
2. With the same unchanged saved English Note and its original baseline, sent the previously failing Chinese routine control: execute200, ordinary history200, independent canonical pair/Note-provenance/source-unchanged checks passed, then delete204 and read404.

This same service recorded two model attempts, both settled; remote generation POST count was not independently measured for the joined service. The direct diagnostic POST counts above are separate. No new physical-device, native Auth or CONSUMED success is inferred from host Auth/HTTP results.

## Joined actual Event result

An additional direct fixed-adapter diagnostic with a millisecond asOf produced real upstream200/list18 and matching Detail200, with fractional query seconds absent. Then, on the same joined ongoing service, actual protected HTTPS results were: unauthenticated401/no-store; authenticated-disabled503/no-store; private enable consumed/acknowledged; list200/no-store/**18 eligible rows**; first matching Detail200/no-store; private disable consumed/acknowledged; list503/no-store; unrelated Profile200. No process-wide egress count is inferred from these route results. Event ended disabled/pending0.

No raw provider title/ID/URL/key was published. Real source link opening/copying, native browser/return, assigned-client stale view/owned-copy clearing remain Not Run under their existing use/phone conditions. The server gate exercise does not prove those client actions. Official references checked: [Discovery API](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/) and [Qwen official chat template](https://huggingface.co/Qwen/Qwen3.5-9B/blob/main/chat_template.jinja); native framing was retained.

## Cleanup and remaining handoff

Twice observed this SAME joined original with model/compiler/I/O/nonterminal0, no quarantine/hold, adapter stopped and Event disabled/pending0; requested its normal stop. Closed cleanup-confirmed/no-hold, inner removal, outer removal/exit0/ports-free all passed. An immediate independent plain socket bind initially returned errno98 on an unrecorded port. Subsequent ss found no listeners; all five ordinary binds (and reuse-address cross-checks) passed. No force kill/reset was used; the transient's cause was not proved and the first failure is retained. Current preview is stopped; existing owner-only private inputs are retained for corrected-source handoff.

The existing local dedicated v4 APK's client/Android inputs are identical, so these Backend repairs require no rebuilt client artifact. No v4 installation or physical-phone success is claimed; Log remains human-confirmed off. Both historical #126 CONSUMED failures remain unresolved. JIN can directly consume #130 rather than reimplement these two fixes. New different-reviewer disposition, phone/browser/client cleanup and whole-baseline acceptance remain separate. Keep Draft/Open, main/tasks/Project unchanged; no whole-product/UAT/Release/Done or rewritten deadline.
