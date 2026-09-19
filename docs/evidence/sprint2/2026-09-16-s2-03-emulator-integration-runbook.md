# S2-03 Android Emulator integration runbook — 2026-09-16

## Purpose and scope

This runbook is DU's bounded preparation for Sprint 2 / S2-03. It defines
the Android Emulator evidence required after the controlled Demo prerequisites
are available. It is not execution evidence and does not assert that any
product path has run.

The exercised path is limited to the approved Flutter client consuming the
S2-01 own-Interest and S2-02 Event recommendation interfaces:

1. save an own-Interest selection and perform a later read;
2. observe Home Event Top 2 in Backend order;
3. open See All and observe an independent recommendation request;
4. observe the approved empty state; and
5. observe one safe dependency failure and an explicit successful retry.

No physical-device, production, UAT, Release, reset/delete, or arbitrary
fixture-import activity belongs to this runbook.

## Exact source identities

| Surface | Exact head | Status at preparation time |
| --- | --- | --- |
| S2-01 own Interests, PR #32 | `5db460ad8b28f84268a25cf05c334c997c1a0196` | Draft / open |
| S2-02 controlled Event data, PR #33 | `db40a4d234b0a9ce715467fb394bd4d6a1dc8476` | Draft / open |
| S2-03 Flutter client, PR #34 | `ecf365770e73ec736cdd6d2dd499ba944e12d8f8` | Draft / independently approved |
| Current main base | `31bdb78574ca04f50d42954816ad33d709f89ca4` | current base for the three Draft PRs |

Before execution, record the exact integrated commit and merge bases actually
installed in the Emulator. Do not reuse this preparation document as evidence
for a later head.

## Required external gates

All gates below must be satisfied before an Emulator result can be recorded as
Pass or Fail:

| Gate | Required proof | Status |
| --- | --- | --- |
| Isolated Demo target | LI records one exact existing non-production project ID and its isolation boundary | Blocked |
| Fixed data manifest | LI-approved `s2-event-demo-v1`, digest `d9b5191bccedcdc12544bc66559ffeaf4eae0987c29e121a4f9de9755c6c642b` | Confirmed, manifest-only |
| Controlled initialization | SHI reports create-only/no-overwrite execution for the approved target | Not Run |
| Runtime route | approved non-sensitive runtime configuration reaches the agreed S2-01/S2-02 interfaces | Not Run |
| Android Emulator | named AVD is booted and visible to ADB as `device` | Not Run |

The proposed `enmori-controlled-01` value is not an approved target. It must
not be inferred, substituted, or used for this runbook.

## Preparation record

When the gates are open, record only non-sensitive values:

| Field | Record |
| --- | --- |
| Executor | DU |
| UTC execution window | `<start> - <end>` |
| Android Emulator model / API | `<AVD name> / <API>` |
| ADB state | `device` |
| Installed integrated commit | `<40-character SHA>` |
| APK SHA-256 | `<SHA-256>` |
| S2-01 / S2-02 / S2-03 heads | `<exact heads>` |
| Demo manifest version / digest | `s2-event-demo-v1` / `d9b519...c642b` |

Do not store endpoint URLs, credentials, tokens, account identifiers, email
addresses, Firebase UIDs, or device serials in repository evidence.

## Verification sequence

Run the repository's formatter, static analysis, full Flutter test suite and
debug APK build at the same installed integrated commit. Record the exact
commands and their pass/fail results in the execution evidence; command output
containing secrets must be redacted rather than committed.

### 1. Own Interest save and later read

1. Start with an authenticated, onboarded synthetic account in the approved
   controlled target.
2. Open Interests and select one or more active controlled tags.
3. Save the selection.
4. Leave the page and reopen it to perform a fresh own-Interest read.
5. Capture a screenshot and a redacted UI/semantics dump showing the selected
   labels and the page's stable state.

Expected result: the later read shows the saved selection. A stale revision
must show the existing reload path rather than overwriting data.

### 2. Home Event Top 2

1. Return to Home after the successful Interest save.
2. Wait for the new recommendation request triggered by the save.
3. Capture Home after loading resolves.

Expected result: zero, one, or two Event rows appear in Backend order. Each
row shows title, time and deterministic matched-Interest reason. Record the
actual count without padding it to two.

### 3. Independent See All

1. From Home, open See All.
2. Capture the page after its request resolves.
3. Return to Home, then repeat once if needed to establish that the All view
   did not reuse Home-only results.

Expected result: See All issues its own request and displays the Backend order
for its response. Its screenshot and redacted UI dump are separate artifacts
from Home.

### 4. Successful empty state

1. Use only an LI-approved controlled fixture/account state that legitimately
   yields no recommendations.
2. Open Home and See All as applicable.
3. Capture the approved Q16 empty copy and semantics.

Expected result: the empty response is shown as an empty state, not as an
error, loading state, or fabricated event list.

### 5. Safe dependency failure and retry

1. Use the approved controlled dependency-failure method; do not modify DTOs,
   introduce a mock framework, or disrupt a shared service.
2. Trigger one recommendation request and wait for the safe public error UI.
3. Restore the approved dependency condition.
4. Use the visible Retry action and capture the resolved result.

Expected result: no raw backend failure text appears. Retry is explicit and
the later successful state replaces the error state.

## Evidence bundle and reporting

Create a directory named with the exact integrated head and retain:

- one screenshot and one redacted UI/semantics dump for each applicable step;
- a mapping from each artifact to the five verification steps above;
- APK SHA-256 and exact source heads/merge bases;
- emulator model/API, UTC window, and ADB `device` observation;
- formatter, analyze, full Flutter tests, debug APK and diff-check outcomes;
- every Not Run or Blocked boundary.

Post the exact integrated head, environment class, commands/results, artifact
links and boundaries to Issue #30. Escalate an S2-01/S2-02 contract mismatch;
do not silently adapt the client contract.

## Current truthful status

| Item | Status |
| --- | --- |
| Runbook preparation | Complete |
| S2-01/S2-02 real interface integration | Not Run |
| Controlled Demo initialization | Blocked by missing LI-approved isolated target |
| Android Emulator execution | Not Run — blocked by the same controlled prerequisites |
| Product/UAT/Release/Done | Not Run |
