# Content acquisition and performance investigation

15 November 2026. Continues [v69 acceptance](phone-regression-acceptance.md) and [provider diagnosis](provider-content-diagnostic.json), under the [confirmed restoration / B2 decision](../../decisions/2026-11-15-li-event-content-performance.md).

## Established content boundary

The running v69 Discovery API returned HTTP 200 for a 20-event list (1,674 ms) and a sampled missing-cover event detail (970 ms). Eight list events supplied genuine images, twelve supplied only category fallback images. All twenty omitted `info`, `description` and `additionalInfo`; the sampled detail omitted them too. Existing projection retained all eight genuine covers and correctly rejected category placeholders. No extra text can be restored from those particular responses.

The prior ordinary cloud browser probe observed HTTP 403 for the Ticketmaster homepage and linked PGL information page, with homepage title `Your Browsing Activity Has Been Paused`. The same reader on the existing operator host succeeded again at **09:37:50.934 UTC**, after the bounded fail-fast patch: 590 description characters, official `static.ticketmaster.sg` cover, four occurrence rows and the exact booking backlink. Provider HTML or credentials were not copied into the application or repository.

Historical [28 October verification](../2026-10-28-event-profile-discovery/verification.md) already records supplementary Ticketmaster 403, API covers and successful onePA detail acquisition. Successful list health never proves successful website enrichment. The exact provider rule and onset of any intermittent access change remain unknown. Current evidence distinguishes execution environments, but does not prove an IP-reputation, rate, country or code cause for the denial. No challenge was bypassed.

An attempted extra cloud onePA timing probe lost its SSH session without a complete result. It is **inconclusive**, not a successful/failing complete catalogue measurement. A subsequent exact-command-hash process check at 09:39:52 UTC found no remaining owned diagnostic process. Do not infer current onePA source health from this failed observation.

## Measured performance

A read-only diagnostic in the actual Japan East B1 container measured Chromium startup at **9,937 ms**, close to the unchanged 10-second Ticketmaster launch budget. Public Firestore catalogue setup/read took 3,203 ms. Two warm sixteen-document samples took 1,102/626 ms using individual reads in groups of five versus 145/105 ms using one SDK batch. These are public-tag microbenchmarks, not complete ranking latency or measurements of production read/write transactions. No gateway, transaction scope or personal cache was changed.

Four hours of five-minute Azure plan samples averaged 39.55% CPU / 72.6% memory, with largest five-minute averages of 82.6% / 80.2%. They include earlier deployment/diagnostics, not idle-only or load-test measurements. [The B2 proposal](../../planning/2026-11-15-event-content-b2-proposal.md) records current pricing, USD92.23 estimated credit and a conservative 62-day estimate. LI subsequently approved the bounded B2 trial with rollback if there is no useful improvement. The approved trial's actual result must be appended separately.

## Bounded reader correction

The existing reader ignored explicit homepage, booking-fallback and detail HTTP refusals, then waited for a selector timeout. The patch ends immediately on 403/429, closes the ephemeral context/browser and reports a safe stage-specific access-denied category. It retains ordinary 401 bootstrap, successful metadata parsing, resource rules, exact event binding and current API fallback. It adds no retries, persistent cache, fingerprint overrides, source permission or timeout extension.

Five offline reader regressions cover homepage 403/429, ordinary 401 bootstrap with named official cover, refused linked detail and refused booking fallback. Four denial tests failed against the pre-fix reader. Strict TypeScript compilation passes; focused reader/enrichment tests **19/19**, full backend **1,950/1,950**. The local connected reader success above separately confirms that bootstrap and actual public PGL content still work from the accessible operator environment.

At this record's preparation, the patch is a source candidate; the live deployment remains v69. Missing website-only covers/descriptions on a refused cloud host are **not restored**. [Provider inquiry draft](provider-access-support-draft.md) is prepared and has not been sent. No product/account writes, paid model calls, notification sends or purchase operations were used in this investigation.
