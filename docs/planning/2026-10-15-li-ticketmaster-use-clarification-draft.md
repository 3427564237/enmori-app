# Ticketmaster minimal API-use clarification draft

Prepared for human review on15October2026. **Local draft only; not sent and not a claim of provider permission.** Do not include an API key, credentials, real user data or actual provider response.

Subject: Clarification of Discovery API event display and returned Singapore source links for a noncommercial university MVP

We are developing ENMORI, a small noncommercial university MVP. A human project owner has registered for developer access and accepted the applicable developer terms. An authorized read-only Discovery API probe confirmed Singapore results. We would like to confirm the permitted use before enabling event display in the application.

The proposed first increment would make user-triggered Singapore searches for the first20 source events, and one detail lookup when an activity is selected. We would display only validated event title/start time, optional end/venue/category and the exact source URL returned by Discovery. Missing information would be clearly labelled. We would not scrape the Singapore website, copy descriptions or images, process tickets/payments, show participant identities, infer registration, or replace Ticketmaster's purchase experience.

The Backend would keep credentials server-side. No event catalogue would be stored in Firestore or a persistent cache. Mobile presentation would be memory-only with a maximum visible age of five minutes and clearing on session exit/background. We would provide the applicable visitor-data disclosure and an operational removal/disable procedure satisfying the required removal window.

Could you confirm whether the Discovery API licence permits this minimal event display and opening the exact returned ticketmaster.sg event URL in the user's external browser on an explicit action? Copying the source URL would remain an auxiliary action. If linking or opening that destination needs separate authorization under the Singapore website terms, please identify the applicable permission channel. Please also identify any required attribution text, credits/notices or further conditions for this intended use. We are proposing plain-text source attribution and would not assume rights to use a logo.

This request is for permission clarification only; no API key or account credential is attached.

## Human submission note

Superseded workflow note, 15 October 2026: LI's [reduced-process direction](../decisions/2026-10-15-li-reduced-permission-process-and-followup.md) removes extra human submission from the current task list. This draft remains unsent reference material. Existing applicable terms/basis verification is handled by LI; no provider permission or coursework exemption is asserted.

The draft reflects LI's [direct external-open selection](../decisions/2026-10-15-li-event-external-open-selection.md). Historical optional routing, if a later consultation becomes necessary: the official [Contact Us page](https://developer.ticketmaster.com/support/contact-us/) distinguishes product/partnership inquiries from developer technical support. Any such later submission must exclude API keys and credential-bearing sample URLs. No submission, business partnership, payment or provider permission is asserted by this draft.
