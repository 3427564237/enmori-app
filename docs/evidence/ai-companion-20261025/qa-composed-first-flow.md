# QA — actual composed first-flow boundary

25 October 2026. Independent execution at Integration
`d992ea92fa500f8a2bb50281b1ea60bf0b83f120`, followed by a source/fake review of
the supplier-delegation repair `8b2e7464cce55fb429603381134746cd6daa23d7`.
Each head was frozen with `git archive` and compiled privately with the pinned
Node/TypeScript toolchain. Both strict builds exited 0. QA changed no production
source.

## Actual composition and five independent groups

Integration explicitly granted QA the isolated Auth/Firestore Emulator slot.
The run used project `demo-enmori-companion-20261025`, Auth `127.0.0.1:19099`
and Firestore `127.0.0.1:18180`. It instantiated actual
`createIsolatedConversationComposition`, `createFirstFlowComposition` and
`buildApp`, including registered HTTP handlers, Firebase identity verification,
Admin SDK transactions, source readers and canonical stores. Fastify
`app.inject` exercised these handlers without opening a network listener.

The actual shared `LocalModelLane`, `LocalChatTransport` and F0 transport used
an injected HTTP fake: **four fake model requests, zero real model requests,
zero FCM calls**. Global fetch admitted only the assigned Auth Emulator origin;
Firestore used its configured Admin SDK. Unused route dependencies failed if
called, and none were called. A controlled clock made one F0 intent due; no
periodic production worker or real notification transport was exercised.

The final command ran from `2026-10-25T08:28:58.974234Z` to
`08:29:04.652305Z`, exited 0 and passed **5/5 groups**:

| Group | Observed result |
| --- | --- |
| Selected source through actual factories and HTTP | Prepare returned 201 and execute 200. The actual store published canonical U/A, a `source_use_v2` receipt and one source card. The model projection excluded private IDs/location; the receipt did not copy the source quotation. |
| Existing-topic conflict, then explicit exclusion | Preparing A exposed the current pair dependent on B. Execute without excluding that pair returned 409 `AI_CONTEXT_SELECTION_CONFLICT`, with zero new messages and zero model calls. A fresh prepare plus explicit whole-pair exclusion continued in the same topic using the exact draft and A only. Old U/A data and update timestamps stayed unchanged. |
| F0 publication and opaque delivery resolution | The queued reference returned 404. After the controlled due transition, the actual F0 application/store published canonical P with dispatch `skipped`. Repeated resolution returned the exact current message/sequence/minimal cursor with no-store; another authenticated owner received 404. Resolution made no model calls, message writes, parent timestamp changes or read-watermark advance. Off preserved this still-authorized historical anchor. |
| Check-in edit during generation | QA held the fake response after the actual U save, edited the selected Check-in through Firestore, then released the complete response. Execute returned 409 `AI_AUTHORITY_CHANGED`, retained U and published no A. |
| Purpose and authentication revocation | The original P remained resolvable after the unrelated Check-in edit because its source was the actual U. Changing the purpose generation withdrew it with 404; disabling the actual Auth user returned 403. Neither path substituted another anchor or invoked a model/send. |

This adds actual composition evidence to the earlier
[Context source/fake review](qa-f1-selected-context.md) and
[F0 Store/Emulator groups](qa-context-first-flow-emulator.md). It does not
establish real-model semantics, external HTTP connectivity, physical delivery,
UI behavior, production Firestore rules, UAT or Release readiness.

## Source checks and bounded regressions

Source review verified selected-reader I/O tracking, topic argument forwarding,
both prepared-history callback injections and typed HTTP allowlists. The same
host lane is shared by chat, F0 and Persona work; absent push configuration
does not cause an FCM call. Delivery resolution re-reads the intent and its
current canonical message under request authority, without using a push body,
latest-message fallback or read acknowledgment.

At `d992ea9`, **3/3 selected HTTP** and **6/6 F1 runtime projection** tests passed
independently with network fetch blocked. A separate new-only serializer audit
captured the original 24 cases and compared their complete requests with the
frozen `24f913d` golden: **24/24 compatible captures**, 24 fake HTTP invocations,
zero model calls. URL, method, redirect, cache, headers and complete body matched,
including exact system/history text. The old serializer/model were not rerun.
The original local24 semantic result remains **12 Pass / 12 Fail**.

The later `8b2e746` replaces object-spread forwarding with explicit
`operations.resolve(...)` and `operations.anchor(...)` delegation, preserving
prototype methods and the original receiver's private state. QA independently
passed **4/4 wrapper tests**, including a private-field class supplier, with
fetch blocked. The actual `d992ea9` factory used own arrow methods and was not
affected by this supplier-generalization defect; no additional Emulator run was
needed for the two-file patch. The five actual groups stay bound to `d992ea9`,
not retroactively relabeled as execution at `8b2e746`.

## Cleanup and evidence integrity

Before actual startup maintenance, QA verified empty `accounts` and operation
fences so startup sweep/retirement could not touch another role's fixtures.
The existing runtime fence and source-sweep checkpoint were preserved. Both
synthetic account trees, bindings and Auth users, two owned Check-ins and four
owned operations were removed; account/binding absence was read back. Runtime
and checkpoint restoration required the matching QA process epoch. The private
composition and SDK were closed; Integration's Emulator services remained
running. QA returned the slot and set its authorization file to `authorized:false`.

The first QA harness attempt used the unsupported Timestamp `toJSON()` helper
after its first group. Its script/log/result remain preserved as
`initial-qa-timestamp-*`; its fixtures and runtime fence were cleaned before
the final run. The private assertion helper was corrected to compare
`seconds`/`nanoseconds`. No production change followed from this harness error;
its first group is not counted a second time.

Private directories under
`/home/miku/.local/state/enmori-ai-companion-20261025/qa-review/`:
`root-d992ea9/` and `root-8b2e746/`. Raw synthetic IDs/captures stay private.

| Artifact | SHA-256 |
| --- | --- |
| `root-d992ea9/composed-emulator.mjs` | `7243db6852d4cdf952bc31952ef4820d6850de2664258dfc123995d090eb7ba8` |
| `root-d992ea9/composed-emulator.log` | `a9474b7718eb63608c1c15bfa026c14feecb0c123e077c3e503e450205fd638d` |
| `root-d992ea9/composed-emulator-result.json` | `df3d7f0832512bee65cce661efed3e7049f756908436b0eacc94b2225718f0e0` |
| `root-d992ea9/selected-http-and-runtime.log` | `8e5b41e49daaf91f96d609d842074357b2c981146fb365d83efda61b1301a292` |
| `root-d992ea9/old24-compatibility.json` | `52163d18b769d5cd8a6755272d3df1fc9e8e2d54086c37f865bd1739a13d288e` |
| `root-d992ea9/old24-compatibility.log` | `a0317b98eb5612b0bc0d5f428fe3c9bca7ffe9e8608b9a6763e292466d26db69` |
| Original 24-case golden request file | `b6a8673446a1a36cc5921e097ecacbf06aa752450227e9eddbab6ad7049027ee` |
| `root-8b2e746/delivery-wrapper.log` | `58b01c5f24e61e846486453885d3b71b8eaf39b1d86750d9020ce8c0b74a2ff1` |

Actual groups, focused tests and serializer captures are different evidence
units; they are not combined into one acceptance percentage. The existing
[F0 semantic comparison](qa-f0-semantic-comparison.md) remains **5 Pass / 3 Fail**.
