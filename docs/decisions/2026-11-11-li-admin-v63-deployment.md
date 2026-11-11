# LI — deploy Admin v63 and preserve the phone session

Date: 11 November 2026, Asia/Singapore. Source: LI's explicit follow-up in this task: “继续部署后端，并把 v63 安装到手机上，保留现有数据和登录状态。”

This extends the deployment/install boundary of the [approved Admin increment](2026-11-11-li-admin-value-integration.md) only for deploying its already verified Backend to the existing `enmori-backend-20261029` Azure service and updating the currently connected Android phone with the signed v63 `com.enmori.app.group` APK. The [local integration/build evidence](../evidence/2026-11-11-admin-value-v63/README.md) remains the source-stage record.

Use the existing run-from-package deployment path and complete stop/drain/current-fence claim procedure. Keep the previous package. Preserve the existing grant, cap, ledger, attempts, reservations, API key and all unrelated settings; a fresh single-use startup claim is part of the same deployment, not a new monetary authorization. Do not refresh stale balance/pricing evidence or perform a paid model probe under this request.

Verify package identity and original signer, install with `adb install -r`, and verify version and the retained authenticated session. Do not uninstall, clear application data, log out, change credentials, reset product data, create catalogue/assignment fixtures, or grant roles. Read-only API and phone verification is within scope. The already approved Admin audit maintenance may run as part of normal service startup; no broader database cleanup is authorized.

Report deployment, installed APK, observed login retention and unverified phone/UAT boundaries separately. No new infrastructure, dependency, model selection, remote-main merge, collaborator message or release acceptance is authorized by this follow-up.
