# v40 — Home recommendation acceptance corrections

28 October 2026, Asia/Singapore. Executable source:
`2306ac0c5a060b2d999a5b8c34e09704c446de31`, on
`souma/li-pr190-integration-20261028`. Subsequent evidence commits are docs only.

## LI feedback and corrections

| Feedback | Outcome |
| --- | --- |
| Home recommendations often unavailable | Reproduced concurrent Event/Friend reads with reversed request instants: the later-arriving older request replaced the shared generation, invalidating its peer and consuming a second traversal's deadline. Both reads failed. The corrected projection covers earlier concurrent instants within the existing five-minute window while retaining the original freshness TTL and each request's exact future filter. A same-account read-only replay returned two Events and a legitimate empty Friend result, using one current complete generation. |
| Browse / See all unclear | Home now says **浏览所有活动 / Browse all activities** for the source catalogue, and **查看全部推荐 / All recommendations** for the personalized list. Routes are unchanged. |
| Summary says missing location but Detail has one | The recommendation DTO has no location. Its card now says **查看详情了解地点 / Open details for location**. Real Detail still supplies the venue. No invented location, new public field or per-card detail request. |
| No region reason with Havelock | Existing rule is exact normalized profile region versus source venue city/country. Havelock does not match Singapore. Regression verifies no inferred reason; normalized Singapore does match. No ranking/geocoding/provider change. |

LI reported v39 passes for Music + Gaming / Havelock loading, stable order,
Gaming appearing after removing Music, and original checklist items 5/6. These
remain attributed human observations. This run preserved current profile,
interests, privacy, consent and participation rather than changing them for data.

## Teammate receipt consumed

[JIN review 5677510853 on #189](https://github.com/3427564237/enmori-app/pull/189#pullrequestreview-5677510853)
reported that cancelled preload could leave business dispatch and closed-target
lease waiting indefinitely. The wrapper now detaches cancelled/disposed/aborted
business waiters, observes the physical promise, and retains LocalModelLane's
pending/unknown quarantine. No send replay or physical-lane force release.

JIN's original reproduction is 1 pass / 2 fail before the fix. Afterwards both
counterexamples pass unchanged. Its control's old assumption that business
termination also waits for physical completion no longer holds: explicitly
draining the physical completion before checking idle gives 3/3. The adjusted
reproduction is [included](../evidence/2026-10-28-v40-acceptance/jin-cancel-physical-settlement.mjs),
with that observation change marked. This is LI validation, not JIN reapproval.

SHI's latest published receipt added no independent integration defect; #187
remains consumed. JIN's suggested additional-source research is still a separate
decision. No alternative source was adopted. No teammate was messaged this run.

## Verification and delivery

- Node 24.19.0 strict build passed. Full Backend suite: 1,590/1,590. The sole
  subsequently added region test passed in its 26-case file; no production code
  changed after that full suite. Concurrent-source, aggregate-deadline,
  complete-coverage and stale-generation checks remain passing.
- Flutter 3.47.2: 30/30 focused widget/router tests; full static analysis clean.
  New labels and location guidance failed before the change and passed after.
  The old full-app session-expiry fixture now supplies explicit initial/expired
  auth states; recreating its asynchronous auth stream from router state caused
  invalidation before navigation. Real session guards were not weakened.
- Signed APK: `build/group-delivery-v40/ENMORI-group-v40-release.apk`, package
  `com.enmori.app.group`, versionCode 40, 67,214,466 bytes. SHA-256:
  `344c26ff1d48a2465cf013039b9d503990587274bc185dad4751327224710897`.
  Same signing certificate and nine requested permissions as v39; nondebuggable.
- Installed with `adb install -r` at 12:05:10 SGT on the connected vivo phone.
  Installed bytes match the APK hash. First installation remains 21 October;
  no data clear, logout, profile or participation change.
- Controlled Backend moved by normal graceful stop/start to the frozen source
  candidate and was ready at 12:04:55 SGT. Configuration stayed byte-identical;
  previous v39 candidate/drop-in remain available for rollback. Worker/push stay
  off. Startup receipt is not a live AI-operation or semantic-quality claim.

Exact [candidate](../evidence/2026-10-28-v40-acceptance/candidate.json),
[verification](../evidence/2026-10-28-v40-acceptance/verification.json),
[service](../evidence/2026-10-28-v40-acceptance/service.json),
[before](../evidence/2026-10-28-v40-acceptance/recommendation-before.json) and
[after](../evidence/2026-10-28-v40-acceptance/recommendation-after.json) receipts
bind the claims. Private device XML/screenshots remain local; publish no account
or credential content.

## Physical checks and remaining boundaries

The existing authenticated phone session opens Home. The first two recommendations
remain Benson Boone and yung kai across Detail and catalogue round trips. Detail
for Benson Boone shows **The Star Theatre**; the recommendation card no longer
asserts missing location. Browse opens the searchable/classified source catalogue;
All recommendations starts with the same two rows. Next group moves to LANY and
SO IN LOVE without repeating the first two. These are bounded observations, not a
long-running reliability guarantee. An actual Home-key background / hot foreground
return also reloads the same first two successfully. The bounded service log
observation from 12:05:20 SGT through the final check contains no 5xx. The
[phone receipt](../evidence/2026-10-28-v40-acceptance/phone.json) binds private
screenshots/XML by hash and separates LI's prior evidence from this run.

Friend recommendations currently return empty, so real Friend grouping,
ignore/Undo and cross-account private-signal journeys remain **Not run**. Source
and widget tests do not replace those phone cases. No new real AI send, semantic
review, 30-minute-idle first-send or network-interruption test was performed.
The prior independent review/UAT/Release/Done gates remain open. This source is
committed locally; no main merge, release, Issue closure or new PR was performed.
