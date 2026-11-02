# AI and Backend recovery — 2 November 2026

Authority: [LI approved execution](../../decisions/2026-11-02-li-cloud-ai-backend-resume.md).

## Deployed ordinary Backend

The existing Japan East single B1 service accepted OneDeploy `523e7212-0ac5-4f5f-98d0-af763ed0829e`, status 4/complete/active. The active run-from-ZIP package manifest was read back and matched ([readback](deployed-package-readback.json)). The submitted immutable ordinary package was built from `477417fe7c6b3696a1b766f6e8dd80c01929db70` (inherited `8e82246b` repair plus decision record), separately from subsequent AI source changes. ZIP SHA-256 and size are in [ordinary-package.json](ordinary-package.json); deployment status is in [deploy-status.json](deploy-status.json). It retains no-model/no-worker composition and enables the previously undeployed ten-second independent-source list deadline. Existing Firebase data, app address, managed identity and spending protection remain.

Pinned Node 24.19.0 strict compilation passed; this deployed source passed **1706/1706** Backend tests and **18/18** focused source/Azure entry tests. Two newly owned synthetic identities verified onboarding, profile/settings, private Check-in, stale revision, owner isolation, restart readback and disabled-identity rejection. [Create checks](smoke-create.json), [restart checks](smoke-readback.json), [cleanup](smoke-cleanup.json). Both synthetic accounts and their test records were removed after measurement. No real-user writes were tested.

## Measurements and outstanding activity failure

These are **operator-computer-to-cloud measurements, not phone acceptance**. Thirty sequential complete-response reads were measured for each category. Timeouts remain failures and are included in elapsed-time percentiles; success-only percentiles were not substituted.

| Category | p50 | p95 | Failures / 30 | Target result |
|---|---:|---:|---:|---|
| Profile | 714 ms | 1409 ms | 0 | <=3 s met from this vantage |
| Settings | 693 ms | 867 ms | 0 | <=3 s met from this vantage |
| Friends | 1241 ms | 2600 ms | 0 | <=3 s met from this vantage |
| Events | 11377 ms | 15001 ms | 2 timeouts | <=12 s **not met** |

[Full samples](japaneast-latency.json). All 28 successful Event reads explicitly reported Ticketmaster available and onePA unavailable. Thus the partial-result repair is deployed, but list reliability, onePA coverage and the activity response target are not accepted. The first restart profile read took 6394 ms, separately retained in restart evidence; warm samples do not prove cold-start performance.

Thirty direct dependency observations from the operator computer found Firebase Auth revocation verification p95 1169 ms and owned-account Firestore read p95 51 ms, no failures. [Samples](dependency-latency.json). These do not isolate Azure-to-Firebase or individual on-host provider durations and do not establish the exact remaining activity root cause.

The actual subscription policy currently disallows **Southeast Asia, Australia East and Australia Southeast**. Allowed locations are recorded in [regional-policy.json](regional-policy.json). Indonesia Central is a possible nearer candidate but differs from the approved three-region comparison sequence; the user was asked to select it. No candidate resource was created, and regional trial spend is US$0. The original B1 continues consuming its normal student credit.

## OpenAI implementation, not live adoption

Source includes a separate Responses adapter (Luna/Sol, low reasoning, standard tier, strict structured output, nonstreaming, `store:false`), exact provider/disclosure consent binding, historical provenance, Flutter decoding/disclosure, a shared integer-nanodollar budget and explicit Conversation composition. Budget reserves worst-case cost, includes cache-write pricing, counts reasoning within output, persists original attempts, retains unknown reservations across restart and rejects replay/expired grants. [Exact budget schema](../../../api/openai-budget-contract.md).

The synthetic evaluator preserves the original 24 production-captured prompts and rubric. It requires a single-use run claim, a recovered shared monetary owner and verified exact-request token bounds. Mock mode is explicit and cannot pass the live quality acceptance gate. No model response was fabricated as a live result. Independent review found and corrected the initial missing mock/live acceptance distinction.

Source validation: unified pinned-runtime Backend build and **1768/1768** tests passed; Responses transport **24/24**, Conversation composition **11/11**, monetary budget **18/18**, evaluator **6/6**. The isolated Firebase runner passed **8/8** tests, including five new monetary transaction/restart/concurrency cases. Its first concurrent test incorrectly demanded a successful acknowledgment despite no automatic transaction retries; the corrected test proves at most one durable claim and closed unknown owners, while preserving unknown outcomes. Normal CI and Emulator checks made no real OpenAI call.

Final affected Flutter verification ran 13 test files: **178/178 passed**, and whole-`lib` analysis reported no issues. Operator tools passed **11/11** tests. Explicit test-only `AiClientProcessing.openaiCloud` binds the request mode and displayed provider together; local remains the shipped default.

v53 Profile, recovery, registration, large-text and Event UI changes were integrated from `81e25641`. Scoped Flutter consent/decoding tests passed 38/38, AI-page tests 73/73, and the v53 six-file suite 47/47. The inherited Event harness emitted an invalid paused-to-resumed transition and searched unbuilt lazy children; test helpers now use the real lifecycle chain and bounded scrolling without changing Event product behavior or dropping assertions.

Android candidate **v54** was built from implementation commit `27cc47e9702f03a881cf586c57c2d38926804a21`. [APK metadata](apk-v54.json) records the checksum, package/version and signer. Signature matches v53, permissions are unchanged, and debuggable is false. The candidate retains the Azure endpoint and ordinary companion entries; **cloud GPT is not enabled**. Artifact: `build/cloud-ai-backend-resume-v54/ENMORI-recovery-v54-release.apk`. The first `--no-pub` release build failed because a generated registrant included the development-only integration_test plugin. A normal serialized Flutter release build regenerated plugin metadata and succeeded with unchanged dependency locks and source. No hand-edited generated Java or dependency upgrade was used. Installation/data retention are not inferred from matching package/signature.

## Remaining enablement gates

- OpenAI billing login/current-cycle original gift, remaining balance and expiry have not been verified. No real grant has been installed, no API key created, and **zero real GPT calls** were made. The 5% cap is an implemented rule, not a verified dollar allowance.
- Verify exact Responses token framing, model access, standard-tier prices and provider rate limits; install the bounded shared grant with an exclusive owner. Real monetary/consent migrations were not run.
- Run the fixed live evaluation and independent semantic review before test-app adoption. A mock or JSON protocol pass does not prove model quality or <=15 s phone response time.
- The explicit Conversation factory still requires the verified OpenAI rate authority; Persona/F0 grant compatibility and each consumer's withdrawal checks must precede live enablement. Groq/local grants never automatically authorize OpenAI, and old appointments are not silently activated.
- The deployed service remains ordinary Backend only. New AI source/consent fields were not included in the ordinary deployment. Default shipped client processing remains local; the test composition must explicitly choose matching OpenAI processing and disclosure after the gates above.
- No Android device was attached. Same-signature upgrade, Wi-Fi/mobile-data, personal-host-off, second-device, iOS and UAT/Release acceptance remain unproven.

## Recovery and continuation

Ordinary rollback archive remains `/home/miku/.local/state/enmori-azure-backend-20261029/backend-small.zip` (previous accepted v50 source). Inspect current OneDeploy status before any retry; uploads can be accepted after a local wait. The new package and operational logs are retained privately under `/home/miku/.local/state/enmori-cloud-resume-20261102/`. Never deploy that private folder or its synthetic identity state.

Continue with OpenAI credit verification and the pending regional choice. Preserve the fixed grant cap across evaluation and later test use; closing or renewing a process cannot replenish it. Budget exhaustion/expiry closes AI admission only, while ordinary APIs remain available. No main merge or release is claimed.
