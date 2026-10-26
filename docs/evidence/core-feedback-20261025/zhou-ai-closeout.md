# ZHOU — AI companion closeout, 26 October 2026

## Source and assigned scope

Integration baseline: `2cfbc8f2ea8b111ffa82cd6609c2090d28a08744` on
`souma/ai-companion-integration-20261025`. It contains the required checkpoint
`9d9fc8b9da451c3ed0189d85ad0578eae3f8c7f9` and the previously announced
`567350cdca4f257de64881178c5e487854802f87` baseline. Work is isolated on
`souma/zhou-ai-closeout-20261026`; no existing checkout was reset.

Scope follows the [current Zhou package](../../planning/2026-10-25-v29-next-round-team-prompt.md),
[ownership decision](../../decisions/2026-10-25-li-next-round-ownership.md),
[automatic-day contract](../../../api/ai-today-context-contract.md) and
[Issue #83](https://github.com/3427564237/enmori-app/issues/83).
The new package's ZHOU/JIN independent-review chain applies to this increment;
earlier reviewer and execution records retain their original scope.

The [v30 runtime recovery](../../handoff/2026-10-26-v30-ai-runtime-recovery.md)
already records LI's confirmation that references off and on both reply.
This work does not recast those two modes as an outstanding availability failure.

## Reproduced remaining gap

Start with an authenticated, consenting, empty topic and automatic-day references.
Explicitly send one message. A successful selected reply can include an owned
source card, as the existing Backend selected-reply contract tests demonstrate.

The page merged the execute receipt but did not request an independent message
read. The owned-source display boundary correctly remained `sourcesNeedRead=true`,
so the new sourced assistant body stayed hidden until the user manually selected
"Check saved messages and sources". Existing automatic-day fixtures returned an
assistant without sources and did not exercise this combination.

The new widget regression reached one successful selected execute, then failed
on the original source: expected one `readMessages` call for `selected-topic`,
observed none. The fixture's earlier compilation and missing pre-click frame
were corrected before this product failure was established; neither is counted
as an application defect. Original logs are retained separately.

A second counterexample exposed a source-lifetime race in ordinary message GET:
while the response was pending, `contentAccess.changed()` hid the source, but the
earlier successful page could still increment `messageReadRevision` and release
that hiding. The regression found the old body visible when it must remain
hidden. `loadMessages` now binds the original ContentAccess identity before
token-delayed dispatch and again before merging the response. A retired read is
discarded, local read-busy state is released, and a fresh explicit GET remains
available. It does not change execute, original-operation recovery or deletion.

The page schedules one ordinary transcript read when a successful execute or
`assistantSaved` recovery leaves a sourced assistant hidden. The callback checks
the original topic, session, context scope, editor, route and ContentAccess.
Failure does not loop, resend or unlock sources. Existing display authorization
and tombstones still decide which returned content can be shown. This repairs
the hidden-first-reply path; it does not add a new requirement to GET after every
already-visible reply in the same topic.

## Minimal consumer interface and ownership

Use the existing `AiConversationController.loadMessages()` and
`AiConversationRepository.readMessages()` GET path. It already owns token/read
identity, topic/session fencing, merge ordering and unavailable-message tombstones.
The execute receipt does not grant fresh display permission or replace that read.

There is no new consumer DTO or persistence requirement to negotiate. JIN's
existing selected reply and authorized ordinary-read contracts are consumed as
defined. No JIN persistence/transaction implementation, normative API, shared
Home/router/composition root, dependency or Android configuration is changed.

## Verification

Tested product/test commit: `1f815aea6b9b008942d9c01769455201afa67fcf`.
Subsequent delivery commits only add these evidence documents. Exact commands,
file scope, source/lock hashes and retained log digests are in the
[verification receipt](zhou-ai-closeout-verification.json).

| Check | Actual result |
| --- | --- |
| Strict Backend TypeScript compile | Pass with Node 24.19.0 / TypeScript 7.0.2 |
| Seven-file Backend source-audit regression | 137/137, no skipped cases; Backend unchanged by this patch |
| Final 12-file Flutter regression | 240/240, including all eight new regression cases |
| AI module and new-test static analysis | No issues found |
| Three changed Dart files, non-writing format check | 3 files / 0 changes |
| Whitespace and source integrity | Pass; all three Dart inputs and both dependency locks unchanged across final validation |
| Independent internal source review | Earlier access-race blocker corrected; no remaining evidence-backed source blocker; not JIN approval |

The intermediate 183-case run overlaps the final run and is not added to it.
The two confirmed pre-fix product failures and the fixture-development errors
remain separately attributed in the receipt. Flutter/Gradle/APK validation was
serialized with the host lock at `~/.codex/locks/enmori-validation.lock`; only
Flutter source tests/analysis ran, with no Gradle/APK operation.

This is Flutter 3.47.2 / Dart 3.13.2, using the unchanged locked dependencies.
An offline package resolution first failed because this host lacked a pinned
cached package; ordinary `pub get --enforce-lockfile` then succeeded. No version
or lockfile substitution was made. No prior suite count is added to a new count,
and a fake-backed result is not real-model or phone evidence.

The source audit also verified the active local-chat serializer and physical
model-lane boundaries. The independent local Backend audit compiled with the
locked TypeScript and passed 137 tests across seven targeted files, covering
today/selection, operation/history/acknowledgment and model transport boundaries.
No runtime/prompt change was justified by that audit.

## Small-plan disposition

The known semantic failures remain unresolved. The
[bounded diagnosis and LI handoff](zhou-small-plan-diagnosis.md) preserves the
original 24-case 12 Pass / 12 Fail result, explains the supported root-cause
boundary, and supplies concrete simplification choices and one bounded reuse of
the existing fixed-corpus verification. No new model, prompt, content filter,
automatic retry, synthetic answer or evaluation tool is introduced.

## One LI verification packet

1. Integrate only after JIN independently reviews this exact package. LI owns
   service/device configuration, final composition and any candidate build.
2. With a permitted controlled account, open a fresh topic with a permitted
   current-day Check-in. Send fresh explicit input once. Confirm the reply and
   source become visible after the independent authorized message GET, without
   an extra manual reload. Read the saved pair independently and reopen the
   topic; do not infer persistence from the execute receipt alone.
3. Exercise references off, an empty day, an explicit exclusion, and a civil-day
   change. Confirm fresh preparation, no sixth-source substitution, preserved
   drafts and no silent downgrade on source failure. These scenarios have
   source/fake coverage; this packet requests separately attributed real evidence.
4. Exercise a failed or delayed message GET. The sourced body must remain hidden
   when unverified; switching topic or replacing the session must reject the old
   result. Recovery must use the existing explicit GET or original-operation
   query, without a second chat execute. Do not replay an old unknown operation.
5. Use the separate small-plan document for a specifically assigned real-model
   slot. Ordinary chat/readback, synthetic semantic evaluation, phone acceptance
   and release are distinct observations. Do not restart the expired follow-up
   worker window, send system push or change model/configuration for this patch.

No new JIN module package was found in the checked GitHub state; a reciprocal
review of a future JIN delivery is not fabricated. JIN review of this package
and LI real-runtime/device acceptance remain pending.

No real account/provider/model/phone, service deployment/restart, APK build or
installation was performed here. This package is not an overall UAT, Release or
Done claim.
