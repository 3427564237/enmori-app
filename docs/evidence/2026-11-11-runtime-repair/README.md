# 11 November: onePA, AI latency and Flutter regression repair

This record separates source tests, public-source diagnostics and historical AI timing. It is not Release/UAT acceptance or proof that the full AI reply meets 15 seconds. Work is continuing under the [LI decision](../../decisions/2026-11-11-li-onepa-ai-failure-repair.md).

## Flutter baseline and repairs

The fresh baseline had 1,619 passes and 62 failures (1,681 total, no skips). The failures included obsolete navigation/cancellation expectations, menu relocation and lazy widgets outside the viewport, fixtures missing explicit authentication observation, and outdated public Event snapshot lifetime expectations. Tests now follow the approved 22 October session-owned AI navigation and 26 October bounded outcome recovery / five-minute public Event retention decisions. Explicit cancel, session replacement, no automatic resend, original outcome identity, failed next-page retry, and expiry assertions remain.

One actual UI defect was found: the Interest editor discard dialog used its departing page context for localization during the closing animation. It now uses the dialog context. The regression journey confirms explicit discard without a deactivated-ancestor exception.

After the repairs, the complete Flutter suite passed **1,681/1,681**, with no skips. Static analysis initially found three missing-brace style diagnostics in changed tests; those have been corrected and the recheck passed with no issues. See `source-validation.json` for log hashes and final counts. The latest complete Backend run passed **1,824/1,824**, with no failures, skips or cancellations.

The connected AI acceptance helper now also checks the IDs returned by the latest history response. Cached merged messages cannot masquerade as a successful fresh history read.

## Backend source work

Independent reads of the same already-authorized transaction now overlap for the cost ledger/attempt and operation metadata. Missing-parent child collections are checked concurrently and all must be empty. All started reads settle before return; original failure precedence, fresh authorization, consent checks, fence checks, cancellation guards and no-write-before-validation remain. No checkpoint is removed and no model, prompt, budget or deadline is changed.

## Historical AI decomposition

`latency-analysis.json` derives timings from the three existing 5 November synthetic requests and their private cost-ledger receipts; it does not contain a new paid call. The execute path spent approximately 13.1–13.8 seconds before cost reservation and 12.5–13.7 seconds after usage confirmation. The middle interval (8.4–10.4 seconds) also includes authorization, token count and accounting, so it is not a pure model timing. The earlier 36–40 second full replies remain failed evidence against the 15-second target.

## onePA diagnosis

Azure failed the bounded reader in cold, warmed, navigation-commit and visible-window comparisons. The visible comparison reached HTTP 200 and the normal “onePA | Event Search” document, with no challenge detected by the bounded page inspection, but did not receive the catalogue query before the deadline. This does not establish a general absence of provider challenges.

The same visible diagnostic on the local host returned all five provider query responses with HTTP 201 and all 50 validated rows in 8.185 seconds (8.25 seconds process wall time). It used the installed pinned browser in a temporary context; no user browser profile or new dependency. This establishes that the current provider path and parser can work, while leaving the Azure environment difference unresolved. The visible/warm/navigation modifications are diagnostic variants, not deployed fixes.

No new paid AI calls, temporary Admin accounts, user-data changes, service deployment or APK installation are represented by these diagnostics. Prior Admin cleanup and phone login/data remain preserved.

## Azure follow-up evidence

The Chromium installation is on SMB2 storage; `/tmp` is on overlayfs. Copying the same browser to a temporary local directory took 26.724 seconds and preserved its main binary hash. The visible diagnostic started faster (warm-ready at 5.869 seconds; page action at 9.727 seconds) but still missed the 20-second source deadline before the first catalogue query. It was **not** accepted as a repair or deployed. The temporary copy was removed.

A separate, read-only Firestore probe observed a first system-metadata read at 3.121 seconds, followed by 154 / 98 / 122 milliseconds. A transaction containing two sequential metadata reads took 468 milliseconds. These are diagnostic observations without user content or paid AI, not a full Conversation benchmark. The script, temporary ADC and directory were removed.

The [checkpoint-consolidation proposal](../../planning/2026-11-11-ai-checkpoint-read-consolidation-proposal.md) is pending explicit approval; it has not been implemented. A separate [bounded paid remeasurement proposal](../../planning/2026-11-11-ai-latency-remeasurement-proposal.md) preserves the original cap and requires current balance/pricing evidence, since the prior evidence expired on 6 November.

## Source candidate and remaining runtime limitations

The tested source repairs are committed locally as `469eaafe0914112ddeee8046337ee24f34a7502c`; no push, merge or service deployment was performed. The v59 APK was built from an isolated clean checkout with the original Azure Dart defines and signing key. The first `--no-pub` release attempt reused an integration-test plugin registrant and failed; rebuilding with default release tooling regenerated it correctly, without source/dependency changes. APK metadata and hash are in `apk-v59.json`. It has not been installed: ADB currently has no connected phone, so the current installed version and physical behavior could not be reverified.

Further onePA resource timing reached the normal document and public JavaScript/initialization responses with HTTP 200, but no catalogue response before the deadline. A headless comparison returned HTTP 403 and was stopped without an access-control workaround. Restoring normal allowed image loading in headed mode also failed the 20-second deadline. The prepared-blank-page diagnostic failed during browser launch before any source navigation; it cannot establish the result of a 20-second source read. A subsequent startup-classified attempt prepared a blank page and reached HTTP 200, then the 20-second source deadline expired while waiting for the first catalogue response. None of these variants is deployed.

Azure's five-minute Plan averages during the measured hour were 19.2–36.8% CPU and 65.4–73.8% memory; these aggregate values do not establish available burst performance or a sufficient replacement SKU. No resource upgrade, host migration, reduced 50-row scope or longer deadline is selected.
