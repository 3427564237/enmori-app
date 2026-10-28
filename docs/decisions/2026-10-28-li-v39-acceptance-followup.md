# LI v39 acceptance follow-up — 28 October 2026

LI reported that Home recommendations often become unavailable, the browse/all
buttons are unclear, and recommendation cards say no location although Detail
has one. LI asked about missing region reasons and delegated remaining checks
with the USB phone connected: “其他你来吧”.

LI's reported manual evidence: Music + Gaming, profile region Havelock; loading
and order worked, removing Music exposed Gaming, checklist items 5 and 6 passed.
These are user observations on v39, not assistant-observed or global acceptance.

This authorizes bounded defect correction and remaining local/phone validation.
The newer USB delegation supersedes only the earlier manual-only phone handling
restriction in `2026-10-28-li-pr190-integration.md`; that record is retained.
The prior integration decision and recommendation-v2 contract remain in force.
Home browse leads to the full source catalogue; all recommendations leads to the
personalized order. Clarify those labels. Recommendation summaries lack a
location field: direct the user to Detail instead of asserting missing location.
Do not add a public field or fetch every detail to fill the summary.

Region remains an exact normalized match to source city/country. Havelock must
not be inferred to match Singapore. No geocoding or new provider is authorized.

The reproduced out-of-order Event/Friend source reads require a bounded cache
correction: separate source coverage from cache freshness, using the existing
five-minute window to cover earlier concurrent request instants. Keep the exact
per-request future filter, complete traversal, 10-second deadline, original TTL,
explicit refresh/disable invalidation and failure semantics. This is an internal
read correction, not a new ranking or source contract.

JIN's PR #189 review 5677510853 also supplies a reproducible preload-cancellation
defect. Settle the abandoned business waiter while retaining physical model-lane
isolation; never clear pending/unknown state or replay a send.

Keep prior evidence and supersession history. Source tests, APK, installed phone,
individual UAT checks, Release and Done remain separate claims.
