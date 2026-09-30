# Sprint 3 first execution checkpoint — 2026-09-25

## Baseline and limits

- Planning baseline: PR #42, `479619e8d124f3342458506fc145dc4bfbe3f483`.
- Isolated local branch: `codex/sprint3-first-slices`. Existing checkouts were preserved.
- Target remains 42 reachable Figma routes/states and the applicable 38 material state groups. This checkpoint does not establish coverage completion, Ready, independent review, Sprint acceptance, UAT, Release, or Done.
- Stack, dependencies, OpenAPI, Firestore records, AI timeout, and the five owner/reviewer assignments are unchanged. No GitHub write was performed.
- The existing [execution handoff](../../../ASTRA_HANDOFF_S2_VISUAL_GAP_PREP_20260923.md) and [coverage decision](../../decisions/2026-09-24-sprint3-figma-coverage-ownership.md) remain controlling planning sources.

## Implemented first LI slice: Home / Event navigation

At the baseline, Home opened Event See All with `go`, replacing the Home route. See All had neither an automatically available AppBar back action nor a route to pop back to Home. Three new widget regression cases reproduced the problem before the fix.

Home now pushes See All onto the existing router stack. AppBar and system Back return to Home. On return, Home makes a new independent recommendation request; the callback stops if its context was disposed or the router is no longer authenticated. The existing operation guard discards late See All results.

This changes no Event eligibility, provider acquisition, public API, participation behavior, or prototype-only surface. The returned Home computation follows the existing [Q16 request-independence rule](../../decisions/2026-09-02-recommendation-empty-result-contract.md).

Changed product file: `lib/app/router/app_router.dart`.
Regression cases: `test/app/home_event_navigation_test.dart`.
Assigned owner/reviewer remains **LI / DU**; DU review has not occurred. This automated execution is not JIN's independent integration gate or LI's acceptance.

## Verification

Environment: Windows; FVM Flutter 3.47.2 / Dart 3.13.2; Backend verification used Node.js 24.19.0 and pnpm 11.19.0. Existing lockfiles were used without version changes. Backend dependency installation disabled package scripts.

| Check | Observed result |
|---|---|
| New navigation tests on unchanged product code | Three expected failures: missing AppBar back action and failure to return Home through system Back |
| New navigation tests plus existing Event-page/router tests after fix | Pass: 13 tests |
| `fvm flutter test --no-pub --reporter expanded` | Pass: 101 tests |
| `pnpm backend:verify` under the approved Node runtime | Pass: strict build and 277 tests; Backend product code unchanged |
| `fvm dart analyze --format machine lib/app/router/app_router.dart test/app/home_event_navigation_test.dart` | Pass: exit 0, no diagnostics |
| `fvm flutter analyze --no-pub` | Tool failure: analysis server received truncated LSP JSON for the Unicode workspace path; not a product diagnostic |
| `fvm dart analyze --format machine .` | Pass: exit 0, no diagnostics across the project |
| Android device/APK flow, live Backend/Firebase, live Qwen | Not Run for this change |
| Figma paired captures / visual measurement | Not Run; no visual-readiness claim |
| Independent review and cross-feature gate | Not Run |

The Flutter wrapper failure was traced to its SDK `packages/flutter_tools/lib/src/dart/analysis.dart`, which writes LSP Content-Length using `message.length` instead of the UTF-8 byte length. The SDK was not changed. The same pinned Dart analyzer is the alternative static check, not a fabricated Flutter-wrapper pass.

## Early integration findings

### Ownership audit

Extracting the owned routes from the pinned handoff produced 42 routes, 42 unique identifiers, and zero duplicates:

| Owner | Reviewer | Route count |
|---|---|---:|
| LI | DU | 16 |
| JIN | SHI | 9 |
| SHI | ZHOU | 6 |
| DU | LI | 5 |
| ZHOU | JIN | 6 |

These are assignment counts, not completed-route counts.

### Event compatibility

A synthetic, local-only compatibility probe of the compiled existing parser observed:

| Record presented to the current recommendation parser | Accepted |
|---|---|
| Existing six-field record | Yes |
| Same record plus `externalSourceUrl` | No |
| Same record with no `endAt` | No |

This confirms the Astra integration concern without selecting a storage design. The existing six fields are `title`, `active`, `published`, `startAt`, `endAt`, and `interestTagIds`. The future first approved real-source slice must prove detail and Home/See All together. Do not place new detail fields into current records or relax missing-end eligibility without the relevant approved contract.

### Public provider evidence — partial research only

Observations below come from read-only public-web retrieval on 2026-09-25. They are field/link evidence, not an authenticated provider API response, bulk extraction, permission decision, or app integration.

- [Ticketmaster's Singapore Event page](https://www1.ticketmaster.sg/activity/detail/26sg_theweeknd) presents a named concert, dated performances on 2 and 3 October 2026 at 8pm, National Stadium, and descriptive content. Its first Find tickets link opened the [seat-selection page](https://www1.ticketmaster.sg/ticket/area/26sg_theweeknd/3421). No login, reservation, purchase, or payment was performed. A performance end time was not established by the inspected page. Navigation category labels were not treated as approved provider taxonomy rows.
- [Discovery API documentation](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/) lists Singapore and requires an API key. No approved project API configuration was established in this execution, and no authenticated Discovery API sample was obtained. Website availability does not prove the same inventory exists in the API.
- [Ticketmaster API terms](https://developer.ticketmaster.com/support/terms-of-use/) identify conditional API use, limited storage periods, removal obligations, and application disclosure requirements. Their application to ENMORI's concrete acquisition/storage/display proposal still requires the owner decision; no retention period or access method was selected.
- The [onePA WEC LPA Talk page](https://www.onepa.gov.sg/events/wec-lpa-talk-2026-e91844509) exposes the activity name in its description, 10 October 2026, 10am–1pm, and a Rivervale CC venue. It offers login to view vacancies/pricing; the authenticated registration flow was not entered. [onePA terms](https://www.onepa.gov.sg/terms-of-use) restrict storage and redisplay without the stated permission basis. Public readability is not evidence of that permission.

Ticketmaster remains first and onePA second. Actual API coverage, provider permissions for the intended use, concrete source mapping, and complete minimum-field/link verification remain Pending. No source was approved or substituted. No provider data were imported into ENMORI.

## Next owner handoffs and unresolved gates

The current OpenAPI exposes onboarding, Note-only create/read, interests, and Event Recommendations. It does not yet define the new Profile/Settings mutations, Friend lifecycle, Event detail/participation, history/calendar reads, or Persona/Conversation operations. Requirement-level approval must not be presented as approval of those physical contracts.

| Owner | Next bounded handoff | What must remain unresolved until recorded |
|---|---|---|
| LI | DU review of the navigation fix; smallest approved Profile/Settings fields and navigation inputs for each next owner slice | New Profile-field purposes/visibility, Settings write contract, and affected onboarding questions |
| JIN | Approved exact-Username/request lifecycle contract; first permitted Event-association and Activity inputs from SHI/DU | Endpoint/DTO/storage/concurrency and operational protection choices; recommendation-to-Profile/request disclosure |
| SHI | Actual provider API sample and permitted-use evidence, then minimum detail/recommendation compatibility contract | Acquisition/storage/API design, stale-data behavior, exact category-to-tag rows, and reachability of detail-only Events |
| DU | Minimum authorized own-history and consumer read projections before complete Calendar/Footprint | Physical read/date contract and affected data/UI decisions; no saved Check-in edit implementation |
| ZHOU | Smallest Persona physical contract, then AI operation contract before client integration | Wait/cancel/late-result behavior against the 15-second client default and up-to-60-second runtime; no global timeout change |

Only first-needed producer/consumer reads belong in these handoffs. No general shared data model, event bus, or speculative abstraction is proposed. JIN's combined gate and LI's independent review of JIN-authored gate evidence remain future work.

### Five prototype-only behaviors

| Route | Owner | Pending decision |
|---|---|---|
| `verify` | LI | Whether production verification exists and its identity/code/expiry/resend/failure/abuse contract |
| `forgot-password` | LI | Recovery identity proof, reset lifecycle, security/expiry and failure semantics |
| `going-people` | SHI + LI | Whether a directory exists and its per-viewer fields/counts/protected states |
| `checkin-edit` | DU + LI | Editable fields, concurrency and dependent Weather/history/AI/deletion/consent effects |
| `ai-safety` | ZHOU + LI | Standalone screen versus approved in-flow placement, navigation and content |

All five retain Q04-D's Prototype Evidence Only disposition. Inclusion in the 42-route target has not resolved these decisions.

### Event mapping rows and confirmed criteria

The [25 September criteria](../../decisions/2026-09-25-sprint3-event-source-criteria.md) are preserved: public-participation fit includes paid concerts/sports; title/start/openable activity or registration link require source evidence; named missing optional fields are visible; missing end time excludes the record from current recommendations; ENMORI detail precedes external registration.

The permitted mapping method is a small explicit provider-category-to-existing-`InterestTagId` table. **No actual mapping row is selected or approved in this checkpoint.** Provider categories, ENMORI `EventCategoryId`, and `InterestTagId` are distinct. The illustrative Concerts-to-Music pair is not an approved row. SHI needs the selected provider's actual taxonomy identifiers and LI-confirmed pairs before feeding the Interest-based path; unmapped categories contribute no inferred tag.

Affected work remains Pending / Not Ready. Existing independently approved work can continue; no human review or approval is inferred from automated checks or this evidence record.
