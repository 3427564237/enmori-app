# LI — execute Azure Backend deployment, Firebase identity and HTTPS

Date: 2026-10-29 (Asia/Singapore). Authority: LI / PM.

LI instructed: “继续把后端部署到 Azure，Firebase 身份配置和 HTTPS 也一起做好，免费优先，能直接完成的就完成。云端 AI 继续暂缓，先确保我的主机关机后普通功能能用。”

This extends the [Backend-first direction](2026-10-29-li-backend-first-cloud-ai-paused.md)
from preparation to execution of ordinary Backend hosting, scoped Firebase
identity, HTTPS and the corresponding client endpoint. Use existing Firebase
Auth/data and approved ordinary features. Select the smallest suitable available
hosting option, prefer free allowances, preserve student spending protections,
and complete feasible implementation and verification without teammate delay.
Do not resume cloud model tests or generation, copy personal ADC credentials to
a host, migrate business data or claim a phone/off-host test from source checks.

Specific cloud resources, region, actual meter coverage, identity permission
scope and final endpoint must be recorded from verified account state. A blanket
paid upgrade, removal of spending limits or indefinite charges is not authorized.
Any unavoidable user login/MFA remains a user action. The existing deployment
remains available until replacement identity, ordinary APIs, HTTPS and client
behavior have been verified. No destructive cutover or account-data reset.

## Execution selection within the delegated deployment scope

The subscription rejects Southeast Asia and permits Japan East. The created
`enmori-backend-free` plan was read back as Linux F1 / Free in Japan East.
`enmori-backend-20261029.azurewebsites.net` is the selected platform-managed HTTPS
address. This is a controlled trial: F1 has no SLA, idle unloading and daily CPU
limits, so it does not establish always-available production acceptance. No paid
tier, custom domain, paid certificate, monitoring add-on or spending-limit change.

Use its system-assigned managed identity with Google Workload Identity Federation
and a dedicated `enmori-azure-backend` service account in the existing Firebase
project. Restrict the Entra application to the assigned Backend identity and the
Google provider to that exact subject, tenant and application audience. Grant only
Firebase Auth viewer and default-database Firestore user access; no service-account
private key, Auth user-management authority or personal ADC is deployed.

The Azure entry uses the existing remote Backend composition with no model or
first-flow worker. It listens on the platform's internal HTTP port behind Azure
HTTPS, preserving local runner bindings. Bundle the approved Node 24.19.0 binary
to retain the exact runtime baseline. Existing Ticketmaster credentials remain
server-side application settings; no new event provider or product model.

## Subsequent explicit B1 approval

The F1 startup attempt reached `QuotaExceeded` / `usageState: Exceeded` before
ordinary API acceptance. LI then answered **“允许使用学生赠金部署 B1”** to the
concrete Japan East Linux B1 selection, US$0.019/hour (about US$13.87/730-hour
month), using only the existing US$100 student credit. Upgrade this same plan
to one B1 instance; keep the subscription spending limit on, add no payment card
and do not enable automatic paid conversion. This supersedes only the free-tier
selection above. Firebase usage remains governed by its separate existing
billing account; Azure credits do not cover Google costs.

Integrate the already-approved ordinary-feature source used by installed v48
(`004817a3` evidence, APK source `0ec7df53`) so a cloud candidate does not regress
the event/detail/profile/discovery work. Retain its decision trail. The Azure
entry still constructs no AI, appointment worker or push sender; the existing
local-host service remains untouched.

The existing event source composition includes the approved Playwright 1.64.1
public readers. Include the existing region asset in the deployment bundle. The
Azure Linux startup installs the pinned Playwright release's OS dependency list,
downloads its matching Chromium 1248 to the persistent private host cache, and
uses Xvfb for the existing ordinary headed
browser mode. This changes the host runtime only, not source access rules or
retention. Use a hoisted production dependency installation for ZIP packaging;
the first dereferenced pnpm symlink archive failed module resolution before
Firebase access, so that archive is not an accepted deployment.
The initial archive including Chromium hit an upload gateway timeout without a
new Kudu deployment. The browser is therefore downloaded by the pinned vendor
installer on Azure instead of transferring the same large binary from this host.

## Ordinary activity deadline correction

LI reported “活动不可用” on mobile data after v51 installation. A live cloud
list returned 18 Ticketmaster rows only after 42.777 seconds, with onePA marked
unavailable. The approved ordinary mobile read budget remains 15 seconds; do not
extend it or turn provider failure into empty success. As a repair within the
existing independent-source/partial-failure contract, the Azure composition caps
each combined list provider at ten seconds, propagates cancellation and stops awaiting asynchronous
browser cleanup after that deadline. Keep failures explicit in `sourceStatus`,
reject when both providers fail, and exclude late results from response and
pagination completion. This does not authorize challenge bypass, a paid tier
change, a different data source, or a claim that missing onePA/detail content is
complete. The existing local composition and separate detail acquisition limit remain unchanged.
