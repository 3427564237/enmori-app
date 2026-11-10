# LI follow-up: runtime repairs and populated/Admin validation

Date: 2026-11-05 (Asia/Singapore). Authority: LI / PM in this task.

LI requested “修复，没有数据可以添加，admin也测试了吗” after the bounded v57 phone check. This authorizes investigation and repair of observed recommendation/provider failures and adding clearly labelled test data to cover previously empty search/chart paths. Existing records and global privacy settings remain intact. Two new QA57 Check-ins use per-record Private visibility and explicit test-only text/mood labels; they are not evidence of the user's real feelings.

LI subsequently selected “允许专用临时管理员测试” for a concrete proposal to create a dedicated temporary account with the existing `enmoriAdmin` claim, operate only QA57-marked test interest tags, then revoke its privilege and clean up that account. This narrowly extends the earlier [no real Admin grant/test write boundary](2026-11-05-li-ai-latency-admin-polish.md) for this controlled validation only. It does not grant the user's existing account Admin access or permit changes to existing catalogue entries. Use an isolated application session to preserve the installed group app's login/data. The approved reference-proof deletion gate remains intact; test tags must not bypass it and may be left inactive if safe physical deletion is unavailable.

Keep existing API contracts, ordinary/client deadlines and provider access restrictions unless a separately recorded approval changes them. No paid AI dispatch, new dependency or infrastructure selection is authorized by this follow-up. Record physical results independently from source/Emulator tests and preserve prior failed installation/empty-state evidence.

## Confirmed Event read-budget alignment

LI selected “允许活动读取最多30秒” after reviewing the measured onePA 50-record public-list read (17.354 seconds) and the current 10-second per-source cutoff. Apply the existing 20-second bounded browser acquisition to the Azure combined source and set only Event browse/list/next-page and Event recommendation GETs to a 30-second total client budget. Existing detail GETs already allow 30 seconds. Other ordinary reads, all writes and the AI 15-second target remain unchanged. This narrowly supersedes the ordinary Event-read deadline exception in the [28 October decision](2026-10-28-li-event-profile-discovery.md) and the Azure 10-second source cutoff, without introducing retries, new sources, access-control bypasses or extra paid requests.
