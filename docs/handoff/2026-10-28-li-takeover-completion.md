# LI takeover continuation: executed work and remaining dependencies

Date: 2026-10-28 (Asia/Singapore).
Authority: [takeover](../decisions/2026-10-28-li-unfinished-work-takeover.md),
[continued execution and cloud target](../decisions/2026-10-28-li-cloud-service-objective.md).

## Completed in this continuation

| Inherited work | Executed disposition | Boundary |
| --- | --- | --- |
| DU avatar/day-page/client integration | Avatar fix `a682f020c98359b41277f953230d3fd940e7d229` is in signed v41. History/Calendar, avatar, shared router, AI and Persona regression: 535/535; full analysis clean | v41 built, not installed; no device connected |
| ZHOU semantic closeout | Read all 24 original synthetic fixtures/replies; bind five-dimension judgments, excerpts and result hashes. Author assessment 14 pass / 10 fail / 0 unreviewed | Inspection complete, semantic quality remains failed; no independent QA or new model call |
| ZHOU recovery/client verification | Four old assertions reconciled with the explicit v31 supersession; original-target send/retry guards tested after history and new-topic round trips; automatic readback stops after three and manual read remains available | Test correction, not a change to production recovery behavior |
| JIN integration/cancellation | Already-completed v40 source is in this base; brought in its exact committed device/runtime receipts at `2666c5cbf83f019669bcbc4f49a0df7138366f41` | Prior v40 observations attributed to that run; no fresh deployment or reapproval |
| JIN source coverage | Consumed exact [14-tag and missing-field disposition](https://github.com/3427564237/enmori-app/blob/01b416316d3cc8f9f8054761598d4825f7212673/docs/evidence/core-feedback-20261025/jin-source-closeout-oct28.md); no remaining approved mapping defect identified in that receipt | Six taxonomy conditions unsupported in observed source; six other tags current empty; Music/Gaming populated. New source access/display basis remains unresolved |
| SHI Event continuation | Receipt reports no independent Event code gap; existing #187 remains integrated | No fabricated introduction/address/information URL or fourteen-live-group claim |
| Cloud preparation | Confirmed target persisted; actual client, runtime, transport and consent differences checked; [concrete Azure/Ollama proposal](../planning/2026-10-28-cloud-deployment-proposal.md) with official current terms | No account, deployment, paid operation or real-data provider transfer |

## Regression evidence

Initial broader run: **531 passed / 4 failed**. The failures were two old
controller assertions blocking independent topics, an old manual-only outcome
read assertion, and a localized Check result label expected outside its menu.
The authoritative [v31 decision](../decisions/2026-10-26-li-v31-recovery-and-state-preservation.md)
explicitly supersedes those behaviors. Production guards were not weakened.

Changed tests at `cda73930f135a2df59d2f59fc96196c97660bf42` verify that history
switching and an independent new topic preserve the original unresolved target.
Returning to it still rejects Send/Retry with no additional prepare or execute.
Pending dispatch still blocks New; the user can explicitly start a separate
topic once dispatch has ended. The foreground UI performs three bounded outcome
reads, does not generate automatically, and retains a manual menu action.

Focused corrected files: **53/53**. Final broader run: **535/535**. Full
`fvm flutter analyze --fatal-infos`: no issues. Flutter 3.47.2, shared validation
lock throughout. [Verification and log hashes](../evidence/2026-10-28-li-takeover/verification.json).

Exact broader command:

```sh
fvm flutter test test/features/own_avatar_test.dart test/features/shared_avatar_test.dart \
  test/features/check_in_history_controller_test.dart test/features/check_in_calendar_flow_test.dart \
  test/features/ai_conversation test/features/personas \
  test/app/check_in_history_shared_router_test.dart test/app/ai_conversation_shared_router_test.dart \
  test/app/own_profile_flow_test.dart --reporter expanded
```

No Backend code changed in this continuation, so the v40 strict build and
Backend results remain attributed to their original receipt, rather than
claimed as a new execution. No additional full-suite run was performed after
the passing affected regression and analysis.

## v41 deliverable

`build/group-delivery-v41/ENMORI-group-v41-release.apk`:

- `com.enmori.app.group`, versionCode **41**, versionName `1.0.0-group20261028`.
- 67,230,850 bytes; SHA-256 `dc43abd531f507a4a1378ed6acdbd2bbb5bee371fc695acc74ca6253eddf58d2`.
- Signature verified; same SHA-256 signer as v40, same nine permissions,
  nondebuggable. No account, key or data reset.
- Built from clean product source `08efef09f61c4b2a70e412544ff2a3a2db4fd398`.
  Later changes are tests/docs only; the APK still contains the exact product
  delta reviewed by the passing regression. Existing build-tool deprecation/SDK
  warnings did not prevent the release build; no dependency upgrade was made.
- [Candidate receipt](../evidence/2026-10-28-li-takeover/v41-candidate.json).

This remains the existing personal-host Backend endpoint. It is not the proposed
cloud version. `adb devices -l` returned no device; installation and new phone
evidence are Not run. Prior v40 installed-device results remain separate.

## Work that cannot truthfully be closed yet

The [complete semantic assessment](../evidence/2026-10-28-li-takeover/semantic-assessment.md)
records remaining AI relevance/format failures. No prompt/model repair is
adopted on the strength of source tests; the failed outputs remain available
for any later candidate comparison. No blind retry of a previous operation.

Physical avatar/recovery verification requires a connected phone. Friend
recommendation grouping/ignore/Undo and cross-account private-signal journeys
still need eligible real fixtures; an empty current list is not that evidence.
Existing independent review conditions stay open; LI author validation is not
LI self-approval. No parent Sprint/UAT/Release/Done claim, main merge or blanket
Issue closure follows from this packet.

Cloud execution needs the actual student subscription, selected hosting/model,
confirmed cost limits and the external-processing consent change. The existing
Ollama Cloud structured-output limitation and pay-per-token terms are explicit
in the proposal. This is an account/contract/cost decision, not waiting for a
teammate implementation. Existing source gaps likewise need a permitted source;
they cannot be completed by inventing event details or relabelling categories.

## Later 28 October continuation: AI experiments and Azure setup

The preceding sections preserve the original v41 packet. Subsequent work added
an isolated Groq evaluator and completed one local 24-case candidate plus two
separately authorized Groq 24-case passes. No real-user messages were sent to
Groq. All 48 Groq responses were protocol eligible, but the baseline passed
14/24 semantically and `goal-v2` passed 15/24. The latter improved seven of the
original ten failures, retained three and regressed six original passes. The
local candidate also failed adoption and its production prompt change was
reverted; final production transport source matches the earlier packet.

- [Local candidate and rejection](../evidence/2026-10-28-li-ai-repair/prompt-v1-assessment.md).
- [Groq baseline](../evidence/2026-10-28-li-ai-repair/groq-baseline-assessment.md)
  and [goal-v2](../evidence/2026-10-28-li-ai-repair/groq-goal-v2-assessment.md),
  each with report/case hash bindings and non-independent assessment labels.
- Strict Backend TypeScript compilation passed; initial Groq adapter and
  unchanged golden-request tests passed 31/31. The prepared `baseline-medium`
  profile then passed the combined adapter, authorization/pacing and unchanged
  golden-request regression, **38/38**, on pinned Node 24.19.0. It is not run
  against Groq and requires a fresh grant. These are evaluator/source checks, not
  evidence that the nine remaining goal-v2 failures are fixed.
- [Original service recovery](../evidence/2026-10-28-li-ai-repair/service-recovery.md)
  preserved the same-boot lock and used a reversible, service-local DNS setting.
  The original v40 service is active again; no failed AI operation was replayed.
- [Azure/Groq account assessment](../planning/2026-10-28-azure-groq-account-evaluation.md):
  Azure student credit verified, resource group created, Compute and Network
  registered; Groq Free Plan verified. No VM, production cloud AI integration,
  public cloud endpoint, paid upgrade or replacement phone installation.

The authorized Groq evaluation allocation is consumed. The semantic and cloud
deployment objectives remain open; no model is adopted from these results.
The [offline diagnosis and next experiment](../planning/2026-10-28-ai-semantic-repair-next-step.md)
trace the preserved text boundaries and propose a single reasoning-setting
comparison, without rewriting the corpus or introducing a new product API.
