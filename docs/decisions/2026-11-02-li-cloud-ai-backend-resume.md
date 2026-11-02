# LI — resume Backend reliability and bounded OpenAI trial

Date: 2026-11-02 (Asia/Singapore). Authority: LI / PM.

LI explicitly approved implementation of the ENMORI AI and Backend recovery plan in this chat. This decision supersedes the cloud experiment/integration pause in [29 October Backend-first decision](2026-10-29-li-backend-first-cloud-ai-paused.md) only for the OpenAI trial below. It extends [Azure deployment authority](2026-10-29-li-azure-backend-deployment.md); it does not revive unused Groq grants or paid Gemini evaluation. Preserve prior failures, grants and provenance.

## Scope and budget

- Start from `8e82246b93aca9442703254724d462f89b1cac99` in an isolated branch; integrate v53 UI selectively and preserve unrelated work.
- Verify and deploy the existing Azure-only ten-second per-source activity deadline repair. Preserve partial failure, cancellation and exclusion of late results.
- Phone targets: ordinary reads p95 <= 3 seconds, activity lists <= 12 seconds, complete AI replies p95 <= 15 seconds. Measure at least 30 requests per category with identical source, synthetic identities and request sets, recording failures and timeouts as well as p50/p95.
- If still necessary, compare eligible Linux B1 instances in Southeast Asia, Australia East, then Australia Southeast. Incremental regional comparison spend is at most US$5 from existing student credit. Preserve the spending cap, no payment card, no automatic paid conversion. Keep one stable service; bounded candidates must be removed when rejected or budget expires. Retain rollback until replacement acceptance.
- Preserve the existing Firebase project/data and use scoped managed identity/WIF and platform HTTPS for replacement hosts. No business-data migration or private ADC deployment.
- OpenAI trial total is min(5% of the current cycle's original gifted API credit, currently spendable remaining credit), fixed at verification. Includes evaluation, failures, retries and test-app calls. No top-up, automatic rollover or real calls before balance, expiry, price and model access are verified. User completes login/MFA.

## OpenAI integration

- Add a distinct OpenAI Responses API adapter behind the existing cloud Port, using existing HTTP facilities without new SDK dependencies. First candidate `gpt-6-luna`, low reasoning, nonstreaming structured output, `store:false`; if quality fails and budget permits, compare `gpt-6.1-sol` against the same 24-case corpus. Preserve original prompts, rubric and failed results. No unbounded prompt sweep or provider fallback.
- Candidate adoption requires original failures corrected without regression and independent review before test-app enablement. Failed candidates remain unadopted.
- Add OpenAI-specific provider/disclosure/provenance, update normative API, Settings and Flutter decoding; Groq consent never authorizes OpenAI. Require explicit new acceptance and preserve local receipts and existing source/withdrawal rules. Backend region does not establish model processing region.
- Share durable monetary budget and exclusive runtime ownership across Conversation, Persona and proactive processing. Complete old-grant compatibility and withdrawal checks before enabling each consumer; prevent duplicate generation/delivery across hosts.
- Reserve worst-case cost before dispatch, reconcile confirmed usage, retain unknown reservations, and never blindly replay dispatched work. Missing/unknown budget, pricing or balance closes AI admission only. Expiry or exhaustion closes cloud generation without breaking ordinary features.

## Verification and delivery

Use isolated synthetic data for automated verification. Cover deadline/partial-source behavior, identity isolation, restart recovery, output validation, 429/timeouts/unknown outcomes, budget exhaustion, consent withdrawal, legacy clients and duplicate workers. Retain existing context minimization, no-content logging and no-secret rules.

Deliver same-signature data-preserving Android update; verify ordinary features and AI over Wi-Fi and mobile data, then independent operation with the personal host off. Report source, cloud, emulator and phone evidence separately; no implicit UAT/Release/main-merge claim.

Browser work may use gpt-6.1-terra/max; bounded implementation and independent review may use gpt-6.1-sol/max. Live model evaluation and test deployment remain gated by verified credit and quality; source work and offline tests can proceed independently.
