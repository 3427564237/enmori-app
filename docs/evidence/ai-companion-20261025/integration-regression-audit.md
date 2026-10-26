# Integrated Flutter regression and unchanged-baseline comparison

Integration ran the complete `test/` suite at clean source
`a20927c063b9ef20e38fa8fdac7b252f54c60bda`, with the pinned Flutter 3.47.2 /
Dart 3.13.2 SDK and existing locked packages. Analysis passed with no issues.
The complete test run took 82 seconds and reported **1,348 Pass / 62 Fail**.
It is not a green full-suite result.

Original private log `integration-flutter-final.log` SHA-256:
`b670025e9445cd664a303b38d3d1dbc8ef14db330d0233042097a8ca4327c8b5`.

## Actual baseline comparison

The failures occur in twenty files. Nineteen existed at the round's accepted
starting source `b81d93ffd219011dbc0918daca5c82fd83e7ba4a`; their test contents
are byte-for-byte identical between that baseline and `a20927c`. The twentieth
is this round's new shared companion router test.

Integration exported an isolated private archive of that exact baseline and
ran only the nineteen existing files, using the same SDK and unchanged existing
package graph. The archive's application package URI points to the archive,
not the candidate. The three extra Messaging dependency entries are present
in the reused graph but are not imported by baseline source. No test, source
or expectation was changed in the archive. No live service or model was used.

That selected baseline run took 24 seconds and reported **76 Pass / 58 Fail**.
All 58 failing file-and-case identities also fail in the candidate. There is
no baseline-only failure in this comparison. This is a selected-file comparison,
not a complete baseline-suite run and not proof that historical failures are
harmless.

Private log `integration-flutter-baseline-failed-files.log` SHA-256:
`6244b007caf342f6340d5252845df5df2c2f4b33a6bc461c0339ee59ca38c036`.
The exact nineteen files, unchanged-source checks and failure-set comparison
are retained in `integration-flutter-baseline-comparison.json` in the same
owner-local round directory. Existing failures include obsolete harness
navigation/assertions, incomplete Home/History/platform fixtures, and a
reproduced English large-text Check-in editing overflow. They remain visible
as existing issues; they are not reclassified as passing checks.

## Four additional candidate failures

| Case | Evidence and handling |
| --- | --- |
| Check-in attachment navigation requires its original exact session | The explicit entry correctly opens the picker, which covers the underlying AI page. Root's default finder ignored offstage widgets. `9d50ac4` corrects this test-only lookup. QA separately verifies the actual picker, exact selected ID, unknown list state, zero writes and session fence. |
| Saved detail explicitly opens its own reference and covered callbacks cannot navigate | The same covered-page finder issue; same test-only correction and separate QA verification. |
| Social chat keeps overlong text editable | The status body is lazily laid out above the composer. App is checking the current visible surface and preserving the exact draft/no-dispatch assertions. |
| Social chat keeps overlong Unicode scalars editable | The same lazy visibility boundary, with the Unicode validation assertion retained. |

The original full-suite log is retained. Passing targeted corrections must not
be reported as a rerun of all 1,410 cases. The AI/proactive author's 389-case
result overlaps the complete suite and is not added to its total.

## Separate actual F1 recovery defect

The new F1 implementation at `ee44827` has a separately identified recovery
defect, independently reproduced by QA: a content-access epoch change during
selected execution can leave the local `sending` flag set after the original
operation is confirmed `noEffect`. The result stays protected but fresh review
is blocked. This is an open product defect at that head, not one of the four
finder failures above or one of the 58 baseline failures.

See [the independent F1 ledger](qa-f1-app-integration.md). Its initial result
is eighteen distinct passing boundaries and this one open failure. The repair
requires the original failed counterexample to pass while the original unknown
operation and no-replay guards remain in force.

## Final targeted corrections and independent recovery closure

The earlier pending statements remain observations at their stated heads.
App's `785571fe00ffe58d2a9e7908217264f1b8e7bfff`, integrated unchanged as
`8d5a7240e7a69fbc3d0ae6249e525f37973d33df`, completes the two social overlong
text/Unicode fixtures. Diagnostic layout showed a 240-pixel history viewport
and a 64-pixel scroll extent. The original upward-scroll hypothesis failed;
the final three-line fixture change uses the existing `_ensure(ai-status)`
downward scroll after the original exact draft, selection and focus assertions.
No text shortening, keyboard hiding, production change or business assertion
removal was used. The unrelated 58 old failures were left untouched.

At clean `8d5a724`, Integration ran full `flutter analyze --no-pub` with no
issues, six selected F1/composition/router files **55/55**, and exactly those
two social cases **2/2**. The six-file batch includes the corrected shared
detail/picker cases. All commands exited 0. Log
`integration-v28-source-final.log` SHA-256:
`6e266d25b4086c6b7e019e0a09822d412bbe146d84ee52383c1926cf043911bf`.
The matching JSON retains the complete commands and frozen head. This closes
the four candidate-only fixture failures through targeted execution; it is
not a second complete-suite result and does not turn the original 58 green.

App separately repaired the genuine F1 P2 at `9bc571c`, integrated unchanged
as `6b4ec589c49fc7edf43a4654421c757d2435c9e5`. QA's `dc170411` preserves the
original red counterexample, an initial private fixture-cleanup failure, the
same corrected-cleanup test failing again on original `a20927c`, and the
repaired no-effect plus different saved-user recovery branches **2/2 passed**.
The retired local sending flag now clears while the original unknown-operation
fence remains. Product independently agrees at `346ac94`. See the full
[QA ledger](qa-f1-app-integration.md) for exact hashes and scope; no real native
background or service acceptance is implied.

The actual APK source `fd1649724e38298418b22681fcce6b6a9fcf933c` has no Dart,
Backend, API, pubspec/lockfile or Android-manifest difference from the final
`8d5a724` check. Its only later build-code change enables already approved
Android resource generation for the selected companion variant. The
[v28 handoff](../../handoff/2026-10-25-ai-companion-v28.md) records the actual
binary, build history and remaining gates. No full-suite rerun is claimed.
