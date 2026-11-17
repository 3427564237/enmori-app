# LI: deploy the exact v87 backend with the unchanged v86 APK

Date: 17 November 2026, Asia/Singapore. Authority: LI / PM, current task.

LI instructed: “可以，按方案部署 v87，配合同一 v86 APK 做模拟器回归，重点验证详情过期与恢复、启动重试和 onePA 降级。AI 续期先不动，不操作手机；未查明的问题继续排查，不要把一次成功当作解决。”

This approves the [reviewed deployment and rollback procedure](../evidence/2026-11-17-stability-continuation/deployment-review.md), specifically the backend v87 archive SHA-256 `357e981363ddc0c5297dd224dabbed288e5c637059d9f9819146cc68fa747102`, source `9e4c3ca6c44bc243823ee3f0a5d34ae3ec76bb28`, replacing the stated v85 baseline on the same existing Azure service. Retain the existing bounded single-owner stop/drain/restart procedure and exact v85 rollback.

Use the unchanged v86 release APK, SHA-256 `cedbd33d3538810f4d7a24cadfeb65876c6188f280112f54d6b24027e8bb3270`. Repeat detail expiry/recovery, startup/explicit Retry and onePA degradation in the Android emulator. Distinguish source, offline tests, actual HTTP and emulator evidence. No physical-phone operation is authorized.

AI renewal remains deferred: no grant refresh, cap/expiry change, purchase or model verification send. Preserve existing account data, privacy choices, financial records and unknown operations. This authorizes neither a new production diagnostic sink nor provider-access workarounds, new dependencies, infrastructure changes or additional backend changes. Continue investigating unresolved causes without equating a single success to resolution.

This extends only deployment authority for the previously approved repairs. It preserves prior reports and does not declare a stable release or supersede outstanding acceptance gates.
