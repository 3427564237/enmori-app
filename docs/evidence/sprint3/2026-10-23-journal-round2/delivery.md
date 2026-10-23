# Journal round 2 — new draft from an owned record

Baseline: `4d9cbf926d356320bc9b4721031e3c50dddd9fae`.
Branch: `souma/product-round2-journal-20261023`.
Initial source commit: `208ac9778f4ab2ca345782adb977b4d1e60a85d8`.
Authority and boundaries: [decision](../../../decisions/2026-10-23-journal-round2-new-draft.md).

## New user result

From an owned saved Check-in, start a separate editable draft using its Note,
Mood and Activity. Review/change those fields, then explicitly save and open the
new record. The original is unchanged. This differs from the existing edit,
calendar, monthly navigation, pagination and footprint features.

The source route re-reads the existing owner-only endpoint before opening the
composer. A failed/invalid read shows recovery or return; it does not create a
blank record, read settings or start GPS. Late reads are bound to the opening
session and access revision. A replacement session retires copied content.

The seed type has only three text fields. IDs, timestamps, revisions, visibility,
place labels, coordinates and weather have no seed slot. The existing settings,
new-record save, server-generated ID/time and uncertain-request recovery remain
authoritative. Once copied, input is a route-local user draft and does not reload
over edits when the draft's own save invalidates content readers.

## Composition contract

- `SavedCheckInPage.onStartNewDraft(String sourceId)` is optional; shown only for
  the successful matching owner-read detail.
- `CheckInFromRecordPage` requires `sourceCheckInId` and `onDiscard`; it accepts
  the existing `located`, `socialStyle`, `onOpenSaved`, `onOpenHistory`,
  `onReturnHome` and `openAttribution` parameters.
- Integration owns `/check-in?from=<id>` wiring, current-session/path callback
  guards, return-to-source fallback, and route tests. A present empty/invalid
  source must not fall back to ordinary blank creation.
- App's new Today projection can open the existing own-detail route. It uses
  the same repository with an independent today query, not History's mutable
  selected date. No new Backend endpoint, source reference or persistent draft
  store is required.

## Verification

Source formatting and `git diff --check` passed before centralized validation.
Integration owns the shared Flutter lock and runs:

```text
fvm flutter test --no-pub test/features/check_in_from_record_flow_test.dart test/features/connected_check_in_journey_test.dart test/features/check_in_pending_recovery_test.dart --reporter expanded
fvm flutter analyze --no-pub lib/features/check_in/presentation/check_in_draft_seed.dart lib/features/check_in/presentation/check_in_from_record_page.dart lib/features/check_in/presentation/check_in_page.dart test/features/check_in_from_record_flow_test.dart
```

The new file has 11 cases: English/Chinese copy-edit-save/readback, current
preferences/fresh point, source/settings failure, pending/loaded same-UID session
replacement, background late-read fencing, edit retention on mutation receipts,
same-key unknown-save recovery, 2× text/discard, empty source and mismatched ID.
All repositories are synthetic. Integration's centralized scoped analysis found
no issues. The three-file batch passed **19/19** cases, including all 11 new
cases. One large-text test produced a warning while targeting an ActionChip's
inner text; its next step did open the sheet, but the warning was not accepted
as clean interaction evidence. The test now targets the ActionChip, asserts the
initial value and the visible cleared chip, and makes missed-hit warnings fatal.
The targeted single-case rerun passed **1/1 with no warning**; product code did
not change for this correction. This is 19 unique cases, not 20 unique cases.

Central logs: `journal-analyze.log`, `journal-test.log` and
`journal-label-retest.log` under
`/home/miku/.local/state/enmori-product-round2-20261023/`.

The optional `ENMORI_JOURNAL_PREVIEW` output uses local fonts only in tests;
production fonts, dependencies and app theme are unchanged.

[English](new-draft-en-phone.png) and [Chinese](new-draft-zh-phone.png) 375×812
production-widget fixtures were inspected. Both show the review explanation,
editable original content, current private/no-GPS/weather-off settings, and an
explicit save action without clipping. They do not prove OS font fallback,
keyboard, GPS or physical accessibility behavior.

## Not run

No real-account data, Backend/Firebase roundtrip, GPS/OS permission, device
keyboard/TalkBack, APK, service restart/deployment or real-model test was used.
Integration's final shared routing, combined source checks and APK have separate
evidence. Prior 58 failed AI probes remain unresolved and unchanged.
