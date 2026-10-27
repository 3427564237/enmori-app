# LI — remaining feature batch

Date: 2026-10-27 (Asia/Singapore).

LI requested “继续按清单实现下一批剩余功能。” This authorizes implementing
priorities 4–8 of [the confirmed list](../planning/2026-10-27-li-next-increments.md),
without deployment or real-account writes.

LI subsequently resolved the map ambiguity: “地图必须使用完整地址，先补合同”.
This preserves the original complete-address requirement. A venue name or the
existing `locationLabel` cannot be substituted for an address. LI subsequently confirmed “确认合同并实现” for the
[complete-address/platform contract](../planning/2026-10-27-event-address-platform-contract.md).
Its opt-in DTO and native handoff boundary are approved for this batch.

Implementation details within existing contracts: the review covers the seven
civil dates ending at the selected History date, in its captured device IANA
zone. Count distinct dates containing records and exact user-entered Mood and
Activity labels, with missing values separate. No inferred mood, score or AI.
Partial reads remain explicitly incomplete and can stop/resume. Original record
navigation performs the existing owner read.

Recent events retain at most 20 unique Event IDs, newest viewed first, only in
memory for the observed authenticated session. Do not retain detail snapshots;
reopening the list and an event reads current authority. Clear on session
replacement including same UID, and expose an explicit Clear action.

AI search may return an existing displayable message ID to the same current
conversation, reveal and highlight that original message, and return to latest
loaded replies. Session, consent, tombstone, pending/unknown and source checks
continue to apply. Do not alter drafts, model inputs or prompt configuration.

## Test repair and device validation continuation

LI subsequently requested: “把这批剩下的既有测试失败也修复并验证，然后构建 APK，继续做手机验收。”
This supersedes the earlier no-build/no-device boundary for this continuation:
repair the 14 failures recorded in the two batch handoffs, validate, build the
next signed group APK, and install it as an in-place update on LI's connected
phone. Do not clear app data or change the account, signing identity, service
configuration, model budgets, or privacy choices.

The existing controlled backend needs this batch's approved avatar and opt-in
complete-address routes for meaningful device acceptance. Updating that owned
service from a verified frozen source candidate is an implementation step of
this acceptance run, using its existing configuration, data and dependencies;
retain the prior service candidate for rollback. This does not authorize a new
infrastructure service, schema migration, public avatar opt-in on LI's behalf,
or a calendar save. Native calendar acceptance opens and cancels the editor.

The AI test expectations follow the already confirmed
[v31 recovery decision](2026-10-26-li-v31-recovery-and-state-preservation.md):
bounded automatic foreground outcome reads and navigation to an independent
topic are allowed, while the original unresolved operation remains guarded.
No automatic Send or Retry is introduced.
