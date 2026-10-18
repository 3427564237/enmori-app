# Local Sponsor Event implementation evidence

Authority: [S-PM-1019-LI-SPONSOR-DEMO-LOCAL-TAKEOVER](../../decisions/2026-10-19-li-sponsor-demo-local-takeover.md). Implementation baseline `97b169f6f13b2af44ee2cde1fddb52d8b92386c9`; Event code `8d2ed5001fb8f8b38dba654b0911ddeb84f4c2a7`.

The isolated Event branch implements exact Ticketmaster occurrence identity mapped to stable opaque SHA-256 Event identities, an optional controlled process cache with one atomic generation and a five-minute ceiling, and matching recommendation/detail adapters. Only exact Music segment `KZFzniwnSyZfZ7v7nJ` maps to `interest_music`; labels and other segments do not. The identifier is independently verified in the [official Discovery API example](https://developer.ticketmaster.com/products-and-docs/apis/discovery/v2/). SG/future/first-batch20, safe source projection and deterministic v1 ranking remain unchanged. Cache disable/expiry invalidates the generation; source failure remains a safe failure, including for empty interests.

Optional end time now passes through stored recommendation records, internal/public DTOs, OpenAPI, Dart parsing and pages. Missing end is omitted and explicitly labelled “End time not provided.” Canonical UTC comparison retains nanosecond precision. The Interest editor shows the actual active catalogue count. Recommendation detail gains an explicit guarded source-open action using the existing platform capability; native handoff is not a registration claim. Recommendation/detail expiry and background clearing require an explicit read again.

## Verification on Event branch

Pinned Node `24.19.0`, existing dependency tree; Flutter `3.47.2` / Dart `3.13.2`; no dependency or toolchain update.

- TypeScript build: passed.
- Full Backend unit/transport/strict OpenAPI suite: **975 passed, zero failed/skipped**.
- Full Flutter suite (`flutter test --no-pub`): **744 passed**.
- Flutter static analysis (`flutter analyze --no-pub`): **No issues found**.
- `git diff --check`: passed.

New tests cover a common generation across browse/recommendation/detail, stable identities across renames and equal titles, expiry/failure/retry/disable, concurrent atomic replacement and invalidated completion, exact Music mapping, no source calls before account authorization, missing/invalid end, explicit source action, stale-action refusal and visible expiry. Strict OpenAPI equality passes with end optional. The initial Flutter expiry change exposed a pending timer after the router’s existing interest-save refresh; provider listener cancellation now invalidates that timer and pending completion. The failure was preserved in the private local test log and the full suite then passed.

## Composition seams and remaining acceptance

`createControlledEventBrowse({projectionCache:true,...})` selects the bounded cache only in approved controlled composition. `createControlledEventRecommendations({gateway,source:eventBrowse.source,clock})` supplies `recommendEvents` and `eventDetail`; accounts composition owns wiring. `eventDetailSourceActionsProvider` is injected from the existing `activitySourceActionsProvider` at the app root. The v2 catalogue seed is owned by accounts composition; legacy fixture behaviour remains separate.

This evidence uses synthetic fixtures and injected source responses. Real Ticketmaster activation, final combined service/strict fixtures, connected vivo browser handoff, source failure/expiry and two-round whole-journey acceptance remain **Not Run in this branch**. No provider credential, raw source response, account secret, APK, runtime activation, cloud deployment, Release or Done claim is included here. Independent review is tracked by the parent agent against exact Event commits.
