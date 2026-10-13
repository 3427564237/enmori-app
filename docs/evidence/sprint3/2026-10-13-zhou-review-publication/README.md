# Published review evidence copies — 13 October 2026

The human subsequently authorized uploading the completed local work for review. This directory prepares the actual earlier execution evidence for that publication; preparing these copies did **not** rerun tests, invoke an Emulator, upload anything, or confer formal JIN review / LI acceptance. The preceding records' local-only statements describe their original execution checkpoints and are retained as history.

See the [publication entry](../2026-10-13-zhou-review-publication.md), [R-A / prepared-reader record](../2026-10-13-zhou-ra-reader-local-development.md), [separable-increment record](../2026-10-13-zhou-independent-ai-local-development.md) and [copy manifest](evidence-copy-manifest.json). Product source, old records and their manifests were not edited by this evidence-copy step.

## Results and provenance

| Evidence | Actual result and limit |
| --- | --- |
| [Final Backend suite](independent/backend-tests-final.txt) | **610/610**, fail/cancel/skip0. Includes previous572 plus resolver29 and canonical-path9; these counts are not added again. |
| [Earlier Backend572](ra-reader/backend-tests-final.txt), [intermediate571](ra-reader/backend-tests-intermediate-571.txt) | Separate historical checkpoints, retained rather than relabelled as the final610 tree. |
| [Final compiler transcript](independent/backend-build-final.txt), [earlier compiler transcript](ra-reader/backend-build-final.txt) | Both files are genuinely empty. The owner manifests record successful commands/exit0; empty bytes alone are not proof of success. |
| [Flutter suite](ra-reader/flutter-tests-final.txt) | **459/459** on the earlier R-A client inputs, unchanged in the subsequent Backend-only increment. [Author feature141/141](mobile/ra-feature-suite.log) includes16 new R-A cases and is a subset of459. |
| [Analysis](ra-reader/flutter-analyze-final.txt), [format](ra-reader/dart-format-final.txt) | No issues; five changed Dart files, zero format changes. Earlier execution, not a new publication run. |
| [Initial ordinary APK failure](ra-reader/android-build-final.txt) | The historical filename contains `final`, but this command **failed** in Kotlin incremental cross-drive caches. The failure is preserved. |
| [Synthetic AI harness APK build](ra-reader/android-harness-build-final.txt) | Compilation passed with the existing harness target and command-only Kotlin options. **No device run or new shared-entry acceptance.** The175,391,346-byte APK is intentionally excluded; its historical hash remains in the original manifest. |
| [R-A tombstone RED](mobile/ra-history-tombstone-red.log) | Initial0/1 failure at a pre-fix development checkpoint. Subsequent feature141/141 and full459/459 are the green evidence. The exact complete old test-source checkpoint is not supplied; the final file is not claimed to reproduce the old failure. |
| [Reader rollback RED](ra-reader/reader-rollback-probe-red.txt), [GREEN](ra-reader/reader-rollback-probe-green.txt), [probe](ra-reader/reader-rollback-probe.mjs) | The pre-fix compiled reader returned `denied` for rollback plus rejection; the corrected reader returned `unavailable`. These are independent reproduction results, not additional full-suite cases. |
| [Query batch](independent/query-probes.txt) | Owner execution: exit0, **16 safe reports**,151 owned references. All three groups cover page25, full-reference keysets, deleted cursor and exact empty-tail coverage. Same-leaf / multiple-parent evidence covers **messages and message_sources only**; conversations has repeatedLeafIds0. |
| [Initialization batch](independent/fence-probes-first.txt) | Owner execution: exit0, **16 safe reports**, four owned controls. Concurrent initialization/close both returned ABORTED10 in this schedule; a distinct subsequent close confirmed closed. Initializer and epoch rotation both succeeded in the second legal schedule; a fresh checkpoint then rejected the old epoch. Seven pre-startup input SHA-256 values remain unchanged in the report. |
| [Canonical reviewer results](independent/canonical-location-review-results.txt) | Six independent direct-TS probe groups passed; separate from610. |
| [Query negative guards](independent/query-runner-negative-review-results.txt), [fence negative guards](independent/fence-runner-negative-review-results.txt) | Seven independent groups each passed by observing expected child exit1 before SDK initialization. [Owner query guard rejection](independent/query-probes-negative-guard.txt) is separately retained. None is an additional Emulator batch. |
| [Retention reviewer record](independent/retention-review-results.txt), [retained body](independent/retention-review-probes.mjs) | Original tool stdout records **170 BigInt boundary scenarios**, not170 `node:test` cases or additional SDK experiments. The script was saved after execution with an explanatory header. Saving or publishing it did not rerun it. |

The first resolver focused run's28/29 test-helper failure is author-reported in the existing development record. Its original transcript is unavailable; no reconstructed log is supplied. Final focused29/29 and complete610/610 retain their actual attribution.

The query transcript had no embedded runtime input hashes: its six source files and parser were attributed by the owner after execution; local review checked consistency, not past bytes from timestamps. The initialization transcript contains seven pre-startup hashes that were independently matched. These refer to the original execution inputs, which may have Windows CRLF bytes; they are not silently rewritten to the later Git-normalized source bytes.

The probes' held callbacks precede SDK commit, although transaction reads may already have used RPC. Commit wire dispatch was not observed and ACK loss was not injected. Fresh explicit control close/rotation is not automatic replay of generation. Pending0, owned-reference absence, empty Auth/Firestore, apps0 and released ports are these finite controlled observations, not arbitrary remote-I/O settlement, production control retirement, cloud-index enforcement, product-store completion or cleanup-SLA proof. No real model, ordinary data, device/UAT/Release execution is claimed.

## Copy integrity and privacy

All26 original evidence files matched the SHA-256 entries in the two existing source manifests before copying. The [copy manifest](evidence-copy-manifest.json) records, for every file, its logical original location, original and published SHA-256/byte count, whether bytes remain identical, exact transformation categories/counts and originating manifest. Original files were not changed.

Five retained artifacts have original formatting reported by Git's whitespace check: the final blank line in `independent/fence-runner-negative-review.mjs`, and trailing spaces in `mobile/ra-history-tombstone-red.log`, `ra-reader/android-build-final.txt`, `ra-reader/android-harness-build-final.txt` and `ra-reader/flutter-analyze-final.txt`. Those bytes are retained and hashed as evidence. Product source and the remaining published files pass the whitespace check with only these five artifact paths excluded; the full-diff warnings are not misreported as a clean full-diff result.

Publication copies use **UTF-8 without BOM and LF**. Only exact machine-local repository/drafts roots and user-profile prefixes are replaced by `<REPO_ROOT>`, `<DRAFTS_ROOT>` and `<USER_PROFILE>`. Original matched path values are represented in the manifest by SHA-256 rather than republished. URL test inputs, protocol prefixes, assertion values, report fields, results, timings and counts were not rewritten. A file can differ solely because CRLF became LF. Published hashes describe the prepared LF bytes / Git web raw content, not a later CRLF-converting local checkout.

Credential-key/JWT/token/API-key/Bearer/credential-JSON and email pattern scans of original inputs and prepared copies found no matches; local path substitutions were separately checked. The negative-test credential *name* and synthetic rejection marker are test inputs, not a credential. This is a pattern and contextual scan, not a universal secret-detection guarantee. No suspected sensitive values were printed while scanning.

Two local manifest-writing PowerShell helpers are excluded, as is the APK. Their exclusion metadata is recorded without publishing those tools or executing them. The26 evidence files plus this README and the copy manifest are the complete output of this evidence-copy step. The publication owner adds the separate `source-manifest.json` to bind the whole submitted scope.

## Reproduction instructions and relocation limits

These are instructions for a later reviewer, **not additional executions performed while packaging**. Use the pinned Node24.19.0 / TypeScript7.0.2 / FVM Flutter3.47.2 / Dart3.13.2 and existing locked dependencies. Run from the repository root. These repository commands retain their original arguments:

```powershell
node node_modules/typescript/bin/tsc --project backend/tsconfig.json
node --test --test-reporter=spec "backend/dist/test/**/*.test.js"
fvm flutter test --reporter expanded
fvm flutter analyze --no-pub
fvm flutter build apk --debug --no-pub --target lib/ai_conversation_harness.dart --android-project-arg=kotlin.incremental=false --android-project-arg=kotlin.compiler.execution.strategy=in-process
```

The original format record used the five changed Dart files; inspect that exact historical source manifest rather than treating its `[5 changed Dart files]` shorthand as a runnable argument. A successful new run is a new execution and must be attributed to its actual tree; it does not reproduce a historical pre-fix source merely by using this directory.

The two actual SDK batches used these unchanged repository entry points, after compilation:

```powershell
node backend/scripts/run-ai-followup-capability-probes.mjs
node backend/scripts/run-ai-fence-initialization-probes.mjs
```

They require the existing locked Firebase Tools15.29.0 / Admin14.3.0 / Firestore8.7.1 and cached, checksum-verified Firestore Emulator1.22.0, a fresh dedicated controlled instance, free fixed loopback ports8080/9099/4400/4500, isolated credential profiles and owned-fixture teardown. They are not commands for an existing shared Emulator, ordinary data or cloud. Concurrent schedules may differ from the retained transcript; use the bounded assertions and record the observed outcome, rather than forcing the historical winner or codes.

The review scripts are relocated **execution artifacts**, with the following specific requirements:

| Copy | Before running this relocated copy |
| --- | --- |
| `ra-reader/reader-rollback-probe.mjs` | Its preserved relative import assumes the original drafts layout. In a separate reviewer copy, replace `../../formal/enmori-app/backend/dist/...` with the actual compiled-module location. From this published folder the relative root is `../../../../../backend/dist/...`. Compile the intended source first. Do not expect final source to reproduce RED. |
| `independent/canonical-location-review-probes.mjs` | Replace `<REPO_ROOT>` in the source path with the review checkout's absolute path using forward slashes, then use `node --test` on that separately prepared copy. It imports TS directly. |
| `independent/query-runner-negative-review.mjs` and `independent/fence-runner-negative-review.mjs` | Replace `<REPO_ROOT>` and `<DRAFTS_ROOT>` with the review checkout and a reviewer-owned scratch path, then use `node --test`. Build the existing guard dependency first. These scripts intentionally submit only invalid environments; expected child exit1 is success for the negative test. |
| `independent/retention-review-probes.mjs` | The executable body retains `./backend/...` and must be supplied as **stdin from repository root**, not run as a relocated file. Its redacted original-local paths occur in explanatory comments only. Use the command below without modifying the executable body. |

```powershell
Get-Content -Raw -LiteralPath 'docs/evidence/sprint3/2026-10-13-zhou-review-publication/independent/retention-review-probes.mjs' | node --input-type=module
```

No relocated or path-adjusted review script was executed during this copy step. Preserve the published artifacts and prepare separate review copies where changes are required; record any new input hash and result separately.
