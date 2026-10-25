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
