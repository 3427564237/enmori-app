# PM approval — own Profile and Settings

- **Source ID:** S-PM-1005-LI-PROFILE-SETTINGS
- **Status:** Approved for bounded implementation
- **Date/authority:** 5 October 2026, LI HOURUI
- **Scope:** LI's owner Profile/Settings increment under Issue #45

LI explicitly replied “确认” to the request to approve the exact [Profile/Settings contract](../planning/2026-10-05-li-profile-settings-contract-preview.md), continue implementation, publish the PM preparation acceptance, merge #51/#52 and close preparation Issues #46/#47. The reviewable proposal was committed at `88165421aaf292f04d43cd7cd42083ffc3a9a437` before that confirmation.

This approves the proposal's four owner API operations, optional DisplayName normalization/limits, independent Profile visibility, current Check-in Friends-only read support, separate Profile/Settings revisions and atomic Account-field updates, later independent consent/visibility choices, UI save/reread/cancel/error behavior and device signout. Persist this confirmation before implementing those choices. The approved preview is the exact specification; no additional schema, disclosure, dependency or infrastructure is selected here.

Retain the preview's original sources and its narrow supersession trail. Initial Accept/Reject onboarding remains mapped to the original Public/Private and consent values. The current Account read is extended to accept Friends-only after Settings. Profile privacy remains distinct from Check-in default visibility. Existing Note persistence, recommendation formulas and owner Interests contracts are unchanged. Past Check-in social-read effects, other-user eligibility/block/projection contracts, additional Profile fields and prototype-only behavior remain Pending.

LI also authorizes the exact [PM action package](../planning/2026-10-05-li-pm-action-package.md): publish these reviewed preparations/decision documents to #50; after refreshed exact-head review/check/merge checks, merge documentation PRs #51/#52; publish the prepared acceptance comments, check and close #46/#47 and mark their preparation Project items Done; post the prepared #45 update. This authorization does not merge #42/#43/#50 or close #45/#44.

DU retains independent review of LI's new implementation and evidence and the outstanding predecessor/test additions. Owner execution, review, merge, JIN's combined gate, LI Sprint acceptance, UAT and Release remain separate. No self-approval or whole-module Done claim is authorized.
