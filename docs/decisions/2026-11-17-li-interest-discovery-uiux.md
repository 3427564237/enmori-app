# LI: interest discovery and usability iteration

Date: 17 November 2026 (Asia/Singapore). Authority: LI / PM, current task.

## Confirmed scope

LI requested an iteration on UI/UX and functionality, identifying missing onePA interest mapping and Food/Dance recommendations. After source inspection and a read-only provider probe, LI explicitly selected all five usability improvements, exact classifications plus explicit onePA title phrases, and **14 fixed interest searches with a maximum of 190 upstream records**. The earlier choice to retain 50 records was explicitly replaced after evidence showed zero Food/Dance matches in the default sample. LI then instructed: **“Please implement the plan.”**

Implement from v75 source `936176dd`, preserving its Home/Profile/card and v74 friend-profile repairs. No new dependency, provider, database schema, infrastructure, scoring factor or user tracking is approved.

## Bounded public acquisition

Retain onePA's default five pages (at most 50 records). Also read the first official search page for each of the 14 fixed queries below, at most 10 records each. Maximum raw acquisition is 190 records before stable PA identity deduplication. Do not fetch further search pages, retry with another keyword, include courses, or fan out to event details. The query manifest is public and shared across users; personal preferences are not sent to onePA.

Use the existing ephemeral browser and resource restrictions, with at most four active pages: one default-list task and three fixed-query workers. Browser startup, queuing and all reads share one 180-second deadline. Preserve the existing 210-second recommendation snapshot, 225-second applicable client deadline and five-minute memory cache. A short/empty valid first page completes its search. Correlate each response with the exact query/page and verify public identity and official DOM links.

Publish onePA atomically only after all 15 tasks complete. Any required read error, deadline or conflicting normalized entity makes the whole current onePA acquisition unavailable, including default-list candidates. Do not reuse stale onePA data or publish partial work. Ticketmaster's independent availability remains. Cancellation must prevent late cache publication.

## Exact title mapping manifest

Ticketmaster retains its existing explicit classification rules. Only onePA receives the following finite title rules. `/` separates phrases; braces expand to the listed alternatives. No additional inferred phrase is authorized by this table.

| Interest | Fixed query | Title phrases |
| --- | --- | --- |
| Books | book | book club / reading club / book discussion / 读书会 |
| Travel | tour | guided tour / heritage tour / day trip / travel talk / 一日游 |
| Films | movie | film screening / movie screening / movie night / 电影放映 |
| Fitness | exercise | fitness class / exercise class / morning exercise / yoga / pilates / tai chi / qigong / 瑜伽 / 太极 |
| Dance | dance | line dance / mass dance / orang singapura dance / cardio dance / dance {class, workshop, fitness} / 排舞 / 舞蹈班 |
| Food | cooking | cooking {demo, demonstration, class, workshop} / baking {class, workshop} / food tasting / 烹饪示范 / 烹饪班 / 烘焙班 |
| Photography | photography | photography {class, workshop, outing} / photo walk / photowalk / 摄影班 / 摄影工作坊 |
| Technology | digital | digital literacy / digital skills / coding workshop / robotics workshop / artificial intelligence / 编程班 / 数码技能 |
| Outdoors | nature | nature walk / hiking / trekking / birdwatching / 徒步 / 观鸟 |
| Volunteering | volunteer | volunteer {recruitment, orientation, training} / beach clean up / litter picking / 义工招募 / 义工培训 |
| Art | art | art workshop / painting {class, workshop} / drawing class / pottery workshop / calligraphy class / 绘画班 / 陶艺工作坊 |
| Gaming | game | board game night / board games {session, club} / gaming tournament / esports / chess tournament / 桌游 / 电竞 |
| Community | community | community gathering / residents gathering / neighbourhood gathering / community festival / 邻里聚会 / 社区联谊 |
| Music | karaoke | karaoke / choir / music {concert, festival, workshop} / guitar class / piano class / 卡拉OK / 合唱 |

Normalize titles for matching only using Unicode NFKC, case normalization, collapsed whitespace and hyphens as spaces. English phrases require complete word boundaries; Chinese phrases match as complete phrases. Preserve source display titles. No description scan, generative inference, fuzzy matching, stemming or broad category inference. Multiple tags require separate matches; Dance does not imply Fitness, Food does not imply Art, and onePA does not imply Community. Dinner & Dance, incidental lunch and Book of Records do not independently match the whitelist.

Resolve matches only to currently selected active catalogue interests. Preserve existing rename/removal semantics and Music's configured catalogue ID; allow onePA's explicit Music concept through that ID-bound branch. Ranking stays interest-first under the 15 November amendment, with existing factors, eligibility, tie order and Home Top 2.

Fix the observed `Published` representation mismatch by accepting explicit numeric `1` or boolean `true`. Missing fields, other values, private/invitation/password flags and timezone constraints are not weakened. Deduplicate by stable identity after canonical normalization; fetched-at or search-presentation differences do not create an entity conflict, but conflicting identity/publicity/time/content is not silently merged.

## Approved client behavior

1. Home and standalone recommendation Browse actions open Browse directly. Ordinary Events entry still defaults to For you.
2. Non-default time filters traverse all available pages within the existing bounded source scope, as category/search filtering does. Expose waiting, stop, continue and clear-filter actions; interrupted/failed traversal never claims no matches.
3. Interest editing adds local display-name search, removable selected-tag summary and visible bottom count/save actions. Preserve 0–10 choices, inactive references, revision conflicts, explicit saved state and unsaved-exit confirmation.
4. Recommendation empty state offers Edit interests and Browse. Explain “No recommendations in the currently available activity range” separately from provider unavailability, including degraded nonempty results. Do not infer private eligibility/exclusion causes.
5. Existing My activity plans is reachable from both Events tabs; it remains requester-private. Preserve destination, query and scroll on return.

Use v75 visual conventions and existing bilingual localization; verify narrow screens, enlarged text, keyboard, semantics and route return.

## API and supersession

Add optional `sourceStatus: [{provider, available}]` to the existing v3 recommendation response, with provider limited to `ticketmaster` or `onepa` and boolean availability. Capture it with the complete source snapshot and retire it with that snapshot; do not read mutable global provider state when serializing another request. Missing status means unknown. Malformed present status is an invalid response. V1/V2 omit this field; existing v3 readers must remain compatible. No new endpoint, header, protocol version or storage migration.

This narrowly supersedes the onePA title prohibition in [recommendation v2](../../api/recommendation-v2-contract.md), the first-50-only acquisition paragraph in [28 October integration](2026-10-28-li-event-profile-discovery.md), and the affected precise empty copy/actions in [2 September empty results](2026-09-02-recommendation-empty-result-contract.md). The [25 September explicit mapping direction](2026-09-25-sprint3-event-source-criteria.md) now has the specific onePA title rows above; Q12 catalogue identities/lifecycle remain. Preserve all prior records. The [15 November ordering](2026-11-15-li-event-interest-first-ordering.md), [11 November budgets](2026-11-11-li-measured-onepa-wait-budget.md), privacy, source-use, source atomicity and required dependency failures remain.

## Verification and delivery

Test whitelist positive/negative cases, Food/Dance/Music, published true/1 and missing/private records, short/empty search pages, 190 raw records, concurrency, query correlation, identity deduplication, failure/cancellation and late results. Test frozen status, compatibility and the five UI journeys. Run applicable backend/Flutter regression, emulator, analysis and rendered UI checks.

Validate all 15 tasks on the existing runtime host; record counts, deduplication, per-interest valid matches and total elapsed time. Do not reduce coverage or extend budgets automatically if the full runtime read fails. Use the existing backend release/rollback and signed Android packaging paths once checks pass. No phone is connected at this decision; APK, runtime and physical retained-data acceptance are separate evidence. Fourteen supported rules/searches do not guarantee fourteen currently eligible event categories. Food/Dance acceptance requires real source and application results, not tests alone.
