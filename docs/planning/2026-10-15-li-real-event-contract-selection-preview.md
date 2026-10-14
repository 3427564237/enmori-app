# LI real Event contract selection preview

Date: 2026-10-15 (SGT). **Human selection Pending; this preview grants no implementation or provider-display permission.**

Subsequent human answer: **"批准 EB01–EB06，EB07先仅复制链接（推荐）"**.
The later [confirmed decision](../decisions/2026-10-15-li-real-event-contract-selection.md) resolves the human selection for the exact packet. The original Pending text above is retained as preview history; technical review and actual provider/display gates remain separately required.

Human LI confirmed real list/Detail with existing recommendations preserved in [S-PM-1014-LI-REAL-EVENT-BROWSE](../decisions/2026-10-14-li-real-event-browse-direction.md), while retaining the concrete interface proposal for review. SHI now supplies [Draft #109](https://github.com/3427564237/enmori-app/pull/109), exact `718da39440a6a3d67cce5ad9a3efbbb7f5acbc40`: [EB01–EB07 source](https://github.com/3427564237/enmori-app/blob/718da39440a6a3d67cce5ad9a3efbbb7f5acbc40/docs/planning/2026-10-15-shi-real-event-browse-contract-candidate.md). ZHOU's independent technical review is currently Pending; LI's present examination is not substituted for it.

## Concrete recommended implementation selection

| Rows | Recommended selection for human approval |
| --- | --- |
| EB01 | Separate Home `Browse activities` entry and `/activities` list/Detail routes; `/events` and Home/See All recommendations keep their current meaning. LI wires Home/router; SHI owns module pages. |
| EB02 | Verified Auth and completed onboarding before `GET /v1/event-browse` and `GET /v1/event-browse/{browseId}`. No caller-controlled provider parameters, body, country or key. |
| EB03 | Request-only SG first provider batch20, page0, upcoming/date-ascending/non-test/known dates; at most one request per list/Detail read, no implicit retry/pagination. Timeout10s, response ceiling1MiB. |
| EB04 | Separate strict occurrence locator `tm_` plus canonical unpadded base64url of the validated provider ID, exactly as defined in SHI's candidate. No recommendation UUID or participation identity is inferred. |
| EB05 | Candidate list/Detail allowlists, title/start/source URL validation, optional end/location/category and visible missing information. No descriptions/images/price/participant/raw-total publication. Namespace/field sizes/UTC normalization/error envelope stay exactly tied to this candidate. |
| EB06 | No Firestore/import/cache/job/index. Mobile memory only, cleared on logout/disposal/background and maximum visible age5min with explicit Reload. Process-owned enable/disable and assigned removal/privacy/notice checks remain required before actual controlled display. |
| EB07 | **Select copy-link only for this first increment; defer external-browser launch.** This reduces integration scope, but is not an exemption from source-link permission. Implement the action behind the same provider-use activation gate; copying, displaying and opening real destination links all remain unavailable until applicable use/link permission is established. |

Retain the candidate's eligibility/time/Unicode/identity/source-URL checks, safe existing error catalogue and `no-store` responses. Missing end remains excluded from existing recommendations. M02, participant/Going/Interested state, catalogue import, general pagination, external registration outcome and recommendation-rule changes are outside this selection.

No new dependency is selected. SHI prepares feature-local Ports/adapters/pages/tests and a normative fragment; JIN owns shared Bootstrap/OpenAPI integration, LI Home/router, ZHOU Event technical review and DU LI shared-composition review. Human approval of these specific rows plus the applicable independent review would release implementation/testing on isolated synthetic fixtures. It would not assert real provider/display/Android readiness or authorize an ordinary-runtime transition.

## Permission and evidence still to establish

The already successful API credential is not requested again. The new first-batch20 validator run and product display have not been executed or approved by this preview. The historical size3 receipt is field-presence evidence, not retrospective validation of complete source URLs/times or all83 matching occurrences.

On15October LI refreshed the official [Developer terms](https://developer.ticketmaster.com/support/terms-of-use/): API use is conditional; reasonable service caching, requested content removal within24hours and visitor-data disclosure apply. The [SG website terms](https://ticketmaster.sg/terms-of-use) separately require specific deep-link authorization. This preview does not determine which explicit API permission covers the intended SG destination or claim that copying a link bypasses those terms. Confirm the minimal API-content/link use and any required notices before enabling actual display; no website scraping, provider contact or automatic terms acceptance was performed.

A [local provider clarification draft](2026-10-15-li-ticketmaster-use-clarification-draft.md) makes the concrete intended use reviewable. It has not been sent. This external permission question is separate from LI's internal endpoint/implementation selection and cannot be waived by PM approval.

Required approval rationale: LI's last direction explicitly reserved concrete interface review. Repository `AGENTS.md` states "Do not invent, infer, or broaden requirements because they appear reasonable" and "Do not make a major architecture, backend, data-model, dependency, or infrastructure decision without explicit approval." The [Backend Skill](../../.agents/skills/enmori-backend-development/SKILL.md) additionally requires "Stop the affected work and identify the missing source or decision" for selecting "an endpoint/path, request or response DTO field" unless the assigned approved contract already defines it. This packet proposes those exact new interfaces. Record the human's choice under `docs/decisions/` before treating this preview as approved; elapsed time or default option selection is not approval.
