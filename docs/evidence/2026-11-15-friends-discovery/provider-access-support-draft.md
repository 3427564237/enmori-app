# Ticketmaster provider access inquiry — draft, not sent

Hello Ticketmaster support / developer support,

We operate ENMORI, a student event-discovery application. We use the authorized Discovery API for Singapore event identities and link users to the official booking site. Some Singapore events have only category fallback images and no description in their API list/detail responses.

Our existing Azure App Service in Japan East receives HTTP 403 on ordinary anonymous public navigation. At 2026-11-15 09:07:46 UTC, the homepage displayed “Your Browsing Activity Has Been Paused”; the public PGL detail was also denied:

- https://ticketmaster.sg/
- https://ticketmaster.sg/activity/detail/26sg_pglcs2major

The public-page reader uses a fresh Chromium context without login, retained user profile, proxy, fingerprint overrides or challenge solving. Acquisition is requested on event detail views, has at most two concurrent reads, and retains successful public enrichment in memory for at most five minutes. We stop on explicit refusal. No purchases or provider account operations are automated.

Could you confirm whether this intended public supplementary-content access is permitted and supported, and how to resolve the denial through an approved integration? Alternatively, can Singapore event-specific covers and full descriptions be provided through our existing Discovery API access or another licensed interface?

We can supply a request identifier or the current outbound IP privately if needed. API keys, user data and authentication material are not included in this inquiry.

Current follow-up: after the same application's approved performance upgrade to Japan East B2, a bounded public reader attempt at 2026-11-15 10:00:19 UTC still received homepage HTTP 403 and stopped immediately. The API remained available. The provider access issue was not resolved by faster compute.

Intended channel: [Ticketmaster Developer Support](https://developer.ticketmaster.com/support/contact-us/), whose official instructions include API integration, missing event data and error/request evidence. This document is a draft only; no form or message has been submitted.
