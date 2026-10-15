# JIN Persona timeout-precondition correction

14 October 2026, Asia/Singapore. This is the focused follow-up released by
[LI's #99 bounded disposition](https://github.com/3427564237/enmori-app/blob/948579ec82b2c5363ab2b3b2ea353ca652020f07/docs/decisions/2026-10-14-li-pr99-bounded-disposition.md). SHI reviews this new
test delta; LI receives the correction and determines its disposition. #99's
original packet, successful evidence groups and failed invocation stay unchanged.

## Exact source and demonstrated boundary

- Base: #99 `e84b23cd82eeda039f2bef9fa455909e9f39cc87`.
- Tested correction: `71d5cc5787806cc35b89f60f1cfce5e971e0c2d4`; tree `71fe3fb611c36e08650ced234aed4a0ead96121b`.
- Exactly one test source changes: `test/features/personas/persona_client_session_test.dart`.
- All 955 tracked base paths were checked; the other 954 files, including every
  product/Backend/API/platform/configuration/dependency file, retain base content.
- [Machine-readable receipts and bindings](2026-10-14-jin-persona-timeout-correction.json)
  distinguish normalized Git identities from Windows execution bytes.

The original test supplied a 40 ms wall-clock budget to **every** client operation,
awaited `session.load()` without asserting its result, and interpreted `create == false`
as proof of a dispatched uncertain command. That implication is false. Session create
can return false before it creates a command; a token-stage rejection can also settle
and remove a command without transport dispatch. The null dereference hid which
precondition had failed.

Before correcting the test, two controlled 100 ms synthetic delays reproduced its
same null-check exception on unchanged product code and the original 40 ms budget:

| Controlled boundary | After load | After create | Observed POSTs |
| --- | --- | --- | --- |
| Initial GET withheld past budget | current=false, failure=serviceUnavailable, pending=null | false, pending=null | 0 |
| Create token withheld past budget | current=true, canCreate=true | false, failure=serviceUnavailable, pending=null | 0 |

The red run at 15:52:05–15:52:25 SGT ended **exit 1, two intended failing assertions**.
It proves the test-orchestration defect and these two routes to the symptom. It does
**not** identify which route occurred in JIN's historical 504/1 run, prove host load
was its trigger, or establish the absence of every product defect. That original
failure and its missing precondition telemetry remain historical facts.

The [retained red fixture](fixtures/2026-10-14-jin-persona-timeout-preconditions.dart.txt)
is deliberately outside the normal suite. It contains synthetic data only and
prints state kinds/counts, never tokens or content. Its failed assertions are
diagnostic evidence, not two successful regression cases.

## Focused correction

The existing Flutter test binding now controls timer advancement. The success setup
must complete with a current empty collection, no failure, create eligibility and
one GET. The target cases must then observe the first POST, its token call, a waiting
command and an unsettled foreground result **before** pumping the client's existing
default timeout. This selects the intended post-dispatch timeout boundary.

The production 15-second default and all product code are unchanged. The fixture no
longer relies on a special 40 ms real-time race or wall-clock sleeps. It is not merely
a larger timeout followed by another lucky run: virtual timer expiry is explicitly
triggered after observable dispatch. Production `Stopwatch` checks are unchanged;
this does not claim universal scheduling or runtime reliability under arbitrary host
pauses. There is no retry-until-green loop or permanent serial-run requirement.

Both headers/body late-201 paths retain and strengthen 412 recovery, both identical
idempotency keys, exact/equal request bodies, zero effects before late success, one
confirmed effect afterwards and the independent second GET. Token call counts and
session-end protection are explicit. Three new cases separately exercise initial
read timeout, initial read 503, and pre-dispatch token timeout; late read/token results
cannot grant fresh load authority or dispatch the old command. The immediate-success
case remains. A missing pending command now fails an explicit state expectation
instead of throwing at an unchecked null assertion.

## Actual verification

| Check | Actual result |
| --- | --- |
| Controlled original-assumption probes | 2 failures as intended, exit1, retained above |
| Corrected focused file | 7/7, exit0, 15:54:06–15:54:11 SGT |
| Complete Flutter, default concurrency | 508/508, exit0, 15:57:08–15:57:56 SGT |
| `dart analyze --fatal-infos lib test integration_test` | Pass, no issues, exit0 |
| Changed test non-writing format | Pass, zero changes, exit0 |
| New source whitespace and scope | Pass; one changed test, no product/dependency changes |

The focused seven are included in 508, not added to it. The first full run of this
correction passed using default concurrency; no serial comparison or repeat full run
was used to obtain it. The focused run preceded the immutable source commit, and its
exact normalized test blob matches that subsequently committed and fully tested source.
The published evidence commit only adds this record, its manifest and the red fixture.

The first local archive verifier incorrectly normalized binary assets before checking
their exact bytes and stopped before commit/full-suite execution. It was corrected to
check exact bytes first; the resulting 955-file audit found only the intended test
change. No asset was changed. This tooling failure is distinct from product tests.

## Reproduction and remaining disposition

Use the existing FVM Flutter 3.47.2 / Dart 3.13.2 and locked local dependencies:

```text
fvm flutter test --no-pub --reporter expanded test/features/personas/persona_client_session_test.dart
fvm flutter test --no-pub --reporter expanded
fvm dart analyze --fatal-infos lib test integration_test
fvm dart format --output=none --set-exit-if-changed test/features/personas/persona_client_session_test.dart
```

Recorded execution uses the same pinned FVM Dart binary and `flutter_tools.snapshot`;
the manifest contains the exact command arrays and SHA-256 fingerprints. To reproduce
the intentional red cases, copy the supplied `.dart.txt` fixture to a temporary
`test/features/personas/jin_timeout_precondition_probe_test.dart`, run that file with
the same Flutter command, expect two failures/exit1, then remove only that temporary
copy before a normal full suite. The final 508 run excludes the red fixture.

Backend/Emulator/Android/model/provider suites are **Not Run for this test-only
correction**, and old counts are not transferred. There was no phone/AVD or real
service action. Private raw logs remain local; published fingerprints are attributed
JIN identifiers, not independently downloaded/rehashed reviewer artifacts.

SHI correction review and LI receipt/disposition remain **Pending**. This delivery
does not retroactively turn #99's first run green, declare deterministic global
reliability, or close the task. Keep both PRs Draft/Open, preserve the accepted scopes
and original failure records. No merge, Issue/Project transition, new deadline,
ordinary/cloud/model/provider enablement or Sprint/UAT/Release completion is claimed.
