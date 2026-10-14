# ZHOU R-A and reader — local implementation evidence

Date: 13 October 2026, SGT (UTC+08:00). This batch is local only. It is not
committed or uploaded and has no new GitHub head, formal JIN review, LI acceptance
or combination-gate result.

## Authority and source binding

The [current user instruction](../../decisions/2026-10-13-user-zhou-local-ai-development-scope.md)
releases local work and prohibits upload for this batch. The working branch is
`codex/zhou-ra-reader-local-20261013`, based on accepted #93
`110eda443fbe101608c6aa6df551e52b6a18da5a` (tree
`9b7ac0fde80c676af88ed0b5f888b9a7c4a39383`). The parent is the baseline, not a
claim that these uncommitted changes have been reviewed.

The [formal Remaining A selection](../../decisions/2026-10-13-li-remaining-isolated-ai-contract-a.md)
at #95 `72c027933d4b3ac1a95e25dc733619a6c63522b6` selects the unchanged
#93 packet sections 3–6. Its Git blob is
`965457097426d044f930cacfed8b8a2e36038cb0`; the selected preview's blob is
`605ae1f126bf19ec92e4af2ab272a2b743f8a5b8`. The
[existing policy acceptance](../../decisions/2026-10-13-li-ai-policy-component-acceptance.md)
is imported from #66 `278f4cece57c21a1c7ea6a2135d0934e425f1e90`, blob
`518d1a14474a1dd6cb5c216e45fbe007e96a6ca4`. All three local Git blobs match
their exact upstream sources. The checkout's existing line-ending normalization
can change raw working-file SHA-256; the manifest records both raw SHA-256 and
normalized Git blob, without changing the formal text. The old candidate and conditional-hold records
remain historical; N02/F03/R-A/C-A are not awaiting a repeated PM selection.

The [producer prerequisites audit](2026-10-13-zhou-reader-producer-prerequisites.md)
records #95's new DU approval and the specific outstanding Note/time/identity
facts. Actual Note reader wiring depends on those facts; separable R-A and the
inner reader preparation do not.

## Local batch boundary

Implement R-A on the existing accepted client and prepare the selected inner
reader. Preserve the original session/operation/target protection, accepted and
tombstone slots, original budgets, current-purpose revalidation, Q17 field
minimization and Q19 Persona semantics. No new public wire contract, receipt,
source identity registry, dependency, shared route or datastore migration is
introduced. Existing synchronous fake Sources/effect Ports stay unchanged.

No ordinary/demo/cloud/live model, shared Home/History entry or actual persistent
AI pipeline is enabled. Store, durable controls, complete cleanup runner and
actual reader integration remain distinct batches with their applicable source
and capability evidence. Owner tests and local independent review do not replace
ZHOU → JIN → LI or the changed-source combination gate.

## Delivered local increment

R-A adds the selected exit explanation and `Leave without retrying`, uses the
existing Back callback, clears private display/draft and stops pending reads.
Prepare/execute retain the existing Stay / Request cancel and leave confirmation.
Session memory retains only the current target/op, original U identity/order/time,
known accepted-pair status and unavailable assistant ID guards. The same session
reentry remains unknown; late read success cannot clear the guard or restore a
known tombstone. A new observed session drops these local references; no disk,
receipt, content cache or inferred history U/A pair is created. The client delta
adds 16 regression cases to the existing feature suite.

The new [inner Port](../../../backend/src/ai-conversation/ports/real-context-reader.ts)
and [prepared reader](../../../backend/src/ai-conversation/application/real-context-reader.ts)
consume a single original accepted context and return non-content status.
They validate one fixed view, authority before content, exact inclusive seven-day
bounds, time DESC / ID ASC pages25, at most five eligible Notes, complete Persona
membership and the approved four-field projection. Source IDs/versions/generation
remain separate request-only dependencies. Current checks enforce purpose
revocation/regrant, malformed/rollback failures, used-Note/Persona deletion and
unchanged Persona edit/switch semantics. Dispose clears owned content immediately;
late results cannot revive it. Thirty handwritten fake-Port tests cover the
boundaries. The existing synchronous fake lifecycle and runtime are unchanged.

## Verification

Environment: Windows, Node **24.19.0**, locked TypeScript **7.0.2**, FVM Flutter
**3.47.2** / Dart **3.13.2**. No dependency installation or version change.
Root executed the final full checks below; the separate local reviewer performed
static review. Exact commands, file hashes and local log/artifact locations are in
[the source manifest](2026-10-13-zhou-ra-reader-local-source-manifest.json).

| Check | Final result and scope |
| --- | --- |
| TypeScript strict build | Pass: `node node_modules/typescript/bin/tsc --project backend/tsconfig.json` |
| Backend full suite | **572/572 Pass**, 0 skipped/cancelled; includes30 reader tests, not the separately published LI550 tree |
| Flutter full App suite | **459/459 Pass**; includes the author's AI feature141/141 and16 new R-A cases, counts not added together |
| Flutter analyzer | Pass, no issues: `fvm flutter analyze --no-pub` |
| Changed Dart format | Pass,5 files/0 changes |
| Android synthetic AI harness APK | Pass with existing harness target and existing command-only Kotlin flags; compilation only, no device execution |
| Local independent source review | R-A and Backend findings fixed and rechecked; [full trail](2026-10-13-zhou-ra-reader-local-review.md) |
| Git whitespace | Pass |

The first ordinary APK command failed in `firebase_core:compileDebugKotlin`
because Kotlin incremental path caches could not relativize the C: Pub cache
against the D: Android project. The failing transcript is retained. The existing
#83/#88 build command supplies
`--android-project-arg=kotlin.incremental=false`
and `--android-project-arg=kotlin.compiler.execution.strategy=in-process`;
using it with `--target lib/ai_conversation_harness.dart` built `app-debug.apk`.
No Android project setting or dependency was altered. This proves compilation
of the synthetic AI harness, not a new Android flow or shared-entry acceptance.

The initial history-only tombstone regression failed before the R-A fix; the
independent reader rollback/rejected probe also failed before its fix. Their
initial transcripts, final results and intermediate571-test checkpoint are
preserved separately. Neither the author feature run nor independent probes
are additional whole-suite tests. Source/manifest hashes bind the final local
working tree, without inventing a new commit/head.

## Remaining actual integration boundaries

PM choices are resolved; #95 DU review is approved. Real Note wiring still needs
DU's source-bound guarantees for all applicable stored/maintenance timestamps
and permanent deletion/no-restore/no-ID-reuse behavior. The reviewed LI producer
source is identified for integration; its executable code is not silently copied
into this tree or ordinary runtime. Its actual gateway must be bound to the same
controlled Emulator in a later composition.

No new real datastore/Emulator/model/device run occurred. The real reader adapter,
selected storage/control/cleanup batches and uncovered capability probes remain
to be implemented and verified at their actual prerequisites. This local work
does not claim full AI/M26/Sprint/UAT/Release completion or substitute for
ZHOU → JIN → LI and JIN's changed-source integration gate. The seven pre-existing
untracked Persona artifacts are excluded and left in place.
