# Friend demo account and deployed recommendation verification

Observed 11 November 2026, beginning 07:20:07 UTC (15:20:07 Singapore). The coordinated deployed candidate was `a04251b0775e512bafdcafb75d026edc2caf499b`. The [sanitized receipt](verification.json) contains response metadata only. Account credentials, tokens, owner identifiers, revision tokens and raw response receipts remain outside Git.

## Connected-service result

The newly created ordinary demonstration account signed in through Firebase email/password authentication. Its own Profile and Recommendation Profile reads returned HTTP 200. Using that account's real ID token and `X-ENMORI-Contract-Version: 3`, sequential requests returned:

| Read | HTTP | Elapsed | State | Suggestions |
| --- | --- | --- | --- | --- |
| Friends All | 200 | 10,954 ms | `ready` | 1 |
| Friends Home | 200 | 11,466 ms | `ready` | 1 |

Both responses contained the user-supplied username `3427564237` at index 0. Both disclosed two shared interests (Gaming and Music), zero common Events, and a shared school/organization reason. No Event page-zero refresh was issued during this smoke. This is connected-service evidence using the new friend's identity; it is not a main-account API call or physical-phone acceptance.

The ordinary account's authorized setup includes a clearly marked demonstration profile, public profile/interests/location/participation settings, public Check-in visibility, discovery and matching enabled, accepted optional recommendation processing, and six selected interests. No administrator privilege or OpenAI processing consent was granted. No friend requests or messages were sent, and the main user's data was not changed.

## Reverse matching evidence and limit

The existing v3 ranking function was evaluated with a redacted projection preserving the shared factors disclosed by the successful response. Two shared interests contribute 8 points and shared affiliation contributes 1, producing **9 public-factor points** in either direction. This proves a positive matching signal for the main account and demonstration friend without needing the main account's private fields.

It does **not** prove the main account's final eligibility result or Home Top 2 position. Discovery-card output contains only username and display name; it does not expose the complete ranking projection. The main requester's ignore state and full competing candidate pool were not read or reconstructed. Other eligible candidates may receive region or common-Event points. No main-account token was created, reused or impersonated. Confirmation that the main user actually sees the friend remains a main-account refresh on the phone or an authenticated main-account API read.

## Repair and source verification

Before repair, the same new friend's All request returned HTTP 503 after 47,261 ms. The source snapshot still had a 45-second aggregate budget while the demo provider budget had been extended to 90 seconds, and the friend client retained the ordinary 15-second budget. The [immediate-demo decision](../../decisions/2026-11-11-li-immediate-demo.md) now aligns the multi-provider snapshot to 110 seconds and friend Home/All GETs to 120 seconds. Genuine source failure, complete candidate ordering, current consent/privacy checks, source-generation validation and write budgets retain their existing semantics.

The original 45-second early failure was reproduced with controlled timers. After the change, 45 related Backend tests passed, including completion after 90 seconds, failure at the 110-second aggregate limit and rejection of late publication. Nineteen directed Flutter tests and targeted analysis passed. Those source checks preceded this successful deployed smoke and do not replace phone verification.
