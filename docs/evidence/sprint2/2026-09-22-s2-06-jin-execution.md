# S2-06 JIN controlled-Demo execution — 22 September 2026

JIN's eight execution rows **Pass** on the dedicated Android Emulator. The final
standard Flutter integration test and host runner both completed successfully;
sanitized request/assertion evidence was exported before the test app was removed,
and the original AVD radios were restored. **SHI independent review is pending.**
This is executor evidence, not UAT, Release, merge acceptance, or Done.

This record supersedes only the execution dispositions in the
[PR #38 matrix reconciliation](https://github.com/3427564237/enmori-app/blob/4fe2e42abaef8d60c64367fff58c2619d8acc08a/docs/evidence/sprint2/2026-09-16-s2-06-jin-event-gate-matrix.md).
Its historical Not Run snapshots remain valid historical records.

## Source, environment, and authority

| Item | Actual input / provenance |
| --- | --- |
| Executor / independent reviewer | JIN ZIHAN / SHI ZHENGQI |
| Assignment | [Issue #29](https://github.com/3427564237/enmori-app/issues/29), eight-row S2-06 Event cross-feature verification |
| Production app source | PR #40 `cdd0b9dad5705e4ac9887efe2cd86d3c07b7f4b4` |
| Backend source | Same commit, attributed to [LI's controlled deployment handoff](https://github.com/3427564237/enmori-app/issues/30#issuecomment-5764879978); JIN did not inspect or redeploy the server |
| Final test/runner source | `9724bad7ed8cdcef30d6ab43baccca939415d9f5` |
| Final test APK SHA-256 | `ADAAFE76BFD4760BE5653A1C460A61671EE4F76D0DDFF1FC028166C9C5D86F2C` |
| Original JIN normal-app build SHA-256 | `285972B3593FFFA30EC4F426F275063CAC6805A50A1B22DEBB7E8A226F591223`; distinct from the instrumented integration-test APK above |
| Local rebuild authorization | [DU's unblock plan](https://github.com/3427564237/enmori-app/issues/30#issuecomment-5776011008): record JIN's own APK SHA; equality with DU's APK is not required |
| Dedicated AVD | `enmori-validation-api36`, Pixel 7 profile, API 36, Google APIs x86_64, configured 2 GB RAM |
| Flutter / Dart | FVM Flutter 3.47.2 (`d3b14c8769`), Dart 3.13.2 |
| Runtime class | Existing controlled Demo, real Firebase Auth and Backend/Firestore; Auth Emulator disabled; normal HTTPS trust |
| Configuration | LI's private 2026-09-22 client bundle, loaded locally outside Git; values and account credentials are not published |
| Fixtures | Existing `s2-event-demo-v1`, canonical SHA-256 `d9b5191bccedcdc12544bc66559ffeaf4eae0987c29e121a4f9de9755c6c642b`; reuse LI/SHI initialization evidence; no initialization/reset performed |

The production `lib`, `backend`, `api`, Android/iOS, and dependency manifests are
unchanged relative to the handed-over app commit. The new test composes the same
real Auth and Backend repositories as production bootstrap and the real
`EnmoriApp`. Only the existing `BackendApiClient` HTTP injection seam is wrapped
with a pass-through observer. It sends real requests with standard TLS, without a
proxy, fake response, fake session, custom certificate callback, or Firestore access.
The wrapper retains Event responses in memory for assertions; exported observations
contain only operation labels, sequence/time, HTTP status, `asOf`, and item count.

## Actual execution windows and validation

- Final build/host orchestration: **2026-09-22 14:14:58.677–14:16:44.221 UTC** /
  **22:14:58.677–22:16:44.221 SGT**.
- Final in-app assertions: **14:15:37.702–14:16:41.151 UTC** /
  **22:15:37.702–22:16:41.151 SGT**.
- One stateful integration test, eight gate rows: **8 Pass / 0 Fail / 0 Not Run**.
- **130 successful checks**, including UI readiness and host coordination checks;
  this is not a claim of 130 independent business scenarios.
- Flutter test exit code **0**; host runner exit code **0**; `evidenceExported=true`;
  `radiosInterrupted=true`; `radiosRestored=true`.
- Changed Dart test analysis: **no issues**. Dart format, PowerShell syntax parsing,
  and Git diff whitespace checks passed. Unchanged owner suites were not rerun.

## Results and direct evidence

| ID | Result | Verified behavior / trace |
| --- | --- | --- |
| S2-06-01 | Pass | Fresh registration via app UI; real observed authenticated session routes to onboarding; Initial Choice Reject produces private visibility/rejected optional processing; subsequent protected onboarding read confirms completion. Requests 1–4. |
| S2-06-02 | Pass | UI creates a synthetic Note; UI confirmation performs a separate owned Backend read matching its Note and ID in memory; Return Home works without repeating onboarding. Requests 5–7. |
| S2-06-03 | Pass | Community/Music save succeeds; independent own-interest read matches selection and returned revision; leaving and reopening the editor retains both tags and revision. Requests 8–15. |
| S2-06-04 | Pass | After the successful save, a new Home request 16 returns 200 and two items; displayed order, titles, time range and matched-interest reason match this response. |
| S2-06-05 | Pass | See all sends distinct request 17, returns 200 and four items with its own `asOf`; UI matches its own response in Backend order. |
| S2-06-06 | Pass | Clearing interests via UI produces independent successful empty Home request 22 and All request 23; exact approved empty title/body appear without stale cards or dependency-error state. |
| S2-06-07 | Pass | Restore Community/Music, establish successful Home request 28, then disable only the dedicated AVD radios. Fresh All request 29 reaches the client HTTP-send boundary but has no HTTP response before the operation timeout. Safe unavailable copy and explicit Retry appear, with no stale/empty result or unsafe vendor/token/endpoint/stack text. No additional token-provider or Backend send calls during a five-second observation. |
| S2-06-08 | Pass | Restore original radios; both unauthenticated HTTPS probes again satisfy 401/AUTH_REQUIRED before the explicit Retry. New All request 30 succeeds with four items and replaces the error. Independent own-interest read 31 retains selection and revision. |

Requests 16 and 17 have separate observed send calls and separate response bodies;
their respective server `asOf` values are `2026-09-22T14:16:00.74Z` and
`2026-09-22T14:16:01.925Z`. Distinct timestamps are observed here but are not imposed
as a requirement. The fixed fixture order was Community/Music Forum, Community
Meetup, Music Session, Community Workshop; all returned start times were future
relative to the actual server `asOf`. Home used the first two and All used all four.

Failure/recovery is **Emulator-local connectivity failure / explicit retry
recovery**, observed at **Backend transport**, not an observed Firestore outage or
Backend HTTP 503. The transport observer's `transportFailed=false` on request 29
means no underlying client exception had completed when the record was exported;
the app's bounded operation had timed out with no HTTP status. It is not a success
claim for that request. Explicit recovery uses the distinct request 30.

Wi-Fi and mobile data were both enabled originally (`1`, `1`), verified disabled
for the failure, and restored to (`1`, `1`) in cleanup. The final runner uses only
the approved AVD-local `svc wifi`/`svc data` procedure. It does not toggle VPN,
modify the host network, stop shared services, change ACL/IAM/DNS/Serve, or modify
fixed fixture records. Three executor-local synthetic accounts and Notes were
created across the development and final runs; no accounts/data were deleted or
reset. User-owned credentials/Note contents/IDs are absent from committed evidence.

Evidence:

- [Full sanitized assertions, row results, UI observation labels and request trace](s2-06-jin-20260922/gate-result-sanitized.json).
- [Host timing, exact test SHA, exit code, export and radio restoration record](s2-06-jin-20260922/host-result-sanitized.json).
- [Executable integration test](../../../integration_test/s2_06_controlled_demo_test.dart).
- [Standard Flutter test + ADB orchestration](../../../tool/run_s2_06_controlled_demo.ps1).

UI evidence consists of automated widget assertions over actual rendered cards,
states and copy; no screenshot is substituted for persistence or request proof.
The test APK and raw build/device outputs remain in the private execution directory
outside the checkout and are not uploaded.

## Reproduction

Run on the explicitly selected, already-admitted dedicated AVD with the approved
private configuration and existing fixed Demo data. The opt-in flag gates real
registration and account-scoped writes. Each execution creates a fresh synthetic
identity; this is not an automatic CI test. Do not run the Auth-Emulator-only
Interest test unchanged against this Demo.

```powershell
# At final test source 9724bad7ed8cdcef30d6ab43baccca939415d9f5.
fvm flutter pub get
fvm flutter analyze --no-pub integration_test/s2_06_controlled_demo_test.dart
./tool/run_s2_06_controlled_demo.ps1 -PrivateConfig <LI-approved-private-JSON> -Adb <adb-path> -Serial <dedicated-AVD-serial> -OutputDirectory <private-output-directory>
```

The runner starts the standard command below, coordinates the approved radio
interruption/restoration, exports sanitized evidence while the sandbox exists,
and hashes the actual test APK. It does not add a legacy Flutter Driver harness.

```powershell
fvm flutter test integration_test/s2_06_controlled_demo_test.dart -d <dedicated-AVD-serial> --no-pub --reporter expanded --dart-define-from-file=<LI-approved-private-JSON> --dart-define=ENMORI_S2_06_EXECUTE=true
```

Running the Flutter command alone cannot complete the host-coordinated radio
steps; use the runner. On API 36, `Directory.systemTemp` resolves to `code_cache`;
the runner detects this and the alternative app-private `cache` location. The
test waits for export acknowledgment before completion because Flutter may
uninstall the test application. Normal app restoration uses the original
`lib/main.dart` build with the approved private defines, followed by explicit ADB
installation; it is separate from the tested artifact identity above.

Cleanup restoration completed: the normal app was rebuilt and installed after the
test runner's uninstall; its restored APK SHA-256 is
`0D7A960381D4B4315865AB601D851C82EFAEB430CE264F66895EEEA77030B3AD`.
This is not the S2-06 test APK. The application package and Tailscale process are
present, and both original radio settings were independently rechecked as `1`.

## Harness corrections and review disposition

The first development run at `bb1255e` printed all eight Pass and Flutter exit 0,
but required local app-cache coordination links and lost detailed evidence when
Flutter removed the app. The second run at `1b1dcb8` again passed all eight in
Flutter, but a PowerShell property-count check rejected valid exported data;
manual capture retained its JSON and the outer runner failed. These are harness
issues, not product defects. The final source fixes path detection, export
acknowledgment and collection counting. The clean final run above requires no
manual coordination links or evidence extraction and is the acceptance evidence.

No product fix was made and no product defect is claimed from these runs. SHI must
independently review the final test and result commit. LI scope acceptance and
Issue/Project reconciliation remain separate; no Issue closure, UAT, Release or
Done transition has been performed.
