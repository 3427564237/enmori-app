# LI: deploy the reviewed v85 backend and regress with v84 on emulator

Date: 17 November 2026, Asia/Singapore. Authority: LI / PM, current task.

LI instructed: “可以，按方案部署这份 v85 后端包，配合 v84 APK 用模拟器回归，重点验证详情过期后的读取与恢复、启动和重试流程。AI 续期先不动，不操作我的手机；onePA 和最初启动失败未查明的部分继续排查，别把一次成功当作解决。”

This approves the exact [deployment and rollback review](../evidence/2026-11-17-backend-expiry/deployment-review.md):
backend archive SHA-256 `7b2ffcccbf6c129ccaa839de1fced57125e2c41e33a5f746dc444189fcbe4140`,
source `9fb0e7c9bfc27ca860da66c83e39d9f6245564f4`, replacing the stated v78
baseline on the same existing Azure service, with the existing bounded
single-owner stop/drain/restart procedure and rollback if required.

Use the unchanged v84 release APK, SHA-256
`b544dde5ba9060b5fb20ce822ec19a6f44e6e96c9c268e3664122afed0a581d0`,
for Android emulator regression. Prioritize repeated exact-detail reads across
expiry, failure/recovery and authenticated startup/explicit Retry. Keep
source/local, HTTP, Android emulator and physical-phone evidence distinct.

AI renewal remains deferred: no purchase, grant refresh, cap/expiry change or
model verification send. Do not operate the user's physical phone. Continue
bounded investigation of onePA and the original startup failure without
claiming causal closure from a single success. This does not authorize a new
production diagnostic sink, source-access workaround or unrelated backend
change. Existing funds, unknown operations, accounts and data must be preserved.

This extends the [implementation approval](2026-11-17-li-expired-projection-repair.md)
only within the reviewed package/deployment scope; it is not release freezing
or closure of the independent unresolved failures.
