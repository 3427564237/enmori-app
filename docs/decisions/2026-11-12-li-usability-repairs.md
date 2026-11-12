# LI — v65 usability repair and follow-up verification

Date: 12 November 2026 (Asia/Singapore). Authority: LI's instruction in the current review chat, after the [v65 audit](../evidence/2026-11-12-usability-audit/README.md).

LI confirmed: “那就先修复保存中‘放弃’的误导、首页按钮跳动和活动加载问题，再优化这些 UI/UX，完成后重新跑测试和实机验收。可以继续用子 agent，大字模式和讲述人继续跳过。加载你可以可以尝试更换地区或者设备”.

## Approved bounded work

Repair the demonstrated save-in-flight/unknown-outcome exit wording, stabilize Home's primary Check-in target during own-profile loading, and diagnose and repair Event loading within the existing source contract. Improve the audit's existing UI/UX flows: Event controls/results hierarchy and safe navigation during pagination, duplicate optional location/weather notices, civil-time input/readback clarity, explicit notification renewal wording, and human-readable saved-versus-draft comparisons. Use existing dependencies and architecture.

Run relevant automated regressions, independent review, a signed compatible Android candidate and retained-data physical-device checks. The request to test the repaired software includes the necessary same-package retained-data installation. Do not uninstall or clear the existing account/data. Continue excluding large-text and screen-reader testing; this exclusion is not a claim about their conformance.

Region/device comparison is authorized for diagnosing loading: use existing available environments and devices; preserve the account's original area after a temporary client selection. Record whether an observation is a client filter, network/device difference, or actual source execution location. Changing a displayed area is not evidence of moving the server. This does not select new hosting, subscriptions, paid resources or an infrastructure migration.

## Preserved authority and boundaries

This confirms implementation of the bounded audit improvements; it supersedes their prior proposal-only status. The audit remains evidence rather than a new source of business rules. Existing consent, visibility, source coverage, snapshot lifetime, pagination, civil-time/DST, notification registration lifetime, monetary and unknown-result contracts remain unchanged. The [measured onePA wait budget](2026-11-11-li-measured-onepa-wait-budget.md) remains the controlling selected budget until evidence justifies a compatible repair or a new explicit decision.

Do not turn a slow/unavailable source into fabricated success, silently waive the five-page bound, bypass source access restrictions, add persistent caching, new APIs, background services or dependencies, change deployment region, extend AI credit validity, purchase credit, enable the user's optional consent, or send a notification/paid generation merely to manufacture acceptance. Any material architectural or infrastructure decision remains separately controlled by AGENTS.md. Existing successful v65 restart and funding evidence is retained; this work does not reopen those implementations.

Validation must distinguish source/fake tests, real connected services, the installed APK and physical-phone observations. Report residual limitations, including current external-source failures, rather than declaring full UAT/Release from a bounded repair pass.
