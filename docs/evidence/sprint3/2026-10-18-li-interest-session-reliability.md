# LI Interest reliability delivery — 18 October 2026

- Owner LI; different reviewer DU; Issue #85; JIN consumes the focused executable commit.
- Baseline #154 `8abb9bc63e304b69804729f1dc761fac832d22ed`; executed code/test commit `2ff1142ba157ded1a0dca225719f6ded97e78167`. Later evidence and proposal additions do not change the executed code.
- Approved scope: existing Interest save/readback and observed-session isolation under the [complete journey priority](https://github.com/3427564237/enmori-app/blob/911001ae9e1b1280e6a24d1ad3c7ba11eff8eddb/docs/decisions/2026-10-18-li-complete-user-journey-delivery.md), Q12, Sprint 2 minimum Interest interfaces and the existing Flutter architecture.

## Demonstrated defect and smallest correction

InterestEditorController watched only the subject string, so replacing an observed session with a new authenticated session for the same subject did not invalidate saved state or outstanding reads/saves. A pending save also wrote state after provider disposal and threw a Riverpod Ref-lifetime error. Account preferences already uses observation-based fences; this delta follows that existing approach within Interest only.

The final four regression cases on unchanged production code all failed: stale saved selection, late old read, late old save, disposed pending save. The preliminary two-pass/two-fail probe was strengthened to settle old responses before a fresh load; all original logs and distinct hashes are retained in the JSON receipt.

The controller now watches the authenticated observation identity, advances the operation fence on rebuild/disposal and checks mounted state after asynchronous gaps. Old responses cannot settle the replacement session. Explicit fresh reads still work with the new revision. It makes no cancellation claim about a request already sent to the Backend. No endpoint, DTO, catalogue, 0–10 limit, revision rule, navigation or architecture changed.

## Actual validation

Pinned Flutter 3.47.2:

- `flutter test --no-pub --reporter expanded test/features/interest_editor_session_test.dart test/features/interest_editor_controller_test.dart test/features/interest_editor_page_test.dart test/app/own_profile_flow_test.dart test/app/account_preferences_flow_test.dart test/app/home_event_navigation_test.dart`: **45/45, exit 0**, including the four red-before/green-after cases.
- Scoped `flutter analyze --no-pub --fatal-infos` on both changed executable files: no issues, exit 0.
- Non-writing Dart format on both files: 2 checked / 0 changes, exit 0; scoped whitespace Pass.

These are client/controller/widget/router checks using handwritten fakes, not an actual authenticated network, persisted catalogue, provider, model or Android journey. No new APK was built for this controller-only delta; JIN retains candidate composition. No full-suite or full-product Pass is claimed.

## Other executable LI preparation and honest remaining scope

The two capture Python sources were retrieved directly from approved source identity #150 `c2c923c0`, matched JIN's exact published SHA256 values and compiled without executing either script. They are staged locally for the already-approved installation path. This is source availability, not receipt of JIN's ZIP or privileged installation. No account was recreated, no root action performed, and no model requested.

Fresh read-only socket check finds controlled Backend 8080 and Auth emulator 9099 not listening. Thus real catalogue inventory and same-candidate save/reopen/recommendation remain unexecuted; neither fixture cards nor historical results fill them in. SHI's #150 code/composition review and effective host permission verification remain before installation. The account-creation approval/action is already complete and is not a repeated choice.

A [concrete catalogue choice packet](../../planning/2026-10-18-li-interest-catalogue-expansion-options.md) proposes 4 versus 12 initial labels and a minimum Admin single-create maintenance scope; both the product content and missing physical contract are explicitly Pending, with no data or API mutation. This is decision preparation, not a completed catalogue expansion.

No merge, Issue closure, Project change, new deadline, runtime/provider/model/device action or whole-app acceptance. DU independently reviews this new LI delta; old component approvals are reused.
