# LI: stable candidate usability and reliability review

Date: 17 November 2026, Asia/Singapore. Authority: LI / PM, current chat.

## Confirmed scope

LI requests review of the current ENMORI release from UI/UX, first-use and
daily-use perspectives, formation of a stable candidate and a release decision
based on actual acceptance. Establish source, installed APK and backend identity
before testing. Cover onboarding/interests, journal/history, AI, friends/profile,
event discovery/plans, settings/privacy; verify entry, comprehension, completion,
feedback and recovery. Review bilingual text, themes, text size, keyboard,
accessibility, loading/error/empty/success states and return navigation.

Prioritize v79's unresolved long-wait return to Home, intermittent recommendation
and detail reads, immediate Undo after recommendation-card removal and approved
onePA partial/unavailable degradation. A successful retry is not root-cause closure.
Exercise return/tab/background/lockscreen/offline-reconnect and leaving during
loading/saving. Preserve approved state and idempotency boundaries.

Fix only demonstrated, rooted issues within existing authority using minimal
changes and regression. Business rules, backend contracts, data models,
dependencies and infrastructure changes require a concrete proposal and decision
before implementation. Retain existing accounts/data and restore temporary test
settings. Keep private screenshots and raw sensitive logs outside the repository.

Use the same final APK and matching backend for repeated key-flow verification.
Deliver prioritized issues, evidence, changes, regression, candidate APK and known
limits; unverified work remains unverified. No fabricated user observations or
success rates. No authority to merge main, reset data or claim full acceptance is
implied.

## Preserved sources and scope

- [v79 flow decision](2026-11-17-li-activity-plan-flow.md) and its
  [physical evidence](../evidence/2026-11-17-activity-plan-flow/physical-acceptance.md)
  remain the baseline. The current request resumes broader acceptance; it does
  not turn the earlier bounded passes into whole-app acceptance.
- [v78 acquisition/waiting](2026-11-17-li-activity-loading-performance.md) and
  [supplemental degradation](2026-11-17-li-supplemental-query-degradation.md)
  retain source scope, freshness, explicit availability and recovery rules.
- [Functionality and reliability priority](2026-10-18-li-functionality-and-reliability-priority.md)
  remains applicable. This request adds a bounded accessibility review to the
  current audit, without inventing a TalkBack sign-off or reversing the earlier
  Sponsor-scoped historical evidence deferral.

Initial source baseline: v79 `c6f138b90522f5d5131a55f190dffa8965cd3bda`,
implementation `2925a7fc`. Work is isolated from the older dirty main checkout.

## Same-task social UI clarification

LI additionally reports that the full People you may know list and Friends
Activity surfaces remain visually rough, and that a friend's avatar can occupy
the entire horizontal space. Include these two surfaces and related profile
entry in the review. Reproduce and repair the avatar constraint defect and make
bounded presentation improvements using the current approved visual language.
Keep the existing fields, privacy, relationship, ranking, source/freshness and
navigation rules; no new social behavior or data projection is selected.

## Same-task physical acceptance deferral

During a long screen-off observation the phone was used in another application.
The interrupted observation is not acceptance evidence. LI was asked whether
the final candidate could be tested in an exclusive phone window and selected:
**“先完成代码和 APK，手机验收稍后继续”**.

Finish code, regression, evidence and the signed APK now. Do not operate the
phone further or install the new candidate in this continuation. Final-candidate
physical acceptance remains pending; this deferral cannot become a Pass or a
stable-release freeze. No persisted interest, participation, privacy or network
change was made in the interrupted phone trial; its unsaved temporary selection
was not submitted.

## Same-task phone reconnection

LI subsequently stated **“已连接手机”** in this continuing task. Resume the
already-requested retained-data installation and final-candidate physical
verification after code/build checks, coordinating phone use and stopping if
another foreground interaction interrupts the trial. Preserve the preceding
deferral and interrupted observation as historical evidence; connection itself
does not establish installation or any acceptance result.

A later phone-use interruption was paused immediately. LI then explicitly
confirmed **“我暂时不使用手机，请继续验收”**. Continue the same bounded
acceptance with foreground checks before input. The newly observed unknown
Check-in-edit outcome/exit wording is within the original rooted-minimal-repair
authorization; preserve its write/revision/reload contract.
