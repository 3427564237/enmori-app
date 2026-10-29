# Azure ordinary Backend deployment

29 October 2026, Asia/Singapore. Authority: [LI deployment and B1 decision](../decisions/2026-10-29-li-azure-backend-deployment.md).

## Running service and cost boundary

- HTTPS API: `https://enmori-backend-20261029.azurewebsites.net`.
- Azure for Students, resource group `enmori-student-cloud`, Japan East.
- App `enmori-backend-20261029`; plan `enmori-backend-free` retains its historical name but is now **Linux B1 / Basic / one instance**.
- Verified Japan East Linux B1 retail meter: US$0.019/hour, approximately US$13.87 per 730 hours. LI explicitly approved consuming existing student credit. The portal showed US$100 before deployment; this is not a claim that the balance remains unchanged after running B1.
- Fresh subscription readback: Enabled, spending limit On. No card, removal of spending protection, automatic paid conversion, paid certificate or monitoring add-on was configured. Existing Firebase billing is separate from Azure credit.
- HTTPS-only, TLS minimum 1.2, HTTP/2, Always On. FTPS and basic publishing credentials disabled. HTTP redirects to HTTPS (301); a valid public TLS connection reaches the authenticated API.
- This is a single-instance student deployment, not an unlimited free service or a high-availability claim.

## Firebase identity and data

Azure's system-assigned identity exchanges a token through Google Workload Identity Federation. The dedicated `enmori-azure-backend` service account has Firebase Auth viewer and Firestore user access restricted by an IAM condition to the existing `(default)` database. The provider checks the exact Azure identity subject, tenant, application audience and `Enmori.Backend` role. The Entra application requires role assignment.

The service account has zero user-managed keys. No personal ADC, service-account private key, user token or cloud AI key is in the deployment ZIP. The platform identity header is used only in a transient private credential file; the Backend removes this file on shutdown. Existing Ticketmaster credentials remain server-side settings. User data remains in the existing Firebase project; no migration or account reset occurred.

The application still verifies Firebase ID tokens and their disabled/revoked state, then derives the account owner through existing Backend authorization. Admin access does not bypass that application boundary. Native email/password Authentication was exercised with synthetic identities; no browser OAuth domain change was necessary for that flow.

## Source and artifacts

- Azure entry: `tool/azure_backend.mjs`, startup: `tool/start_azure_backend.sh`.
- Application Node is bundled **24.19.0**, independent of the platform image's Node patch. Startup log verified this exact application runtime.
- Existing Playwright 1.64.1 installs its Chromium 1248 and OS dependencies on Azure. Browser cache is under `/home/enmori-browsers`; startup timeout is 600 seconds. A fresh first start took about 268 seconds. A restart was verified successfully; dependency installation/download still adds an external startup dependency.
- ZIP uses locked, hoisted production dependencies, compiled Backend, approved region assets, three entry/helper files and the pinned Node binary. It contains no model or browser binary. Archive paths/sensitive suffix checks and extracted runtime import passed.
- Current bundle source: `e057289472106051087c70f5d72afe5fd4893f3b`. This integrates installed v50 source `acab521272958cf2b1c7198542b0e75f42197175`, including uncertain-onboarding readback, while preserving the Azure URL guard and Backend-only entry tests.
- Current ZIP: 67,843,729 bytes; SHA-256 `837438bb216321791996a7a19b161805400447988c59a5c23e4599a645957fe2`.
- Cloud APK: versionCode **51**, versionName `1.0.0-cloud20261029`, package `com.enmori.app.group`, same source as current ZIP.
- APK SHA-256: `3c6c00da6a8cb929d2317b1394373e6f79019f6e38185eb366c83a8d0dc36639`.
- Signer SHA-256: `0fa59aeaa9ce03a830405ce79136b4abc3d62510fbb8360c8ebf7c88a82966ee`, matching installed v50. Build succeeded in 74.9 seconds.
- Artifacts/private operator receipts reside under `/home/miku/.local/state/enmori-azure-backend-20261029/`, outside Git. Earlier cloud v49 was superseded before installation when the actual phone advanced to v50.

The Azure composition supplies neither a model nor a first-flow worker/push sender. No Groq/Ollama calls were made. Existing local-host service and appointments were not restarted or migrated. Cloud APK ordinary traffic uses Azure; local AI availability is not part of this deployment.

## Verification layers

At `e057289`, strict Backend compilation and **1,703/1,703** Backend tests passed. Azure and actual local entry boundary tests passed **13/13**. Focused Flutter configuration, onboarding recovery, cancellation and installation/notification ownership tests passed **56/56**. These use offline fakes; they are not model execution evidence.

The earlier broader Flutter run after v48 integration had **1,513 passed and 72 failed**. This gate remains open. Two attempted baseline test files in the separate v48 checkout failed compilation, so the failures have not all been established as pre-existing. Focused green checks and successful APK build do not erase this failure or establish Release readiness.

The first accepted live deployment (`ab0921f8-3de4-432c-b142-1c0dca7dca46`, Kudu complete status 4) ran the ordinary Backend with pinned Node and `aiConfigured:false`. Synthetic users, not real accounts, verified:

- Unauthenticated and invalid-token requests: 401.
- Two independent onboarding completions: 201; own profile reads: 200.
- Profile and Settings saves: 200; stale profile revision: 412.
- Second account retains its own profile; private Check-in create/read: 201/200, cross-owner read: 404.
- Recommendation-profile and Friends reads: 200. An empty synthetic Friends list is not Friend recommendation acceptance.
- Event browse contract v3: 200. This initial status-only check alone does not prove every provider was available.
- After an actual Azure restart, the saved profile and private Check-in both read back correctly (200).
- Disabling the owned synthetic identity caused access denial (403).
- Both synthetic Auth users and owned product/idempotency records were removed after verification.

Final deployment and phone observations are recorded below. Physical mobile-network use with the personal host off is a distinct user-operated acceptance gate; neither a public URL nor a source test substitutes for it.

### Final deployed snapshot and subsequently reported activity failure

Kudu deployment `d15cde76-fd07-44e2-988d-8e878f74f3dc` completed with status 4 at
02:37:49 UTC. Its source is `e057289`; startup logged pinned Node 24.19.0 and
`listening`, `firebaseRead:true`, `aiConfigured:false` at 02:38:53 UTC. The
ordinary synthetic CRUD/isolation checks passed again on this deployment.

v51 installed successfully using `adb install -r`; package manager read back
versionCode 51 and the app was opened. The device disconnected before a separate
installed-base-APK hash readback, so that additional check is not claimed. LI
reported **“活动不可用”** in the requested mobile-data check. Other phone flows
and personal-host-off acceptance have not been confirmed.

A subsequent live list returned 18 items after **42,777 ms**, with Ticketmaster
available and onePA unavailable. The ordinary mobile timeout is 15 seconds.
An initial detail probe failed; a subsequent read-only probe returned 200, which
does not establish full rendered detail availability. Safe logs recorded
`EVENT_READER_HOME_LINKS_TIMEOUT`. Cloud Chromium launched, but onePA navigation
timed out; an isolated temporary-local-browser-cache probe saw the public page
return 200 and the correct title, but did not complete the catalogue. Thus there
is no evidence here of a policy block to bypass, nor proof that onePA works.

An **undeployed** repair now gives only the Azure composition a ten-second
per-source list deadline. It aborts timed-out providers without waiting for their
browser cleanup, preserves healthy data and explicit failed-source status, and
rejects total failure and caller cancellation. Existing local composition and
mobile deadlines are unchanged. The final focused regression run passed **18/18**
(source deadlines, dual-source behavior and Azure entry). A broader 1,706/1,706
Backend run passed immediately before narrowing the deadline to Azure only; do
not attribute that broad run to the final narrowed patch.

LI then requested a handoff and assessment of an existing overseas server.
Deployment work stopped at that handoff: this repair is **not** in the running
Azure ZIP, no new APK was made, and no server migration was executed. The final
two synthetic Auth identities and their owned records were cleaned up. A fresh
handoff-time public HTTPS profile check still returned 401. See the
[migration handoff](../handoff/2026-10-29-azure-and-self-hosted-server-handoff.md).

## Failed attempts retained

The initial F1 startup hit quota exhaustion; it was not an accepted service. A dereferenced pnpm symlink ZIP then failed on missing `jsbi` before Firebase use; a hoisted production install fixed the packaged import. A 252 MB ZIP including Chromium hit an upload gateway timeout, with no new Kudu deployment found. Downloading the pinned browser on Azure reduced the upload to about 68 MB. An early startup-script mismatch failed before the corrected bundle was deployed. The initial smoke harness used POST instead of the contracted PUT onboarding route, received 404 and cleaned up its synthetic identity; no product route was changed to accommodate it.

## Operator recovery

Use the existing authorized Azure CLI profile. Read deployment status and safe runtime logs before retrying an uncertain upload. Deploy the reviewed ZIP with Entra-authenticated Kudu OneDeploy; keep basic publishing credentials disabled. Do not upload the private operator folder or personal ADC. A previous accepted ZIP is retained locally for deliberate rollback.

For readiness, check the startup `listening` phase and an unauthenticated profile request returning 401, then verify an owned synthetic account if functional proof is needed. Do not turn errors into empty success or replay unknown writes. `/v1/me/profile` requires authentication; the API root is not a public website. Preserve the spending limit and the one-instance plan. Stopping only the web app does not remove App Service plan charges.

References: [Azure Linux pricing](https://azure.microsoft.com/en-us/pricing/details/app-service/linux/), [ZIP deployment](https://learn.microsoft.com/en-us/azure/app-service/deploy-zip), [managed identity](https://learn.microsoft.com/en-us/azure/app-service/overview-managed-identity), [Google federation](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-other-clouds), [Firestore database-scoped IAM](https://docs.cloud.google.com/firestore/native/docs/manage-databases#configure_per-database_access_permissions).
