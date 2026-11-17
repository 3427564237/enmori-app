# Independent review of the v87 HTTP expiry trial

This is read-only review of root-operated HTTP receipts under
`/home/miku/.local/state/enmori-v87-deploy-20261117/`. The reviewer did not issue
requests, replay the script, operate a device or change product code/the existing
acquisition script. A separate two-GET repeat script was prepared and syntax
checked only; it was not executed by this reviewer. Deployment/package binding belongs to the root operator's
mounted-artifact receipts and the
[approved exact v87 deployment](../../decisions/2026-11-17-li-v87-deployment.md).
No emulator or physical-phone result is inferred from operator-host HTTP.

**The completed post-wait reads show bounded same-ID recovery with real onePA
detail content; a later same-ID repeat returned503 again. SC-03 remains open.
An unexplained before/after privacy-choice response difference also remains
open; complete account preservation is not established.**

## Seed outcome and process anomaly

The script's seed receipt starts at15:51:26.598 UTC and records completion at
15:53:40.538 UTC on17 November. Every planned seed response exists and its raw
body hash matches the receipt. The surrounding execution tool nevertheless
reported **exit143**. `api-seed-process.json` records this as an **unattributed
harness/process-exit anomaly** with all response/completion receipts present.
It is not a normal successful process exit, and the requests were not replayed.
The completed HTTP observations remain individually usable; their existence
does not explain or erase the process anomaly.

| Seed request | Actual response | Boundary |
| --- | --- | --- |
| Onboarding |200, completed,2.209s | This request passed the completed-account path; no stage-level incident diagnosis follows |
| Profile |200,0.955s | The response's username equals the onboarding account's username; no private value is copied here |
| Browse |200,25 items,120.983s | Both providers available; onePA coverageComplete false, so the published list is explicitly incomplete |
| Ticketmaster stable detail |200,8.557s | Same selected occurrence and startAt as seed; content.detailsStatus unavailable, so this is base-detail success with supplemental-detail degradation |
| onePA stable detail |503 SERVICE_UNAVAILABLE,0.801s | This exact read failed before the planned310-second wait; cause remains unknown |

Both selected identities occur exactly once in this current seed response. The
reviewer independently decoded each Browse ID, recalculated the existing stable
identity mapping and checked the script's identity hashes. All match. Both
occurrences were future-dated at the seed/request timestamps. Both context
entries are `current_v87_seed`; **no historical v85 fallback was used**.

The onePA seed item's fetchedAt is15:53:29.844 UTC. Its exact detail request ran
15:53:39.736–15:53:40.538, approximately9.36 seconds after the Browse completion.
This failure therefore occurred **before** the controlled post-seed310-second
wait. It must not be relabelled as the experiment's post-expiry failure. Item
fetchedAt and the script's waiting receipt also do not expose every internal
cache-generation timestamp.

## Independent source-status correlation

The existing operations-status response was observed at15:54:22.239 UTC:

| Provider | State | lastObservedAt | lastSucceededAt | Reason |
| --- | --- | --- | --- | --- |
| Ticketmaster | ready |15:53:34.300 |15:53:34.300 | none supplied |
| onePA | unavailable |15:53:40.495 |15:53:29.844 | dependency_unavailable |

The onePA success timestamp matches the seed item's fetchedAt. Its failure
observation falls within the subsequent exact-read request window. This supports
a bounded sequence of successful catalogue publication followed by an observed
onePA dependency failure. These aggregate fields do not identify a source HTTP
status, parsing stage, browser state, identity rejection or internal exception.
The503 response alone cannot distinguish those causes, and0.801s latency is not
proof of a403/429. The approved refusal/identity repairs have offline coverage;
this response does not prove which, if either, was exercised in this live read.

## Actual request budgets

Source inspection confirms the current APK paths use225 seconds for Browse
list/Browse detail and recommendations, and30 seconds for stable Event detail.
The default15-second BackendApiClient budget is not the Browse deadline.
The operator script uses225 seconds for seed Browse and35 seconds for its
stable/Browse exact probes. Consequently, neither the long Browse response nor
an operator probe is itself APK acceptance; actual UI waiting, navigation and
recovery require their separate observations. An initial reviewer message
incorrectly compared Browse with the default15-second budget; that inference
was withdrawn after checking the explicit repository overrides.

## Completed post-wait comparison

The after receipt begins15:58:41.228 UTC and completes15:59:03.676. Its mode-entry
monotonic interval is310050ms; the wall-clock interval from the seed Browse
completion is310.052s, and the first GET starts310.45s after that seed uptime.
The original context/identity hashes are unchanged, the same host boot is
required by the script, and `api-after-process.json` records exit0. This does
not replace the separate seed exit143 anomaly.

| After request | Result | Independent raw-content check |
| --- | --- | --- |
| Ticketmaster stable, first |200,6.941s | Same ID/sourceId/title/startAt; all fields match before except newer fetchedAt; supplemental details remain unavailable |
| Ticketmaster stable, second |200,5.377s | Same bounded result; newer fetchedAt, no supplemental-content recovery claimed |
| onePA stable |200,1.623s | Exact current-seed occurrence; detailsStatus available,1685-character fullDescription and three nonempty sections |
| onePA Browse detail |200,0.823s | Same Browse/stable IDs; every shared field deeply equals the preceding stable response, including content |
| Ticketmaster Browse detail |200,5.254s | Same seed occurrence; newer fetchedAt, supplemental details still unavailable |
| Onboarding and profile |200,1.466s /0.558s | Same account username across all four before/after payloads; a separate privacy-choice difference is recorded below |

The reviewer independently compared each raw-response hash with the receipt.
All event responses retain the selected provider/source identity, title and
startAt; the occurrence remains in the future at its actual request. onePA's
new fetchedAt is15:58:55.363 UTC,325.519s after its seed fetchedAt. Stable and
Browse share that new timestamp and the complete projected fields: description,
three content sections, location, end time, source URL, timezone, pricing
guidance, registration deadline and area code. Absent optional image/category
fields were not filled in. Its separate content `status` remains `unknown`;
available detail text does not establish a known registration/vacancy status.

Ticketmaster's three after fetchedAt values are15:58:44.400,15:58:49.820 and
15:58:57.181 UTC. Its two stable responses otherwise deeply equal the before
response, including their explicit supplemental-details-unavailable state.

This is a real bounded recovery from the seed's onePA503, following the planned
wait, not merely a synthetic test. It does not identify the initial failure
stage, prove all future reads recover, close SC-03, attribute SC-15/SC-09, or
demonstrate the UI experience. No second natural-window repeat is claimed here.

## Before/after account-response discrepancy — unresolved

Profile raw bytes and parsed data are identical before/after. Onboarding raw
bytes **and parsed data differ**. A field-by-field comparison finds exactly one
changed account field: `optionalProcessingConsent`. Both values are valid
string enum values, not missing/null/type errors or a JSON-key-order change.
All four onboarding/profile usernames match; no account identifier or actual
privacy-choice value is reproduced here. Therefore the profile equality cannot
be expanded into “all account data unchanged”.

The prior v85 seed and after onboarding raw responses both match the current
v87 after body exactly. That is historical response evidence, not proof of a
particular actor or a clock-driven reset. Root reports that current emulator
login happened after these HTTP reads and no consent/settings control was
operated. This chronology does not identify who or what caused the difference.

Read-only source tracing found:

- `FirestoreOnboardingRepository.getStatus` reads binding/account in a
  transaction. `parseAccountProjection` and the transport response copy the
  stored enum; there is no asOf, TTL, deadline or expiry-derived conversion.
- The retained runtime's `initializeOwner` validates that enum, creates missing
  account-support records and, if needed, adds purpose-revocation generation
  while retaining existing account fields. It does not assign a different
  optional-processing choice.
- The ordinary settings write path owns explicit changes with revision and
  purpose-generation checks. Initial onboarding creates a new account; an
  existing binding is a conflict, not a rewrite of the existing choice.
- The reviewed HTTP script sends no product write; its only POST is Firebase
  sign-in. A read-only search of this stage's private scripts found no settings
  or account-document write entry. This is bounded source/script evidence,
  not a complete audit of every possible writer.

No data was corrected or restored by this reviewer. The discrepancy is kept as
an **unattributed response/data-integrity observation**. It must not be explained
by the310-second event-source wait or silently counted as expected behaviour.

## Later natural-window onePA repeat: unavailable again

Root subsequently executed the separately prepared repeat script. The private
output directory is
`onepa-same-id-repeat-2026-11-17T16-09-00-682Z-301f33/` under this stage's private
root. The reviewer checked its completed receipt and both raw responses. The
context-file SHA and selected stable-identity SHA equal the original current
v87 seed/after values; this is the **same occurrence**, not a historical fallback
or a substituted activity.

The receipt starts16:09:00.683 UTC,597010ms after the previous after run's final
response uptime; the first GET starts597360ms after it. There are exactly two
product GETs and no retry loop. The independent file review verifies script
completion at16:09:02.454 and the raw outcomes below. Root subsequently retained
the tool-observed process-exit receipt; the reviewer checked its exit0 and hash.

| Repeat request | Result | Safe correlation |
| --- | --- | --- |
| Same onePA stable detail |503 SERVICE_UNAVAILABLE,706ms | request ID req-1r |
| Same onePA Browse detail |503 SERVICE_UNAVAILABLE,716ms | request ID req-1s |

Both raw responses contain only the safe error envelope, so there is no new
event content or fetchedAt to compare. The receipt explicitly states this is
a **natural interval**, with intervening UI/source warmup able to refresh shared
state. It is not a second isolated expiry trial and does not establish an exact
cache-generation lifetime.

The recorded sequence is therefore **initial503 → successful full detail200 →
later503** for the same selected occurrence. That establishes bounded
intermittence across these observations and keeps SC-03 unresolved. It is not a
success-rate estimate, a specific provider-refusal diagnosis or proof that any
one of the three repaired mechanisms caused these failures. No network request,
source modification or repeated acquisition was performed by this reviewer.

## Seed evidence hashes

| Private artifact | SHA-256 |
| --- | --- |
| `api-seed.json` | `d23a604144117a528313b3b2d0c350c9524df343be7649a3a3088113df93f8d5` |
| `api-seed-process.json` | `f9062bd08948b33a64cbe8755c2a46884c01a4e2e357e51e4b8a919de2811d88` |
| `expiry-context-private.json` | `ec2c85216fc33657796bc2b9f324b01389c544fcc69394262d26af163edf48d8` |
| `seed-onboarding-response-private.json` | `70f82bf006d3da1338839d78647f2d02555e76eac4df105502fe7d13bd613c7f` |
| `seed-profile-response-private.json` | `c8f26daff2c45d32014cc726b4dcec5009dc79c609bcba40bd5620934517d99a` |
| `seed-browse-response-private.json` | `ee1cb484ab7730d669553996a2ab59a8cb27c95b40b44d7664f3c7a3e2fb216f` |
| `tm-stable-before-response-private.json` | `ae45363f8a9bb6bbef7ed63a480f886580a218ff22a728d49b3b36657f1294b0` |
| `onepa-stable-before-response-private.json` | `d54dc2af22792267cb27ee87d54af85ec34dc482cda3e87d8bcf74594fcb07ad` |
| `runtime-ops-response-private.json` | `8e3c7c29c93b7caabe26e789c504efb7c8334f767c2342e56fe7e50c350c8165` |
| `api-after.json` | `a2072200550bb918047703316fbccdf6f064895d4146d38525f4b40c1a92435f` |
| `api-after-process.json` | `f9879df892525cd4e9027af626482e60af50a2e65271f2a61c62fba21131bd75` |
| `tm-stable-after-1-response-private.json` | `4ebd4da122ea66a5a41327c1bbf9e974a01a5aac591c43b8724bc6119a9e44ae` |
| `tm-stable-after-2-response-private.json` | `d748fbf1e803a51c5b7e6ac796f5603e7ab78838f3e44062189c1994bda824e5` |
| `onepa-stable-after-response-private.json` | `5f33ac4758c00be19a5a23ef87189f1dca5fb30fd70a748742ec40d137729579` |
| `onepa-browse-after-response-private.json` | `fe4c518a946347e0abffbfd8527029d5264a31787a326a02f4fcd1124e8e974e` |
| `tm-browse-after-response-private.json` | `55855856b826fc240753bf5c6eaa27d4e02677d862dd20d62dc6b92318c5129e` |
| `after-onboarding-response-private.json` | `29c82ea89fedb3a0c8d176fccf2757a7044292e4a72adf241aa9f6a3f170b4cb` |
| `after-profile-response-private.json` | `c8f26daff2c45d32014cc726b4dcec5009dc79c609bcba40bd5620934517d99a` |
| `onepa-same-id-repeat-2026-11-17T16-09-00-682Z-301f33/receipt-private.json` | `3c46460aa5697c830ce4cf01fe95509be2b84b3a18ce8023f8f0ef779b3755d5` |
| `onepa-same-id-repeat-2026-11-17T16-09-00-682Z-301f33/stable-response-private.json` | `dc4166c95996c1ed38b867563783067f275e184fa927d42dde636faa75985306` |
| `onepa-same-id-repeat-2026-11-17T16-09-00-682Z-301f33/browse-response-private.json` | `b010159efe0cd8a20be32727da76b4650dc586017a85d67b3e559228eb7fa1bd` |
| `onepa-same-id-repeat-2026-11-17T16-09-00-682Z-301f33/process-receipt.json` | `e8e2fd139bd5858f36aea7c5b6b9a1f66ca925ff1aca94785e71ee80bf01e730` |
