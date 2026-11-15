# Ticketmaster provider access inquiry — draft, not sent

Hello Ticketmaster support / developer support,

We operate ENMORI, a student event-discovery application. We use the authorized Discovery API for Singapore event identities and link users to the official booking site. Some Singapore events have only category fallback images and no description in their API list/detail responses.

Our existing Azure App Service in Japan East receives HTTP 403 on ordinary anonymous public navigation. At 2026-11-15 09:07:46 UTC, the homepage displayed “Your Browsing Activity Has Been Paused”; the public PGL detail was also denied:

- https://ticketmaster.sg/
- https://ticketmaster.sg/activity/detail/26sg_pglcs2major

The public-page reader uses a fresh Chromium context without login, retained user profile, proxy, fingerprint overrides or challenge solving. Acquisition is requested on event detail views, has at most two concurrent reads, and retains successful public enrichment in memory for at most five minutes. We stop on explicit refusal. No purchases or provider account operations are automated.

Could you confirm whether this intended public supplementary-content access is permitted and supported, and how to resolve the denial through an approved integration? Alternatively, can Singapore event-specific covers and full descriptions be provided through our existing Discovery API access or another licensed interface?

We can supply a request identifier or the current outbound IP privately if needed. API keys, user data and authentication material are not included in this inquiry.
